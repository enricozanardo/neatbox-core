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

export type RequestCollectionOwnershipCommandProps = {
	id: string;
	timestamp: number;
};

export const requestCollectionOwnershipCommandPropsSchema: Schema = {
	$id: 'neatbox/storage/requestCollectionOwnershipCommandPropsSchema',
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
			context: CommandVerifyContext<RequestCollectionOwnershipCommandProps>;
	  }
	| {
			dryRun: false;
			registry: NamedRegistry;
			tokenMethod: TokenMethod;
			context: CommandExecuteContext<RequestCollectionOwnershipCommandProps>;
	  }) => {
	const { id } = context.params;
	const { senderAddress, id: txId } = context.transaction;
	const transactionId = txId.toString('hex');

	const collectionStore = await getCollectionStore(registry, context);
	const sender = await getAccountStore(registry, context, senderAddress);
	const collection = collectionStore.collections.find(c => c.id === id);

	if (!sender) {
		throw new Error('Sender account is not initialized.');
	}

	if (!collection) {
		throw new Error(`Collection with id ${id} does not exist`);
	}

	const ownerAddress = collection.owner;
	const owner = await getAccountStore(registry, context, ownerAddress);

	if (!owner) {
		throw new Error('Owner account is not initialized.');
	}

	if (buffersAreEqual(ownerAddress, senderAddress)) {
		throw new Error(`Sender is already owner of collection`);
	}

	if (sender.outgoingCollectionRequests.map(r => r.collectionId).includes(id)) {
		throw new Error(`Sender has already made a request for this collection`);
	}

	const senderBalance = await tokenMethod.getAvailableBalance(
		context,
		senderAddress,
		getTokenID(context.chainID),
	);

	const transferFee = BigInt(transactions.convertLSKToBeddows(String(collection.transferFee)));

	if (senderBalance - transferFee < BigInt('5000000')) {
		throw new Error(`Fee exceeds available balance`);
	}

	const accountRequest = {
		collectionId: id,
		requestId: transactionId,
	};

	const request: CollectionRequest = {
		...accountRequest,
		type: CollectionRequestType.Ownership,
		sender: senderAddress,
		recipient: ownerAddress,
	};

	collection.requests.push(request);
	sender.outgoingCollectionRequests.push(accountRequest);
	owner.incomingCollectionRequests.push(accountRequest);

	if (!dryRun) {
		await setAccountStore(registry, context, senderAddress, sender);
		await setAccountStore(registry, context, ownerAddress, owner);
		await setCollectionStore(registry, context, collectionStore);
	}
};

export class RequestCollectionOwnershipCommand extends BaseCommand {
	private _tokenMethod!: TokenMethod;
	public schema = requestCollectionOwnershipCommandPropsSchema;

	public init(args: { tokenMethod: TokenMethod }): void {
		this._tokenMethod = args.tokenMethod;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(
		context: CommandVerifyContext<RequestCollectionOwnershipCommandProps>,
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
		context: CommandExecuteContext<RequestCollectionOwnershipCommandProps>,
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
