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
import { buffersAreEqual, isValidId, isValidTimestamp } from '../../../../utils/validation';
import {
	getAccountStore,
	getCollectionStore,
	getFileStore,
	getStatisticStore,
	removeRequestsFromObject,
	setAccountStore,
	setCollectionStore,
	setFileStore,
	setStatisticStore,
} from '../utils/store';
import { bigLog, createDateTime, getTokenID, updateMeta } from '../../../../utils/helpers';
import { CollectionRequestType, HistoryItem, HistoryItemType } from '../../../../types';

export const respondToCollectionRequestCommandPropsSchema: Schema = {
	$id: 'neatbox/storage/respondToCollectionRequestCommandPropsSchema',
	type: 'object',
	required: ['collectionId', 'requestId', 'accept', 'updatedFileData', 'timestamp'],
	properties: {
		collectionId: {
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
		updatedFileData: {
			fieldNumber: 4,
			type: 'array',
			items: {
				type: 'object',
				required: ['fileId', 'newHash'],
				properties: {
					fileId: {
						fieldNumber: 1,
						dataType: 'string',
					},
					newHash: {
						fieldNumber: 2,
						dataType: 'string',
					},
				},
			},
		},
		timestamp: {
			dataType: 'uint32',
			fieldNumber: 5,
		},
	},
};

export type RespondToCollectionRequestCommandProps = {
	collectionId: string;
	requestId: string;
	accept: boolean;
	updatedFileData: {
		fileId: string;
		newHash: string;
	}[];
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
			context: CommandVerifyContext<RespondToCollectionRequestCommandProps>;
	  }
	| {
			dryRun: false;
			registry: NamedRegistry;
			tokenMethod: TokenMethod;
			context: CommandExecuteContext<RespondToCollectionRequestCommandProps>;
	  }) => {
	const { senderAddress } = context.transaction;
	const { requestId, accept, collectionId, updatedFileData, timestamp } = context.params;

	const statisticStore = await getStatisticStore(registry, context);
	const fileStore = await getFileStore(registry, context);
	const collectionStore = await getCollectionStore(registry, context);

	const sender = await getAccountStore(registry, context, senderAddress);

	const updatedStatisticStore = { ...statisticStore };

	if (!sender) {
		throw new Error('Account not initialized.');
	}

	const collection = collectionStore.collections.find(c => c.id === collectionId);
	if (!collection) {
		throw new Error(`Collection with id ${collectionId} does not exist`);
	}

	const request = collection.requests.find(r => r.requestId === requestId);
	if (!request) {
		throw new Error(`Request with id ${requestId} does not exist`);
	}

	const requesterAddress = request.sender;
	const requester = await getAccountStore(registry, context, requesterAddress);

	if (!requester) {
		throw new Error('Requester does not exist.');
	}

	if (
		request.type === CollectionRequestType.Ownership &&
		!buffersAreEqual(collection.owner, senderAddress)
	) {
		throw new Error(`Sender is not owner of collection`);
	}

	if (accept) {
		const transferFee = BigInt(transactions.convertLSKToBeddows(String(collection.transferFee)));

		// Ownership is requested by new owner ('requester') and response is sent by the original owner ('sender')
		if (request.type === CollectionRequestType.Ownership) {
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
			}

			const historyItem: HistoryItem = {
				id: context.transaction.id.toString('hex'),
				createdAt: createDateTime(timestamp),
				activity: HistoryItemType.TransferredViaCollection,
				userAddress: requesterAddress,
			};

			/** Update files in collection */
			for (const fileId of collection.fileIds) {
				const file = fileStore.files.find(f => f.data.id === fileId);
				if (!file) {
					throw new Error(`File with id ${fileId} does not exist`);
				}

				const updatedData = updatedFileData.find(data => data.fileId === fileId);

				if (!updatedData) {
					throw new Error(`No updated hash supplied for file with id ${fileId}`);
				}

				file.meta = updateMeta(file.meta, timestamp);
				file.data.owner = requesterAddress;
				file.data.hash = updatedData.newHash;
				file.data.history.push(historyItem);
				updatedStatisticStore.transfers += 1;
			}

			collection.owner = requesterAddress;

			requester.filesOwned = [...requester.filesOwned, ...collection.fileIds];
			requester.collectionsOwned.push(collectionId);

			sender.collectionsOwned = sender.collectionsOwned.filter(c => c !== collectionId);
			sender.filesOwned = sender.filesOwned.filter(f => !collection.fileIds.includes(f));
		}

		// Transfer is requested by original owner ('requester') and response is sent by the new owner ('sender')
		if (request.type === CollectionRequestType.Transfer) {
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
					requesterAddress,
					senderAddress,
					getTokenID(context.chainID),
					transferFee,
				);
			}

			const historyItem: HistoryItem = {
				id: context.transaction.id.toString('hex'),
				createdAt: createDateTime(timestamp),
				activity: HistoryItemType.TransferredViaCollection,
				userAddress: senderAddress,
			};

			/** Update files in collection */
			for (const fileId of collection.fileIds) {
				const file = fileStore.files.find(f => f.data.id === fileId);
				if (!file) {
					throw new Error(`File with id ${fileId} does not exist`);
				}

				const updatedData = updatedFileData.find(data => data.fileId === fileId);

				if (!updatedData) {
					throw new Error(`No updated hash supplied for file with id ${fileId}`);
				}

				file.meta = updateMeta(file.meta, timestamp);
				file.data.owner = senderAddress;
				file.data.hash = updatedData.newHash;
				file.data.history.push(historyItem);
				updatedStatisticStore.transfers += 1;
			}

			collection.owner = senderAddress;

			sender.filesOwned = [...sender.filesOwned, ...collection.fileIds];
			sender.collectionsOwned.push(collectionId);

			requester.collectionsOwned = requester.collectionsOwned.filter(c => c !== collectionId);
			requester.filesOwned = requester.filesOwned.filter(f => !collection.fileIds.includes(f));
		}
	}

	removeRequestsFromObject({ type: 'collection', input: collection, requestIds: [requestId] });
	removeRequestsFromObject({ type: 'account', input: requester, requestIds: [requestId] });
	removeRequestsFromObject({ type: 'account', input: sender, requestIds: [requestId] });

	if (!dryRun) {
		await setAccountStore(registry, context, senderAddress, sender);
		await setAccountStore(registry, context, requesterAddress, requester);
		await setCollectionStore(registry, context, collectionStore);
		await setFileStore(registry, context, fileStore);
		await setStatisticStore(registry, context, updatedStatisticStore);
	}
};

export class RespondToCollectionRequestCommand extends BaseCommand {
	private _tokenMethod!: TokenMethod;
	public schema = respondToCollectionRequestCommandPropsSchema;

	public init(args: { tokenMethod: TokenMethod }): void {
		this._tokenMethod = args.tokenMethod;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(
		context: CommandVerifyContext<RespondToCollectionRequestCommandProps>,
	): Promise<VerificationResult> {
		if (!isValidId(context.params.collectionId)) {
			throw new Error('Invalid collectionId id');
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
		context: CommandExecuteContext<RespondToCollectionRequestCommandProps>,
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
