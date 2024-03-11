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
import { CollectionRequest, CollectionRequestType } from '../../../../types';
import { bigLog, getTokenID } from '../../../../utils/helpers';
import { buffersAreEqual, isValidId, isValidTimestamp } from '../../../../utils/validation';
import {
	getAccountStore,
	getCollectionStore,
	setAccountStore,
	setCollectionStore,
} from '../utils/store';

export const requestCollectionTransferCommandPropsSchema: Schema = {
	$id: 'neatbox/storage/requestCollectionTransferCommandPropsSchema',
	type: 'object',
	required: ['collectionId', 'recipientAddress', 'timestamp'],
	properties: {
		collectionId: {
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

export type RequestCollectionTransferCommandProps = {
	collectionId: string;
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
			context: CommandVerifyContext<RequestCollectionTransferCommandProps>;
	  }
	| {
			dryRun: false;
			registry: NamedRegistry;
			tokenMethod: TokenMethod;
			context: CommandExecuteContext<RequestCollectionTransferCommandProps>;
	  }) => {
	const transactionId = context.transaction.id.toString('hex');
	const collectionStore = await getCollectionStore(registry, context);

	const { senderAddress } = context.transaction;
	const sender = await getAccountStore(registry, context, senderAddress);

	const { recipientAddress } = context.params;

	if (!sender) {
		throw new Error('Account not initialized.');
	}

	const collection = collectionStore.collections.find(c => c.id === context.params.collectionId);

	if (!collection) {
		throw new Error(`Collection with id ${context.params.collectionId} does not exist`);
	}

	if (collection.fileIds.length === 0) {
		throw new Error('Collection is empty');
	}

	const ownerAddress = collection.owner;

	if (!buffersAreEqual(ownerAddress, senderAddress)) {
		throw new Error(`Sender is not owner of collection`);
	}

	if (
		sender.outgoingCollectionRequests
			.map(req => req.collectionId)
			.includes(context.params.collectionId)
	) {
		throw new Error('Collection is already included in another pending request');
	}

	if (buffersAreEqual(recipientAddress, senderAddress)) {
		throw new Error(`Sender can not be recipient`);
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
		type: CollectionRequestType.Transfer,
		sender: senderAddress,
		recipient: recipientAddress,
	};

	collection.requests.push(request);
	sender.outgoingCollectionRequests.push(accountRequest);
	recipient.incomingCollectionRequests.push(accountRequest);

	if (!dryRun) {
		await setAccountStore(registry, context, senderAddress, sender);
		await setAccountStore(registry, context, recipientAddress, recipient);
		await setCollectionStore(registry, context, collectionStore);
	}
};

export class RequestCollectionTransferCommand extends BaseCommand {
	private _tokenMethod!: TokenMethod;
	public schema = requestCollectionTransferCommandPropsSchema;

	public init(args: { tokenMethod: TokenMethod }): void {
		this._tokenMethod = args.tokenMethod;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(
		context: CommandVerifyContext<RequestCollectionTransferCommandProps>,
	): Promise<VerificationResult> {
		if (!isValidId(context.params.collectionId)) {
			throw new Error('Invalid collection id');
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
		context: CommandExecuteContext<RequestCollectionTransferCommandProps>,
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
