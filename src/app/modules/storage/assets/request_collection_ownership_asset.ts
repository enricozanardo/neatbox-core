import { ApplyAssetContext, BaseAsset, transactions, ValidateAssetContext } from 'lisk-sdk';

import { getStorageModuleData, setStorageModuleData } from '../../../utils/store';
import { accountHasMap, buffersAreEqual, isValidId, isValidTimestamp } from '../../../utils/validation';
import { requestCollectionOwnershipAssetPropsSchema } from '../transaction_schemas';
import {
	CollectionRequest,
	CollectionRequestType,
	RequestCollectionOwnershipAssetProps,
	StorageModuleAccountProps,
} from '../types';

export class RequestCollectionOwnershipAsset extends BaseAsset {
	public name = 'requestCollectionOwnership';
	public id = 14;
	public schema = requestCollectionOwnershipAssetPropsSchema;

	public validate({ asset }: ValidateAssetContext<RequestCollectionOwnershipAssetProps>): void {
		if (!isValidId(asset.id)) {
			throw new Error('Invalid id');
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
	}: ApplyAssetContext<RequestCollectionOwnershipAssetProps>): Promise<void> {
		const transactionId = transaction.id.toString('hex');
		const stateStoreData = await getStorageModuleData(stateStore);
		const collection = stateStoreData.collections.find(c => c.id === asset.id);

		if (!collection) {
			throw new Error(`Collection with id ${asset.id} does not exist`);
		}

		const sender = await stateStore.account.getOrDefault<StorageModuleAccountProps>(transaction.senderAddress);

		if (!accountHasMap(sender)) {
			throw Error('Sender account is not initialized');
		}

		const owner = await stateStore.account.getOrDefault<StorageModuleAccountProps>(collection.owner);

		if (!accountHasMap(owner)) {
			throw Error('Owner account is not initialized');
		}

		if (buffersAreEqual(owner.address, sender.address)) {
			throw new Error(`Sender is already owner of collection`);
		}

		if (sender.storage.outgoingCollectionRequests.map(r => r.collectionId).includes(asset.id)) {
			throw new Error(`Sender has already made a request for this collection`);
		}

		const senderBalance: bigint = await reducerHandler.invoke('token:getBalance', {
			address: sender.address,
		});
		const transferFee = BigInt(transactions.convertLSKToBeddows(String(collection.transferFee)));

		if (senderBalance - transferFee < BigInt('5000000')) {
			throw new Error(`Fee exceeds available balance`);
		}

		const accountRequest = {
			collectionId: asset.id,
			requestId: transactionId,
		};

		const request: CollectionRequest = {
			...accountRequest,
			type: CollectionRequestType.Ownership,
			sender: sender.address,
			recipient: collection.owner,
		};

		collection.requests.push(request);
		sender.storage.outgoingCollectionRequests.push(accountRequest);
		owner.storage.incomingCollectionRequests.push(accountRequest);

		await setStorageModuleData(stateStore, stateStoreData);
		await stateStore.account.set(sender.address, sender);
		await stateStore.account.set(owner.address, owner);
	}
}
