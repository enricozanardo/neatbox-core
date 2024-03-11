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
import {
	FileRequest,
	FileRequestType,
	HistoryItem,
	HistoryItemType,
	MapStoreData,
	NeatboxFile,
	NeatboxFileData,
	TimedTransferSummary,
} from '../../../../types';
import { bigLog, createDateTime, createMeta, getTokenID } from '../../../../utils/helpers';
import {
	buffersAreEqual,
	isValidChecksum,
	isValidHash,
	isValidSha256Hash,
	isValidTimestamp,
} from '../../../../utils/validation';
import { TX_FEES } from '../constants';
import {
	getAccountStore,
	getFileStore,
	getMapStore,
	getStatisticStore,
	getTimedTransferStore,
	setAccountStore,
	setFileStore,
	setMapStore,
	setStatisticStore,
	setTimedTransferStore,
} from '../utils/store';

export const timedTransferCommandPropsSchema: Schema = {
	$id: 'neatbox/storage/timedTransferCommandPropsSchema',
	type: 'object',
	required: [
		'title',
		'name',
		'size',
		'type',
		'checksum',
		'hash',
		'customFields',
		'transferFee',
		'recipientEmailHash',
		'timestamp',
	],
	properties: {
		title: {
			dataType: 'string',
			fieldNumber: 1,
		},
		name: {
			dataType: 'string',
			fieldNumber: 2,
		},
		size: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
		type: {
			dataType: 'string',
			fieldNumber: 4,
		},
		checksum: {
			dataType: 'string',
			fieldNumber: 5,
		},
		hash: {
			dataType: 'string',
			fieldNumber: 6,
		},
		customFields: {
			dataType: 'bytes',
			fieldNumber: 7,
		},
		transferFee: {
			dataType: 'uint32',
			fieldNumber: 8,
		},
		accessPermissionFee: {
			dataType: 'uint32',
			fieldNumber: 9,
		},
		private: {
			dataType: 'boolean',
			fieldNumber: 10,
		},
		timestamp: {
			dataType: 'uint32',
			fieldNumber: 11,
		},
		recipientEmailHash: {
			dataType: 'string',
			fieldNumber: 12,
		},
	},
};
export type TimedTransferCommandProps = Omit<
	NeatboxFileData,
	'owner' | 'id' | 'requests' | 'history'
> & {
	transferFee: number;
	accessPermissionFee: number;
	private: boolean;
	recipientEmailHash: string;
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
	expiration,
	dryRun,
}:
	| {
			dryRun: true;
			registry: NamedRegistry;
			tokenMethod: TokenMethod;
			expiration: number;
			context: CommandVerifyContext<TimedTransferCommandProps>;
	  }
	| {
			dryRun: false;
			registry: NamedRegistry;
			tokenMethod: TokenMethod;
			expiration: number;
			context: CommandExecuteContext<TimedTransferCommandProps>;
	  }) => {
	const { params } = context;
	const { senderAddress } = context.transaction;
	const id = context.transaction.id.toString('hex');

	const fileStore = await getFileStore(registry, context);
	const timedTransferStore = await getTimedTransferStore(registry, context);
	const statisticStore = await getStatisticStore(registry, context);
	const sender = await getAccountStore(registry, context, senderAddress);

	if (!sender) {
		throw new Error('Account not initialized.');
	}

	const fileExists = !!fileStore.files.find(
		f => f.data.checksum === params.checksum || f.data.hash === params.hash,
	);

	if (fileExists) {
		throw new Error('File already exist');
	}

	const historyItem: HistoryItem = {
		id,
		createdAt: createDateTime(params.timestamp),
		activity: HistoryItemType.TimedTransferSubmission,
		userAddress: senderAddress,
	};

	const accountRequest = {
		fileId: id,
		requestId: id,
	};

	const request: FileRequest = {
		...accountRequest,
		type: FileRequestType.TimedTransfer,
		sender: senderAddress,
		recipient: Buffer.from(''), // value is not used for Timed Transfer
	};

	const file: NeatboxFile = {
		meta: createMeta(params.timestamp, params.timestamp + expiration),
		data: {
			...params,
			id,
			owner: senderAddress,
			requests: [request],
			history: [historyItem],
		},
	};

	const transferSummary: TimedTransferSummary = {
		id,
		expiration: file.meta.expiration,
		sender: senderAddress,
		recipientEmailHash: params.recipientEmailHash,
	};

	const map = await getMapStore(
		registry,
		context,
		'emailHash',
		Buffer.from(params.recipientEmailHash),
	);

	/** Timed Transfer is being sent to a new user */
	if (!map?.lsk32address) {
		const mapStoreData: MapStoreData = {
			emailHash: params.recipientEmailHash,
			lsk32address: '',
			username: '',
			address: Buffer.from(''),
		};

		if (!dryRun) {
			await setMapStore(
				registry,
				context,
				'emailHash',
				Buffer.from(params.recipientEmailHash),
				mapStoreData,
			);
		}
	}

	/** Timed Transfer is being sent to an existing user */
	if (map?.lsk32address && map?.address) {
		const recipientAddress = map.address;
		const recipient = await getAccountStore(registry, context, recipientAddress);

		if (!recipient) {
			throw Error('Recipient account is not initialized');
		}

		if (buffersAreEqual(senderAddress, recipientAddress)) {
			throw new Error('Can not send to self');
		}

		const recipientBalance = await tokenMethod.getAvailableBalance(
			context,
			recipientAddress,
			getTokenID(context.chainID),
		);

		const transferFee = BigInt(transactions.convertLSKToBeddows(String(params.transferFee)));

		if (recipientBalance - transferFee < BigInt('5000000')) {
			throw new Error(`Recipient has insufficient balance`);
		}

		recipient.incomingFileRequests.push(accountRequest);

		if (!dryRun) {
			await setAccountStore(registry, context, recipientAddress, recipient);
		}
	}
	fileStore.files.push(file);
	timedTransferStore.timedTransfers.push(transferSummary);
	sender.filesOwned.push(file.data.id);
	sender.outgoingFileRequests.push(accountRequest);

	const updatedStatisticStore = {
		...statisticStore,
		files: statisticStore.files + 1,
	};

	if (!dryRun) {
		await setFileStore(registry, context, fileStore);
		await setTimedTransferStore(registry, context, timedTransferStore);
		await setAccountStore(registry, context, senderAddress, sender);
		await setStatisticStore(registry, context, updatedStatisticStore);
	}
};

export class TimedTransferCommand extends BaseCommand {
	private _tokenMethod!: TokenMethod;
	private _expiration!: number;

	public schema = timedTransferCommandPropsSchema;

	public init(args: { tokenMethod: TokenMethod; expiration: number }): void {
		this._tokenMethod = args.tokenMethod;
		this._expiration = args.expiration;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(
		context: CommandVerifyContext<TimedTransferCommandProps>,
	): Promise<VerificationResult> {
		const { params, transaction } = context;

		if (!isValidTimestamp(params.timestamp)) {
			throw new Error('Invalid timestamp');
		}

		if (!isValidChecksum(params.checksum)) {
			throw new Error('Invalid checksum');
		}

		if (!isValidHash(params.hash)) {
			throw new Error('Invalid hash');
		}

		if (!isValidSha256Hash(params.recipientEmailHash)) {
			throw new Error('Invalid recipientEmailHash');
		}

		if (transaction.fee < TX_FEES.timedTransfer) {
			throw new Error(`Fee of ${transaction.fee} is too low (required: ${TX_FEES.timedTransfer})`);
		}

		await executeTransaction({
			registry: this.stores,
			context,
			tokenMethod: this._tokenMethod,
			expiration: this._expiration,
			dryRun: true,
		});

		return { status: VerifyStatus.OK };
	}

	public async execute(context: CommandExecuteContext<TimedTransferCommandProps>): Promise<void> {
		try {
			await executeTransaction({
				registry: this.stores,
				context,
				tokenMethod: this._tokenMethod,
				expiration: this._expiration,
				dryRun: false,
			});
			bigLog(context.logger.info.bind(context.logger), 'Transaction successfully processed');
		} catch (err) {
			bigLog(context.logger.error.bind(context.logger), 'Transaction failed to process', err);
		}
	}
}
