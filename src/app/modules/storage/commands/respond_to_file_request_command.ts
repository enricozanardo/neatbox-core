/* eslint-disable class-methods-use-this */
import {
	BaseCommand,
	CommandExecuteContext,
	CommandVerifyContext,
	NamedRegistry,
	Schema,
	TokenMethod,
	VerificationResult,
	VerifyStatus,
	transactions,
} from 'lisk-sdk';
import { FileRequestType, HistoryItem, HistoryItemType } from '../../../../types';
import { bigLog, createDateTime, getTokenID, updateMeta } from '../../../../utils/helpers';
import { buffersAreEqual, isValidId, isValidTimestamp } from '../../../../utils/validation';
import {
	cleanUpOldAccountData,
	getAccountStore,
	getFileStore,
	getStatisticStore,
	removeRequestsFromObject,
	setAccountStore,
	setFileStore,
	setStatisticStore,
} from '../utils/store';

export const respondToFileRequestCommandPropsSchema: Schema = {
	$id: 'neatbox/storage/respondToFileRequestCommandPropsSchema',
	type: 'object',
	required: ['fileId', 'requestId', 'accept', 'newHash', 'timestamp'],
	properties: {
		fileId: {
			dataType: 'string',
			fieldNumber: 1,
		},
		requestId: {
			dataType: 'string',
			fieldNumber: 2,
		},
		accept: {
			dataType: 'boolean',
			fieldNumber: 3,
		},
		newHash: {
			dataType: 'string',
			fieldNumber: 4,
		},
		timestamp: {
			dataType: 'uint32',
			fieldNumber: 5,
		},
	},
};

export type RespondToFileRequestCommandProps = {
	fileId: string;
	requestId: string;
	accept: boolean;
	newHash: string;
	timestamp: number;
};

/**
 * Allows for truly-dry running a transaction, avoiding failed (but accepted) transactions (introduced in SDKv6),
 * which are a nightmare to work with in a frontend
 */
const executeTransaction = async ({
	registry,
	context,
	tokenMethod,
	dryRun,
}:
	| {
			dryRun: true;
			registry: NamedRegistry;
			tokenMethod: TokenMethod;
			context: CommandVerifyContext<RespondToFileRequestCommandProps>;
	  }
	| {
			dryRun: false;
			registry: NamedRegistry;
			tokenMethod: TokenMethod;
			context: CommandExecuteContext<RespondToFileRequestCommandProps>;
	  }) => {
	const { senderAddress } = context.transaction;
	const { requestId, accept, fileId, newHash, timestamp } = context.params;

	const statisticStore = await getStatisticStore(registry, context);
	const fileStore = await getFileStore(registry, context);
	const sender = await getAccountStore(registry, context, senderAddress);

	const updatedStatisticStore = { ...statisticStore };

	if (!sender) {
		throw new Error('Account not initialized.');
	}

	const file = fileStore.files.find(f => f.data.id === fileId);
	if (!file) {
		throw new Error(`File with id ${fileId} does not exist`);
	}

	const request = file.data.requests.find(r => r.requestId === requestId);
	if (!request) {
		throw new Error(`Request with id ${requestId} does not exist`);
	}

	if (
		(request.type === FileRequestType.AccessPermission ||
			request.type === FileRequestType.Ownership) &&
		!buffersAreEqual(file.data.owner, senderAddress)
	) {
		throw new Error(`Sender is not owner of file`);
	}

	const requesterAddress = request.sender;
	const requester = await getAccountStore(registry, context, requesterAddress);

	if (!requester) {
		throw new Error('Requester does not exist.');
	}

	if (accept) {
		let historyActivity!: HistoryItemType;

		const transferFee = BigInt(transactions.convertLSKToBeddows(String(file.data.transferFee)));
		const accessPermissionFee = BigInt(
			transactions.convertLSKToBeddows(String(file.data.accessPermissionFee)),
		);

		/**
		 * Ownership is requested by new owner ('requester') and
		 * response is sent by the original owner ('sender')
		 */
		if (request.type === FileRequestType.Ownership) {
			const requesterBalance = await tokenMethod.getAvailableBalance(
				context,
				requesterAddress,
				getTokenID(context.chainID),
			);

			if (requesterBalance - transferFee < BigInt('5000000')) {
				throw new Error(`Requester does not have enough balance`);
			}

			if (!dryRun) {
				// Credit / debit users
				await tokenMethod.transfer(
					context,
					requesterAddress,
					senderAddress,
					getTokenID(context.chainID),
					transferFee,
				);

				await cleanUpOldAccountData(
					registry,
					context,
					file,
					{ data: sender, address: senderAddress },
					{ data: requester, address: requesterAddress },
				);
			}

			file.data.requests = [];
			file.data.owner = requesterAddress;
			file.data.hash = newHash;
			requester.filesOwned.push(fileId);

			sender.filesOwned = sender.filesOwned.filter(f => f !== fileId);

			updatedStatisticStore.transfers += 1;
			historyActivity = HistoryItemType.Transfer;
		}

		/**
		 * Access permission is requested by user ('requester') and
		 * response is sent by the original owner ('sender')
		 */
		if (request.type === FileRequestType.AccessPermission) {
			const requesterBalance = await tokenMethod.getAvailableBalance(
				context,
				requesterAddress,
				getTokenID(context.chainID),
			);

			if (requesterBalance - accessPermissionFee < BigInt('5000000')) {
				throw new Error(`Requester does not have enough balance`);
			}

			if (!dryRun) {
				// Credit / debit users
				await tokenMethod.transfer(
					context,
					requesterAddress,
					senderAddress,
					getTokenID(context.chainID),
					accessPermissionFee,
				);
			}

			requester.filesAllowed.push(fileId);
			historyActivity = HistoryItemType.AccessPermission;
		}

		/**
		 * Ownership Transfer is requested by original owner ('requester') and
		 * response is sent by the new owner ('sender')
		 */
		if (request.type === FileRequestType.Transfer) {
			const senderBalance = await tokenMethod.getAvailableBalance(
				context,
				senderAddress,
				getTokenID(context.chainID),
			);

			if (senderBalance - transferFee < BigInt('5000000')) {
				throw new Error(`You do not have enough balance`);
			}

			if (!dryRun) {
				// Credit / debit users
				await tokenMethod.transfer(
					context,
					senderAddress,
					requesterAddress,
					getTokenID(context.chainID),
					transferFee,
				);

				await cleanUpOldAccountData(
					registry,
					context,
					file,
					{ data: sender, address: senderAddress },
					{ data: requester, address: requesterAddress },
				);
			}

			file.data.requests = [];
			file.data.owner = senderAddress;
			file.data.hash = newHash;
			sender.filesOwned.push(fileId);
			requester.filesOwned = requester.filesOwned.filter(f => f !== fileId);

			updatedStatisticStore.transfers += 1;
			historyActivity = HistoryItemType.Transfer;
		}

		// Timed Transfer Transfer is requested by original owner ('requester') and response is sent by the new owner ('sender')
		if (request.type === FileRequestType.TimedTransfer) {
			const senderBalance = await tokenMethod.getAvailableBalance(
				context,
				senderAddress,
				getTokenID(context.chainID),
			);

			if (senderBalance - transferFee < BigInt('5000000')) {
				throw new Error(`You do not have enough balance`);
			}

			if (!dryRun) {
				// Credit / debit users
				await tokenMethod.transfer(
					context,
					senderAddress,
					requesterAddress,
					getTokenID(context.chainID),
					transferFee,
				);
			}

			file.data.owner = senderAddress;
			file.data.hash = newHash;
			sender.filesOwned.push(fileId);

			// remove redundant id from 'files allowed'
			sender.filesAllowed = sender.filesAllowed.filter(f => f !== fileId);
			requester.filesOwned = requester.filesOwned.filter(f => f !== fileId);

			updatedStatisticStore.transfers += 1;
			historyActivity = HistoryItemType.TimedTransferResponse;
		}

		const historyItem: HistoryItem = {
			id: context.transaction.id.toString('hex'),
			createdAt: createDateTime(timestamp),
			activity: historyActivity,
			userAddress: request.type !== FileRequestType.Transfer ? requesterAddress : senderAddress,
		};

		file.data.history.push(historyItem);
		file.meta = updateMeta(file.meta, timestamp);
	}

	removeRequestsFromObject({ type: 'file', input: file, requestIds: [requestId] });
	removeRequestsFromObject({ type: 'account', input: requester, requestIds: [requestId] });
	removeRequestsFromObject({ type: 'account', input: sender, requestIds: [requestId] });

	if (!dryRun) {
		await setAccountStore(registry, context, senderAddress, sender);
		await setAccountStore(registry, context, requesterAddress, requester);
		await setFileStore(registry, context, fileStore);
		await setStatisticStore(registry, context, updatedStatisticStore);
	}
};

export class RespondToFileRequestCommand extends BaseCommand {
	private _tokenMethod!: TokenMethod;
	public schema = respondToFileRequestCommandPropsSchema;

	public init(args: { tokenMethod: TokenMethod }): void {
		this._tokenMethod = args.tokenMethod;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(
		context: CommandVerifyContext<RespondToFileRequestCommandProps>,
	): Promise<VerificationResult> {
		if (!isValidId(context.params.fileId)) {
			throw new Error('Invalid file id');
		}

		if (!isValidId(context.params.requestId)) {
			throw new Error('Invalid request id');
		}

		if (!isValidTimestamp(context.params.timestamp)) {
			throw new Error('Invalid timestamp');
		}

		await executeTransaction({
			registry: this.stores,
			context,
			tokenMethod: this._tokenMethod,
			dryRun: true,
		});

		return { status: VerifyStatus.OK };
	}

	public async execute(
		context: CommandExecuteContext<RespondToFileRequestCommandProps>,
	): Promise<void> {
		try {
			await executeTransaction({
				registry: this.stores,
				context,
				tokenMethod: this._tokenMethod,
				dryRun: false,
			});

			bigLog(context.logger.info.bind(context.logger), 'Transaction successfully processed');
		} catch (err) {
			bigLog(context.logger.error.bind(context.logger), 'Transaction failed to process', err);
		}
	}
}
