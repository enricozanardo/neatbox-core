import { ApplyAssetContext, BaseAsset, ValidateAssetContext } from 'lisk-sdk';

import { updateMeta } from '../../../utils/helpers';
import { getStorageModuleData, setStorageModuleData } from '../../../utils/store';
import { accountHasMap, buffersAreEqual, isValidId, isValidTimestamp } from '../../../utils/validation';
import { updateFileAssetPropsSchema } from '../transaction_schemas';
import { StorageModuleAccountProps, UpdateFileAssetProps } from '../types';

export class UpdateFileAsset extends BaseAsset {
	public name = 'updateFile';
	public id = 6;
	public schema = updateFileAssetPropsSchema;

	public validate({ asset }: ValidateAssetContext<UpdateFileAssetProps>): void {
		if (!isValidId(asset.fileId)) {
			throw new Error('Invalid file id');
		}

		if (!isValidTimestamp(asset.timestamp)) {
			throw new Error('Invalid timestamp');
		}
	}

	public async apply({ asset, transaction, stateStore }: ApplyAssetContext<UpdateFileAssetProps>): Promise<void> {
		const stateStoreData = await getStorageModuleData(stateStore);
		const sender = await stateStore.account.getOrDefault<StorageModuleAccountProps>(transaction.senderAddress);

		if (!accountHasMap(sender)) {
			throw Error('Sender account is not initialized');
		}

		const file = stateStoreData.files.find(f => f.data.id === asset.fileId);
		if (!file) {
			throw new Error(`File with id ${asset.fileId} does not exist`);
		}

		if (!buffersAreEqual(file.data.owner, sender.address)) {
			throw new Error(`Sender is not owner of file`);
		}

		if (file.data.requests.length > 0) {
			throw new Error(`Can not update file while there are pending requests`);
		}

		if (
			file.data.accessPermissionFee === asset.accessPermissionFee &&
			file.data.transferFee === asset.transferFee &&
			file.data.private === asset.private &&
			buffersAreEqual(file.data.customFields, asset.customFields)
		) {
			throw new Error(`No changes detected`);
		}

		file.data.transferFee = asset.transferFee;
		file.data.accessPermissionFee = asset.accessPermissionFee;
		file.data.private = asset.private;
		file.data.customFields = asset.customFields;
		file.meta = updateMeta(file.meta, asset.timestamp);

		await setStorageModuleData(stateStore, stateStoreData);
	}
}
