import { ApplyAssetContext, BaseAsset, transactions, ValidateAssetContext } from 'lisk-sdk';

import { getStorageModuleData, setStorageModuleData } from '../../../utils/store';
import { accountHasMap, buffersAreEqual, isValidId, isValidTimestamp } from '../../../utils/validation';
import { requestFileTransferAssetPropsSchema } from '../transaction_schemas';
import { FileRequest, FileRequestType, RequestFileTransferAssetProps, StorageModuleAccountProps } from '../types';

export class RequestFileTransferAsset extends BaseAsset {
	public name = 'requestFileTransfer';
	public id = 4;
	public schema = requestFileTransferAssetPropsSchema;

	public validate({ asset }: ValidateAssetContext<RequestFileTransferAssetProps>): void {
		if (!isValidId(asset.fileId)) {
			throw new Error('Invalid file id');
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
	}: ApplyAssetContext<RequestFileTransferAssetProps>): Promise<void> {
		const transactionId = transaction.id.toString('hex');
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

		if (buffersAreEqual(asset.recipientAddress, sender.address)) {
			throw new Error(`Sender can not be recipient`);
		}

		if (file.meta.collection.id) {
			throw new Error(`File is part of a collection`);
		}

		const recipient = await stateStore.account.get<StorageModuleAccountProps>(asset.recipientAddress);

		if (!accountHasMap(recipient)) {
			throw Error('Recipient account is not initialized');
		}

		const recipientBalance: bigint = await reducerHandler.invoke('token:getBalance', {
			address: recipient.address,
		});
		const transferFee = BigInt(transactions.convertLSKToBeddows(String(file.data.transferFee)));

		if (recipientBalance - transferFee < BigInt('5000000')) {
			throw new Error(`Fee exceeds available balance`);
		}

		const accountRequest = {
			fileId: file.data.id,
			requestId: transactionId,
		};

		const request: FileRequest = {
			...accountRequest,
			type: FileRequestType.Transfer,
			sender: sender.address,
			recipient: asset.recipientAddress,
		};

		file.data.requests.push(request);
		sender.storage.outgoingFileRequests.push(accountRequest);
		recipient.storage.incomingFileRequests.push(accountRequest);

		await stateStore.account.set(sender.address, sender);
		await stateStore.account.set(recipient.address, recipient);
		await setStorageModuleData(stateStore, stateStoreData);
	}
}
