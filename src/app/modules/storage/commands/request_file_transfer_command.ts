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
import { FileRequest, FileRequestType } from '../../../../types';
import { bigLog, getTokenID } from '../../../../utils/helpers';
import { buffersAreEqual, isValidId, isValidTimestamp } from '../../../../utils/validation';
import { getAccountStore, getFileStore, setAccountStore, setFileStore } from '../utils/store';

export const requestFileTransferCommandPropsSchema: Schema = {
	$id: 'neatbox/storage/requestFileTransferCommandPropsSchema',
	type: 'object',
	required: ['fileId', 'recipientAddress', 'timestamp'],
	properties: {
		fileId: {
			dataType: 'string',
			fieldNumber: 1,
		},
		recipientAddress: {
			dataType: 'bytes',
			fieldNumber: 2,
		},
		timestamp: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
	},
};

export type RequestFileTransferCommandProps = {
	fileId: string;
	recipientAddress: Buffer;
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
			context: CommandVerifyContext<RequestFileTransferCommandProps>;
	  }
	| {
			dryRun: false;
			registry: NamedRegistry;
			tokenMethod: TokenMethod;
			context: CommandExecuteContext<RequestFileTransferCommandProps>;
	  }) => {
	const transactionId = context.transaction.id.toString('hex');
	const fileStore = await getFileStore(registry, context);

	const { senderAddress } = context.transaction;
	const sender = await getAccountStore(registry, context, senderAddress);

	const { recipientAddress } = context.params;

	if (!sender) {
		throw new Error('Account not initialized.');
	}

	const file = fileStore.files.find(f => f.data.id === context.params.fileId);
	if (!file) {
		throw new Error(`File with id ${context.params.fileId} does not exist`);
	}

	if (!buffersAreEqual(file.data.owner, senderAddress)) {
		throw new Error(`Sender is not owner of file`);
	}

	if (sender.outgoingFileRequests.map(req => req.fileId).includes(context.params.fileId)) {
		throw new Error('File is already included in another pending request');
	}

	if (buffersAreEqual(recipientAddress, senderAddress)) {
		throw new Error(`Sender can not be recipient`);
	}

	if (file.meta.collection.id) {
		throw new Error(`File is part of a collection`);
	}

	const recipient = await getAccountStore(registry, context, recipientAddress);

	if (!recipient) {
		throw Error('Recipient account is not initialized');
	}

	const recipientBalance = await tokenMethod.getAvailableBalance(
		context,
		recipientAddress,
		getTokenID(context.chainID),
	);

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
		sender: senderAddress,
		recipient: recipientAddress,
	};

	file.data.requests.push(request);
	sender.outgoingFileRequests.push(accountRequest);
	recipient.incomingFileRequests.push(accountRequest);

	if (!dryRun) {
		await setAccountStore(registry, context, senderAddress, sender);
		await setAccountStore(registry, context, recipientAddress, recipient);
		await setFileStore(registry, context, fileStore);
	}
};

export class RequestFileTransferCommand extends BaseCommand {
	private _tokenMethod!: TokenMethod;
	public schema = requestFileTransferCommandPropsSchema;

	public init(args: { tokenMethod: TokenMethod }): void {
		this._tokenMethod = args.tokenMethod;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(
		context: CommandVerifyContext<RequestFileTransferCommandProps>,
	): Promise<VerificationResult> {
		if (!isValidId(context.params.fileId)) {
			throw new Error('Invalid file id');
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
		context: CommandExecuteContext<RequestFileTransferCommandProps>,
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
