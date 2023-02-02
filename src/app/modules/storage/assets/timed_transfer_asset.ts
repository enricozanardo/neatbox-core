import { ApplyAssetContext, BaseAsset, cryptography, transactions, ValidateAssetContext } from 'lisk-sdk';

import { createDateTime, createMeta } from '../../../utils/helpers';
import { getStorageModuleData, setStorageModuleData } from '../../../utils/store';
import {
	accountHasMap,
	buffersAreEqual,
	isValidChecksum,
	isValidHash,
	isValidSha256Hash,
	isValidTimestamp,
} from '../../../utils/validation';
import { EXPIRATION, TX_FEES } from '../constants';
import { timedTransferAssetPropsSchema } from '../transaction_schemas';
import {
	AccountMapEntry,
	File,
	FileRequest,
	FileRequestType,
	HistoryItem,
	HistoryItemType,
	StorageModuleAccountProps,
	TimedTransferAssetProps,
	TimedTransferSummary,
} from '../types';

export class TimedTransferAsset extends BaseAsset {
	public name = 'timedTransfer';
	public id = 7;
	public fee = TX_FEES.timedTransfer;
	public schema = timedTransferAssetPropsSchema;

	public validate({ asset, transaction }: ValidateAssetContext<TimedTransferAssetProps>): void {
		if (!isValidTimestamp(asset.timestamp)) {
			throw new Error('Invalid timestamp');
		}

		if (!isValidChecksum(asset.checksum)) {
			throw new Error('Invalid checksum');
		}

		if (!isValidHash(asset.hash)) {
			throw new Error('Invalid hash');
		}

		if (!isValidSha256Hash(asset.recipientEmailHash)) {
			throw new Error('Invalid recipientEmailHash');
		}

		if (transaction.fee < this.fee) {
			throw new Error(`Fee of ${transaction.fee} is too low (required: ${this.fee})`);
		}
	}

	public async apply({
		asset,
		transaction,
		stateStore,
		reducerHandler,
	}: ApplyAssetContext<TimedTransferAssetProps>): Promise<void> {
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

		const id = transaction.id.toString('hex');

		const historyItem: HistoryItem = {
			id,
			createdAt: createDateTime(asset.timestamp),
			activity: HistoryItemType.TimedTransferSubmission,
			userAddress: sender.address,
		};

		const accountRequest = {
			fileId: id,
			requestId: id,
		};

		const request: FileRequest = {
			...accountRequest,
			type: FileRequestType.TimedTransfer,
			sender: sender.address,
			recipient: Buffer.from(''), // value is not used for Timed Transfer
		};

		const meta = createMeta(asset.timestamp, asset.timestamp + EXPIRATION);

		const file: File = {
			meta,
			data: {
				...asset,
				id,
				owner: transaction.senderAddress,
				requests: [request],
				history: [historyItem],
			},
		};

		const transferSummary: TimedTransferSummary = {
			id,
			expiration: meta.expiration,
			sender: sender.address,
			recipientEmailHash: asset.recipientEmailHash,
		};

		const map = stateStoreData.accountMap.find(a => a.emailHash === asset.recipientEmailHash);

		/** Timed Transfer is being sent to a new user */
		if (!map) {
			const accountMapEntry: AccountMapEntry = {
				emailHash: asset.recipientEmailHash,
				binaryAddress: '',
			};

			stateStoreData.accountMap.push(accountMapEntry);
		}

		/** Timed Transfer is being sent to an existing user */
		if (map?.binaryAddress) {
			const recipient = await stateStore.account.get<StorageModuleAccountProps>(
				cryptography.hexToBuffer(map.binaryAddress),
			);

			if (buffersAreEqual(sender.address, recipient.address)) {
				throw new Error('Can not send to self');
			}

			const recipientBalance: bigint = await reducerHandler.invoke('token:getBalance', {
				address: recipient.address,
			});

			const transferFee = BigInt(transactions.convertLSKToBeddows(String(asset.transferFee)));

			if (recipientBalance - transferFee < BigInt('5000000')) {
				throw new Error(`Recipient has insufficient balance`);
			}

			recipient.storage.incomingFileRequests.push(accountRequest);
			await stateStore.account.set(recipient.address, recipient);
		}

		stateStoreData.timedTransfers.push(transferSummary);
		stateStoreData.files.push(file);
		sender.storage.filesOwned.push(file.data.id);
		sender.storage.outgoingFileRequests.push(accountRequest);

		await setStorageModuleData(stateStore, stateStoreData);
		await stateStore.account.set(sender.address, sender);
	}
}
