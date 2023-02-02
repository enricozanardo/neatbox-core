import { ApplyAssetContext, BaseAsset, transactions, ValidateAssetContext } from 'lisk-sdk';

import { getStorageModuleData, setStorageModuleData } from '../../../utils/store';
import { accountHasMap, buffersAreEqual, isValidId, isValidTimestamp } from '../../../utils/validation';
import { requestCollectionTransferAssetPropsSchema } from '../transaction_schemas';
import { CollectionRequest, RequestCollectionTransferAssetProps, StorageModuleAccountProps } from '../types';

export class RequestCollectionTransferAsset extends BaseAsset {
	public name = 'requestCollectionTransfer';
	public id = 10;
	public schema = requestCollectionTransferAssetPropsSchema;

	public validate({ asset }: ValidateAssetContext<RequestCollectionTransferAssetProps>): void {
		if (!isValidId(asset.collectionId)) {
			throw new Error('Invalid collection id');
		}

		if (!isValidTimestamp(asset.timestamp)) {
			throw new Error('Invalid timestamp');
		}
	}

	public async apply({
		asset,
		transaction,
		stateStore,
		reducerHandler,
	}: ApplyAssetContext<RequestCollectionTransferAssetProps>): Promise<void> {
		const transactionId = transaction.id.toString('hex');
		const stateStoreData = await getStorageModuleData(stateStore);
		const sender = await stateStore.account.getOrDefault<StorageModuleAccountProps>(transaction.senderAddress);

		if (!accountHasMap(sender)) {
			throw Error('Sender account is not initialized');
		}

		const collection = stateStoreData.collections.find(c => c.id === asset.collectionId);
		if (!collection) {
			throw new Error(`Collection with id ${asset.collectionId} does not exist`);
		}

		if (collection.fileIds.length === 0) {
			throw new Error('Collection is empty');
		}

		if (!buffersAreEqual(collection.owner, sender.address)) {
			throw new Error(`Sender is not owner of collection`);
		}

		const recipient = await stateStore.account.get<StorageModuleAccountProps>(asset.recipientAddress);

		if (!accountHasMap(recipient)) {
			throw Error('Recipient account is not initialized');
		}

		const recipientBalance: bigint = await reducerHandler.invoke('token:getBalance', {
			address: recipient.address,
		});
		const transferFee = BigInt(transactions.convertLSKToBeddows(String(collection.transferFee)));

		if (recipientBalance - transferFee < BigInt('5000000')) {
			throw new Error(`Fee exceeds available balance`);
		}

		const accountRequest = {
			collectionId: collection.id,
			requestId: transactionId,
		};

		const request: CollectionRequest = {
			...accountRequest,
			sender: sender.address,
			recipient: recipient.address,
		};

		collection.requests.push(request);
		sender.storage.outgoingCollectionRequests.push(accountRequest);
		recipient.storage.incomingCollectionRequests.push(accountRequest);

		await stateStore.account.set(sender.address, sender);
		await stateStore.account.set(recipient.address, recipient);
		await setStorageModuleData(stateStore, stateStoreData);
	}
}
