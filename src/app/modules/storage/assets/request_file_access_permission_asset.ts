import { ApplyAssetContext, BaseAsset, transactions, ValidateAssetContext } from 'lisk-sdk';

import { getStorageModuleData, setStorageModuleData } from '../../../utils/store';
import { accountHasMap, buffersAreEqual, isValidId, isValidTimestamp } from '../../../utils/validation';
import { requestFileAccessPermissionAssetPropsSchema } from '../transaction_schemas';
import { FileRequest, FileRequestType, RequestFileAccessPermissionAssetProps, StorageModuleAccountProps } from '../types';

export class RequestFileAccessPermissionAsset extends BaseAsset {
	public name = 'requestFileAccessPermission';
	public id = 3;
	public schema = requestFileAccessPermissionAssetPropsSchema;

	public validate({ asset }: ValidateAssetContext<RequestFileAccessPermissionAssetProps>): void {
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
	}: ApplyAssetContext<RequestFileAccessPermissionAssetProps>): Promise<void> {
		const transactionId = transaction.id.toString('hex');
		const stateStoreData = await getStorageModuleData(stateStore);

		const file = stateStoreData.files.find(f => f.data.id === asset.id);
		if (!file) {
			throw new Error(`File with id ${asset.id} does not exist`);
		}

		if (file.meta.collection.id) {
			throw new Error(`File is part of a collection`);
		}

		const sender = await stateStore.account.getOrDefault<StorageModuleAccountProps>(transaction.senderAddress);

		if (!accountHasMap(sender)) {
			throw Error('Sender account is not initialized');
		}

		const owner = await stateStore.account.getOrDefault<StorageModuleAccountProps>(file.data.owner);

		if (!accountHasMap(owner)) {
			throw Error('Owner account is not initialized');
		}

		if (buffersAreEqual(owner.address, sender.address)) {
			throw new Error(`Sender is already owner of file`);
		}

		if (sender.storage.outgoingFileRequests.map(r => r.fileId).includes(asset.id)) {
			throw new Error(`Sender has already made a request for this file`);
		}

		if (sender.storage.filesAllowed.includes(asset.id)) {
			throw new Error(`Sender is already allowed to view file`);
		}

		const senderBalance: bigint = await reducerHandler.invoke('token:getBalance', {
			address: sender.address,
		});
		const accessPermissionFee = BigInt(transactions.convertLSKToBeddows(String(file.data.accessPermissionFee)));

		if (senderBalance - accessPermissionFee < BigInt('5000000')) {
			throw new Error(`Fee exceeds available balance`);
		}

		const accountRequest = {
			fileId: asset.id,
			requestId: transactionId,
		};

		const request: FileRequest = {
			...accountRequest,
			type: FileRequestType.AccessPermission,
			sender: sender.address,
		};

		file.data.requests.push(request);
		sender.storage.outgoingFileRequests.push(accountRequest);
		owner.storage.incomingFileRequests.push(accountRequest);

		await setStorageModuleData(stateStore, stateStoreData);
		await stateStore.account.set(sender.address, sender);
		await stateStore.account.set(owner.address, owner);
	}
}
