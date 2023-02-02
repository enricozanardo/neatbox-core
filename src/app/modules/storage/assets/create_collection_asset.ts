import { ApplyAssetContext, BaseAsset, ValidateAssetContext } from 'lisk-sdk';

import { getStorageModuleData, setStorageModuleData } from '../../../utils/store';
import { accountHasMap, isValidTimestamp } from '../../../utils/validation';
import { TX_FEES } from '../constants';
import { createCollectionAssetPropsSchema } from '../transaction_schemas';
import { Collection, CreateCollectionAssetProps, StorageModuleAccountProps } from '../types';

export class CreateCollectionAsset extends BaseAsset {
	public name = 'createCollection';
	public id = 8;
	public fee = TX_FEES.createCollection;
	public schema = createCollectionAssetPropsSchema;

	public validate({ transaction, asset }: ValidateAssetContext<CreateCollectionAssetProps>): void {
		if (transaction.fee < this.fee) {
			throw new Error(`Fee of ${transaction.fee} is too low (required: ${this.fee})`);
		}

		if (!isValidTimestamp(asset.timestamp)) {
			throw new Error('Invalid timestamp');
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async apply({ asset, transaction, stateStore }: ApplyAssetContext<CreateCollectionAssetProps>): Promise<void> {
		const stateStoreData = await getStorageModuleData(stateStore);
		const sender = await stateStore.account.getOrDefault<StorageModuleAccountProps>(transaction.senderAddress);

		if (!accountHasMap(sender)) {
			throw Error('Sender account is not initialized');
		}

		const collectionExists = !!stateStoreData.collections.find(c => c.title === asset.title);

		if (collectionExists) {
			throw new Error('Collection already exist');
		}

		const id = transaction.id.toString('hex');
		const { title, transferFee } = asset;

		const collection: Collection = {
			id,
			title,
			transferFee,
			fileIds: [],
			requests: [],
			owner: transaction.senderAddress,
		};

		sender.storage.collectionsOwned.push(id);
		stateStoreData.collections.push(collection);

		await setStorageModuleData(stateStore, stateStoreData);
		await stateStore.account.set(sender.address, sender);
	}
}
