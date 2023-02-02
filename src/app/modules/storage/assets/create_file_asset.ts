import { ApplyAssetContext, BaseAsset, ValidateAssetContext } from 'lisk-sdk';

import { createDateTime, createMeta } from '../../../utils/helpers';
import { getStorageModuleData, setStorageModuleData } from '../../../utils/store';
import { accountHasMap, isValidChecksum, isValidHash, isValidTimestamp } from '../../../utils/validation';
import { TX_FEES } from '../constants';
import { createFileAssetPropsSchema } from '../transaction_schemas';
import { CreateFileAssetProps, File, HistoryItem, HistoryItemType, StorageModuleAccountProps } from '../types';

export class CreateFileAsset extends BaseAsset {
	public name = 'createFile';
	public id = 1;
	public fee = TX_FEES.create;
	public schema = createFileAssetPropsSchema;

	public validate({ asset, transaction }: ValidateAssetContext<CreateFileAssetProps>): void {
		if (!isValidChecksum(asset.checksum)) {
			throw new Error('Invalid checksum');
		}

		if (!isValidHash(asset.hash)) {
			throw new Error('Invalid hash');
		}

		if (transaction.fee < this.fee) {
			throw new Error(`Fee of ${transaction.fee} is too low (required: ${this.fee})`);
		}

		if (!isValidTimestamp(asset.timestamp)) {
			throw new Error('Invalid timestamp');
		}
	}

	public async apply({ asset, transaction, stateStore }: ApplyAssetContext<CreateFileAssetProps>): Promise<void> {
		const stateStoreData = await getStorageModuleData(stateStore);

		const fileExists = !!stateStoreData.files.find(
			f => f.data.checksum === asset.checksum || f.data.hash === asset.hash,
		);

		if (fileExists) {
			throw new Error('File already exist');
		}

		const sender = await stateStore.account.getOrDefault<StorageModuleAccountProps>(transaction.senderAddress);

		if (!accountHasMap(sender)) {
			throw Error('Sender account is not initialized');
		}

		const historyItem: HistoryItem = {
			id: transaction.id.toString('hex'),
			createdAt: createDateTime(asset.timestamp),
			activity: HistoryItemType.Registration,
			userAddress: sender.address,
		};

		const file: File = {
			meta: createMeta(asset.timestamp),
			data: {
				...asset,
				id: transaction.id.toString('hex'),
				owner: transaction.senderAddress,
				requests: [],
				history: [historyItem],
			},
		};

		sender.storage.filesOwned.push(file.data.id);
		stateStoreData.files.push(file);

		await stateStore.account.set(sender.address, sender);
		await setStorageModuleData(stateStore, stateStoreData);
	}
}
