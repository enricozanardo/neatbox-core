import { ApplyAssetContext, BaseAsset, cryptography, ValidateAssetContext } from 'lisk-sdk';

import { createDateTime, updateMeta } from '../../../utils/helpers';
import { getStorageModuleData, setStorageModuleData } from '../../../utils/store';
import { accountHasMap, arrayHasDuplicates, buffersAreEqual, isValidTimestamp } from '../../../utils/validation';
import { MAX_FILES_IN_COLLECTION } from '../constants';
import { updateCollectionAssetPropsSchema } from '../transaction_schemas';
import { HistoryItem, HistoryItemType, StorageModuleAccountProps, UpdateCollectionAssetProps } from '../types';

export class UpdateCollectionAsset extends BaseAsset {
	public name = 'updateCollection';
	public id = 9;
	public schema = updateCollectionAssetPropsSchema;

	public validate({ asset }: ValidateAssetContext<UpdateCollectionAssetProps>): void {
		if (asset.fileIds.length > MAX_FILES_IN_COLLECTION) {
			throw new Error(`Num of files exceed maximum amount of ${MAX_FILES_IN_COLLECTION}`);
		}

		if (arrayHasDuplicates(asset.fileIds)) {
			throw new Error(`'fileIds' array contains duplicates`);
		}

		if (!isValidTimestamp(asset.timestamp)) {
			throw new Error('Invalid timestamp');
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async apply({ asset, transaction, stateStore }: ApplyAssetContext<UpdateCollectionAssetProps>): Promise<void> {
		const stateStoreData = await getStorageModuleData(stateStore);
		const sender = await stateStore.account.getOrDefault<StorageModuleAccountProps>(transaction.senderAddress);

		if (!accountHasMap(sender)) {
			throw Error('Sender account is not initialized');
		}

		const collection = stateStoreData.collections.find(f => f.id === asset.collectionId);
		if (!collection) {
			throw new Error(`Collection with id ${asset.collectionId} does not exist`);
		}

		if (!buffersAreEqual(collection.owner, sender.address)) {
			throw new Error(`Sender is not owner of file`);
		}

		const { fileIds, transferFee } = asset;

		if (fileIds.length > MAX_FILES_IN_COLLECTION) {
			throw new Error(`Number of files in collection exceed maximum amount of ${MAX_FILES_IN_COLLECTION}`);
		}

		const accountsToUpdate: Buffer[] = [];

		/** Add collection id to files */
		fileIds
			.filter(fileId => !collection.fileIds.includes(fileId)) // filter out files already in collection
			.forEach(assetId => {
				const file = stateStoreData.files.find(f => f.data.id === assetId);
				if (!file) {
					throw new Error(`File with id ${assetId} does not exist`);
				}

				const historyItem: HistoryItem = {
					id: transaction.id.toString('hex'),
					createdAt: createDateTime(asset.timestamp),
					activity: HistoryItemType.AddedToCollection,
					userAddress: sender.address,
				};

				file.data.history.push(historyItem);
				file.meta.collection.id = collection.id;
				file.meta.collection.title = collection.title;
				file.meta = updateMeta(file.meta, asset.timestamp);

				const allowedAccounts = file.data.history
					.filter(
						h => h.activity === HistoryItemType.AccessPermission && !buffersAreEqual(h.userAddress, sender.address),
					)
					.map(h => h.userAddress);

				accountsToUpdate.push(...allowedAccounts);
			});

		/** Remove collectionId from files not part of collection any more  */
		collection.fileIds
			.filter(id => !fileIds.includes(id))
			.forEach(id => {
				const file = stateStoreData.files.find(f => f.data.id === id);
				if (!file) {
					throw new Error(`File with id ${id} does not exist`);
				}

				const historyItem: HistoryItem = {
					id: transaction.id.toString('hex'),
					createdAt: createDateTime(asset.timestamp),
					activity: HistoryItemType.RemovedFromCollection,
					userAddress: sender.address,
				};

				file.data.history.push(historyItem);
				file.meta.collection.id = '';
				file.meta.collection.title = '';
				file.meta = updateMeta(file.meta, asset.timestamp);
			});

		/** Remove permissions from accounts */
		const processedAccounts: string[] = [];

		for (const address of accountsToUpdate) {
			const base32 = cryptography.getBase32AddressFromAddress(address);

			/** ignore already processed accounts */
			if (processedAccounts.includes(base32)) {
				return;
			}

			processedAccounts.push(base32);

			const allowedAccount = await stateStore.account.getOrDefault<StorageModuleAccountProps>(address);
			allowedAccount.storage.filesAllowed = allowedAccount.storage.filesAllowed.filter(f => !fileIds.includes(f));

			await stateStore.account.set(allowedAccount.address, allowedAccount);
		}

		collection.transferFee = transferFee;
		collection.fileIds = fileIds;

		await setStorageModuleData(stateStore, stateStoreData);
	}
}
