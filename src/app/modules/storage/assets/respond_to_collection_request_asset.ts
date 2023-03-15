import { ApplyAssetContext, BaseAsset, transactions, ValidateAssetContext } from 'lisk-sdk';

import { createDateTime, updateMeta } from '../../../utils/helpers';
import { getStorageModuleData, setStorageModuleData } from '../../../utils/store';
import { accountHasMap, buffersAreEqual, isValidId, isValidTimestamp } from '../../../utils/validation';
import { respondToCollectionRequestAssetPropsSchema } from '../transaction_schemas';
import {
	CollectionRequestType,
	HistoryItem,
	HistoryItemType,
	RespondToCollectionRequestAssetProps,
	StorageModuleAccountProps,
} from '../types';

export class RespondToCollectionRequestAsset extends BaseAsset {
	public name = 'respondToCollectionRequest';
	public id = 11;
	public schema = respondToCollectionRequestAssetPropsSchema;

	public validate({ asset }: ValidateAssetContext<RespondToCollectionRequestAssetProps>): void {
		if (!isValidId(asset.collectionId)) {
			throw new Error('Invalid collection id');
		}

		if (!isValidId(asset.requestId)) {
			throw new Error('Invalid request id');
		}

		if (!isValidTimestamp(asset.timestamp)) {
			throw new Error('Invalid timestamp');
		}

		// TODO: validate new hashes
	}

	public async apply({
		asset,
		transaction,
		stateStore,
		reducerHandler,
	}: ApplyAssetContext<RespondToCollectionRequestAssetProps>): Promise<void> {
		const stateStoreData = await getStorageModuleData(stateStore);
		const sender = await stateStore.account.getOrDefault<StorageModuleAccountProps>(transaction.senderAddress);
		if (!accountHasMap(sender)) {
			throw Error('Sender account is not initialized');
		}

		const collection = stateStoreData.collections.find(c => c.id === asset.collectionId);
		if (!collection) {
			throw new Error(`Collection with id ${asset.collectionId} does not exist`);
		}

		const request = collection.requests.find(r => r.requestId === asset.requestId);
		if (!request) {
			throw new Error(`Request with id ${asset.requestId} does not exist`);
		}

		const requester = await stateStore.account.getOrDefault<StorageModuleAccountProps>(request.sender);

		if (request.type === CollectionRequestType.Ownership && !buffersAreEqual(collection.owner, sender.address)) {
			throw new Error(`Sender is not owner of collection`);
		}

		if (asset.accept) {
			const transferFee = BigInt(transactions.convertLSKToBeddows(String(collection.transferFee)));

			// Ownership is requested by new owner ('requester') and response is sent by the original owner ('sender')
			if (request.type === CollectionRequestType.Ownership) {
				const requesterBalance: bigint = await reducerHandler.invoke('token:getBalance', {
					address: requester.address,
				});

				if (requesterBalance - transferFee < BigInt('5000000')) {
					throw new Error(`Requester does not have enough balance`);
				}

				// Credit original owner
				await reducerHandler.invoke('token:credit', {
					address: sender.address,
					amount: transferFee,
				});

				// Debit new owner
				await reducerHandler.invoke('token:debit', {
					address: requester.address,
					amount: transferFee,
				});

				const historyItem: HistoryItem = {
					id: transaction.id.toString('hex'),
					createdAt: createDateTime(asset.timestamp),
					activity: HistoryItemType.TransferredViaCollection,
					userAddress: requester.address,
				};

				/** Update files in collection */
				for (const fileId of collection.fileIds) {
					const file = stateStoreData.files.find(f => f.data.id === fileId);
					if (!file) {
						throw new Error(`File with id ${fileId} does not exist`);
					}

					const updatedData = asset.updatedFileData.find(data => data.fileId === fileId);

					if (!updatedData) {
						throw new Error(`No updated hash supplied for file with id ${fileId}`);
					}

					file.meta = updateMeta(file.meta, asset.timestamp);
					file.data.owner = requester.address;
					file.data.hash = updatedData.newHash;
					file.data.history.push(historyItem);
					stateStoreData.transfers += 1;
				}

				collection.owner = requester.address;

				requester.storage.filesOwned = [...requester.storage.filesOwned, ...collection.fileIds];
				requester.storage.collectionsOwned.push(asset.collectionId);

				sender.storage.collectionsOwned = sender.storage.collectionsOwned.filter(c => c !== asset.collectionId);
				sender.storage.filesOwned = sender.storage.filesOwned.filter(f => !collection.fileIds.includes(f));
			}

			// Transfer is requested by original owner ('requester') and response is sent by the new owner ('sender')
			if (request.type === CollectionRequestType.Transfer) {
				const senderBalance: bigint = await reducerHandler.invoke('token:getBalance', {
					address: sender.address,
				});

				if (senderBalance - transferFee < BigInt('5000000')) {
					throw new Error(`You do not have enough balance`);
				}

				// Debit original owner with tokens defined in the request
				await reducerHandler.invoke('token:debit', {
					address: sender.address,
					amount: transferFee,
				});

				// Credit original owner with tokens defined in the request
				await reducerHandler.invoke('token:credit', {
					address: requester.address,
					amount: transferFee,
				});

				const historyItem: HistoryItem = {
					id: transaction.id.toString('hex'),
					createdAt: createDateTime(asset.timestamp),
					activity: HistoryItemType.TransferredViaCollection,
					userAddress: sender.address,
				};

				/** Update files in collection */
				for (const fileId of collection.fileIds) {
					const file = stateStoreData.files.find(f => f.data.id === fileId);
					if (!file) {
						throw new Error(`File with id ${fileId} does not exist`);
					}

					const updatedData = asset.updatedFileData.find(data => data.fileId === fileId);

					if (!updatedData) {
						throw new Error(`No updated hash supplied for file with id ${fileId}`);
					}

					file.meta = updateMeta(file.meta, asset.timestamp);
					file.data.owner = sender.address;
					file.data.hash = updatedData.newHash;
					file.data.history.push(historyItem);
					stateStoreData.transfers += 1;
				}

				collection.owner = sender.address;

				sender.storage.filesOwned = [...sender.storage.filesOwned, ...collection.fileIds];
				sender.storage.collectionsOwned.push(asset.collectionId);

				requester.storage.collectionsOwned = requester.storage.collectionsOwned.filter(c => c !== asset.collectionId);
				requester.storage.filesOwned = requester.storage.filesOwned.filter(f => !collection.fileIds.includes(f));
			}
		}

		collection.requests = collection.requests.filter(req => req.requestId !== asset.requestId);

		requester.storage.outgoingCollectionRequests = requester.storage.outgoingCollectionRequests.filter(
			req => req.requestId !== asset.requestId,
		);
		sender.storage.incomingCollectionRequests = sender.storage.incomingCollectionRequests.filter(
			req => req.requestId !== asset.requestId,
		);

		await stateStore.account.set(sender.address, sender);
		await stateStore.account.set(requester.address, requester);
		await setStorageModuleData(stateStore, stateStoreData);
	}
}
