/* eslint-disable class-methods-use-this */

import {
	BaseCommand,
	CommandVerifyContext,
	CommandExecuteContext,
	VerificationResult,
	VerifyStatus,
	Schema,
	TokenMethod,
	transactions,
	NamedRegistry,
} from 'lisk-sdk';
import { getAccountStore, getFileStore, setAccountStore, setFileStore } from '../utils/store';
import { bigLog, getTokenID } from '../../../../utils/helpers';
import { buffersAreEqual, isValidId, isValidTimestamp } from '../../../../utils/validation';
import { FileRequest, FileRequestType } from '../../../../types';

export const requestFileAccessCommandPropsSchema: Schema = {
	$id: 'neatbox/storage/requestFileAccessCommandPropsSchema',
	type: 'object',
	required: ['id', 'timestamp'],
	properties: {
		id: {
			dataType: 'string',
			fieldNumber: 1,
		},
		timestamp: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
	},
};

export type RequestFileAccessCommandProps = {
	id: string;
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
			context: CommandVerifyContext<RequestFileAccessCommandProps>;
	  }
	| {
			dryRun: false;
			registry: NamedRegistry;
			tokenMethod: TokenMethod;
			context: CommandExecuteContext<RequestFileAccessCommandProps>;
	  }) => {
	const { id } = context.params;
	const { senderAddress, id: txId } = context.transaction;
	const transactionId = txId.toString('hex');

	const fileStore = await getFileStore(registry, context);
	const sender = await getAccountStore(registry, context, senderAddress);
	const file = fileStore.files.find(f => f.data.id === id);

	if (!sender) {
		throw new Error('Sender account is not initialized.');
	}

	if (!file) {
		throw new Error(`File with id ${id} does not exist`);
	}

	if (file.meta.collection.id) {
		throw new Error(`File is part of a collection`);
	}

	const ownerAddress = file.data.owner;
	const owner = await getAccountStore(registry, context, ownerAddress);

	if (!owner) {
		throw new Error('Owner account is not initialized.');
	}

	if (buffersAreEqual(ownerAddress, senderAddress)) {
		throw new Error(`Sender is already owner of file`);
	}

	if (sender.filesAllowed.includes(id)) {
		throw new Error(`Sender is already allowed to view file`);
	}

	if (sender.outgoingFileRequests.map(r => r.fileId).includes(id)) {
		throw new Error(`Sender has already made a request for this file`);
	}

	const senderBalance = await tokenMethod.getAvailableBalance(
		context,
		senderAddress,
		getTokenID(context.chainID),
	);

	const accessFee = BigInt(transactions.convertLSKToBeddows(String(file.data.accessPermissionFee)));

	if (senderBalance - accessFee < BigInt('5000000')) {
		throw new Error(`Fee exceeds available balance`);
	}

	const accountRequest = {
		fileId: id,
		requestId: transactionId,
	};

	const request: FileRequest = {
		...accountRequest,
		type: FileRequestType.AccessPermission,
		sender: senderAddress,
		recipient: ownerAddress,
	};

	file.data.requests.push(request);
	sender.outgoingFileRequests.push(accountRequest);
	owner.incomingFileRequests.push(accountRequest);

	if (!dryRun) {
		await setAccountStore(registry, context, senderAddress, sender);
		await setAccountStore(registry, context, ownerAddress, owner);
		await setFileStore(registry, context, fileStore);
	}
};

export class RequestFileAccessCommand extends BaseCommand {
	private _tokenMethod!: TokenMethod;
	public schema = requestFileAccessCommandPropsSchema;

	public init(args: { tokenMethod: TokenMethod }): void {
		this._tokenMethod = args.tokenMethod;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(
		context: CommandVerifyContext<RequestFileAccessCommandProps>,
	): Promise<VerificationResult> {
		if (!isValidId(context.params.id)) {
			throw new Error('Invalid id');
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
		context: CommandExecuteContext<RequestFileAccessCommandProps>,
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
