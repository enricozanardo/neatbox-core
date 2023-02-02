import { ApplyAssetContext, BaseAsset, transactions, ValidateAssetContext } from 'lisk-sdk';

import { createDateTime, updateMeta } from '../../../utils/helpers';
import { cleanUpAccountData, getStorageModuleData, setStorageModuleData } from '../../../utils/store';
import { accountHasMap, buffersAreEqual, isValidId, isValidTimestamp } from '../../../utils/validation';
import { respondAssetPropsSchema } from '../transaction_schemas';
import {
	FileRequestType,
	HistoryItem,
	HistoryItemType,
	RespondToFileRequestAssetProps,
	StorageModuleAccountProps,
} from '../types';

export class RespondToFileRequestAsset extends BaseAsset {
	public name = 'respondToFileRequest';
	public id = 5;
	public schema = respondAssetPropsSchema;

	public validate({ asset }: ValidateAssetContext<RespondToFileRequestAssetProps>): void {
		if (!isValidId(asset.fileId)) {
			throw new Error('Invalid file id');
		}

		if (!isValidId(asset.requestId)) {
			throw new Error('Invalid request id');
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
	}: ApplyAssetContext<RespondToFileRequestAssetProps>): Promise<void> {
		const stateStoreData = await getStorageModuleData(stateStore);
		const sender = await stateStore.account.getOrDefault<StorageModuleAccountProps>(transaction.senderAddress);

		if (!accountHasMap(sender)) {
			throw Error('Sender account is not initialized');
		}

		const file = stateStoreData.files.find(f => f.data.id === asset.fileId);
		if (!file) {
			throw new Error(`File with id ${asset.fileId} does not exist`);
		}

		const request = file.data.requests.find(r => r.requestId === asset.requestId);
		if (!request) {
			throw new Error(`Request with id ${asset.requestId} does not exist`);
		}

		if (
			(request.type === FileRequestType.AccessPermission || request.type === FileRequestType.Ownership) &&
			!buffersAreEqual(file.data.owner, sender.address)
		) {
			throw new Error(`Sender is not owner of file`);
		}

		// TODO: validate if sender is recipient of transfer
		const requester = await stateStore.account.getOrDefault<StorageModuleAccountProps>(request.sender);

		if (asset.accept) {
			let historyActivity!: HistoryItemType;

			const transferFee = BigInt(transactions.convertLSKToBeddows(String(file.data.transferFee)));
			const accessPermissionFee = BigInt(transactions.convertLSKToBeddows(String(file.data.accessPermissionFee)));

			// Ownership is requested by new owner ('requester') and response is sent by the original owner ('sender')
			if (request.type === FileRequestType.Ownership) {
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

				await cleanUpAccountData(stateStore, file, sender, requester);

				file.data.requests = [];
				file.data.owner = requester.address;
				file.data.hash = asset.newHash;
				requester.storage.filesOwned.push(asset.fileId);

				sender.storage.filesOwned = sender.storage.filesOwned.filter(f => f !== asset.fileId);
				stateStoreData.transfers += 1;
				historyActivity = HistoryItemType.Transfer;
			}

			// Access permission is requested by user ('requester') and response is sent by the original owner ('sender')
			if (request.type === FileRequestType.AccessPermission) {
				const requesterBalance: bigint = await reducerHandler.invoke('token:getBalance', {
					address: requester.address,
				});

				if (requesterBalance - accessPermissionFee < BigInt('5000000')) {
					throw new Error(`Requester does not have enough balance`);
				}

				// Credit original owner
				await reducerHandler.invoke('token:credit', {
					address: sender.address,
					amount: accessPermissionFee,
				});

				// Debit new owner
				await reducerHandler.invoke('token:debit', {
					address: requester.address,
					amount: accessPermissionFee,
				});

				requester.storage.filesAllowed.push(asset.fileId);
				historyActivity = HistoryItemType.AccessPermission;
			}

			// Ownership Transfer is requested by original owner ('requester') and response is sent by the new owner ('sender')
			if (request.type === FileRequestType.Transfer) {
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

				await cleanUpAccountData(stateStore, file, sender, requester);

				file.data.requests = [];
				file.data.owner = sender.address;
				file.data.hash = asset.newHash;
				sender.storage.filesOwned.push(asset.fileId);
				requester.storage.filesOwned = requester.storage.filesOwned.filter(f => f !== asset.fileId);

				stateStoreData.transfers += 1;
				historyActivity = HistoryItemType.Transfer;
			}

			// Timed Transfer Transfer is requested by original owner ('requester') and response is sent by the new owner ('sender')
			if (request.type === FileRequestType.TimedTransfer) {
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

				file.data.owner = sender.address;
				file.data.hash = asset.newHash;
				sender.storage.filesOwned.push(asset.fileId);

				// remove redundant id from 'files allowed'
				sender.storage.filesAllowed = sender.storage.filesAllowed.filter(f => f !== asset.fileId);
				requester.storage.filesOwned = requester.storage.filesOwned.filter(f => f !== asset.fileId);

				stateStoreData.transfers += 1;
				historyActivity = HistoryItemType.TimedTransferResponse;
			}

			const historyItem: HistoryItem = {
				id: transaction.id.toString('hex'),
				createdAt: createDateTime(asset.timestamp),
				activity: historyActivity,
				userAddress: request.type !== FileRequestType.Transfer ? requester.address : sender.address,
			};

			file.data.history.push(historyItem);
			file.meta = updateMeta(file.meta, asset.timestamp);
		}

		file.data.requests = file.data.requests.filter(req => req.requestId !== asset.requestId);

		requester.storage.outgoingFileRequests = requester.storage.outgoingFileRequests.filter(
			req => req.requestId !== asset.requestId,
		);
		sender.storage.incomingFileRequests = sender.storage.incomingFileRequests.filter(
			req => req.requestId !== asset.requestId,
		);

		await stateStore.account.set(sender.address, sender);
		await stateStore.account.set(requester.address, requester);
		await setStorageModuleData(stateStore, stateStoreData);
	}
}
