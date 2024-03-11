/* eslint-disable class-methods-use-this */

import {
	BaseCommand,
	CommandExecuteContext,
	CommandVerifyContext,
	NamedRegistry,
	Schema,
	VerificationResult,
	VerifyStatus,
} from 'lisk-sdk';
import { HistoryItem, HistoryItemType } from '../../../../types';
import { bigLog, createDateTime, updateMeta } from '../../../../utils/helpers';
import {
	arrayHasDuplicates,
	buffersAreEqual,
	isValidTimestamp,
} from '../../../../utils/validation';
import { MAX_FILES_IN_COLLECTION } from '../constants';
import {
	getAccountStore,
	getCollectionStore,
	getFileStore,
	removeRequestsFromObject,
	setAccountStore,
	setCollectionStore,
	setFileStore,
} from '../utils/store';

export const updateCollectionCommandPropsSchema: Schema = {
	$id: 'neatbox/storage/updateCollectionCommandPropsSchema',
	type: 'object',
	required: ['collectionId', 'fileIds', 'transferFee', 'timestamp'],
	properties: {
		collectionId: {
			dataType: 'string',
			fieldNumber: 1,
		},
		fileIds: {
			type: 'array',
			fieldNumber: 2,
			items: {
				dataType: 'string',
			},
		},
		transferFee: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
		timestamp: {
			dataType: 'uint32',
			fieldNumber: 4,
		},
	},
};

export type UpdateCollectionCommandProps = {
	collectionId: string;
	transferFee: number;
	fileIds: string[];
	timestamp: number;
};

/**
 * Allows for truly-dry running a transaction, avoiding failed (but accepted) transactions (introduced in SDKv6),
 * which are a nightmare to work with in a frontend
 */
const executeTransaction = async ({
	registry,
	context,
	dryRun,
}:
	| {
			dryRun: true;
			registry: NamedRegistry;
			context: CommandVerifyContext<UpdateCollectionCommandProps>;
	  }
	| {
			dryRun: false;
			registry: NamedRegistry;
			context: CommandExecuteContext<UpdateCollectionCommandProps>;
	  }) => {
	const { transferFee, fileIds, collectionId, timestamp } = context.params;
	const { senderAddress } = context.transaction;

	const collectionStore = await getCollectionStore(registry, context);
	const sender = await getAccountStore(registry, context, senderAddress);

	if (!sender) {
		throw new Error('Account not initialized.');
	}

	const collection = collectionStore.collections.find(f => f.id === collectionId);

	if (!collection) {
		throw new Error(`Collection with id ${collectionId} does not exist`);
	}

	if (!buffersAreEqual(collection.owner, senderAddress)) {
		throw new Error(`Sender is not owner of file`);
	}

	const accountsToUpdate: Buffer[] = [];
	const fileStore = await getFileStore(registry, context);
	const pendingFileRequestIds: string[] = [];

	/** Add collection id to files */
	fileIds
		.filter(fileId => !collection.fileIds.includes(fileId)) // filter out files already in collection
		.forEach(assetId => {
			const file = fileStore.files.find(f => f.data.id === assetId);
			if (!file) {
				throw new Error(`File with id ${assetId} does not exist`);
			}

			const historyItem: HistoryItem = {
				id: context.transaction.id.toString('hex'),
				createdAt: createDateTime(timestamp),
				activity: HistoryItemType.AddedToCollection,
				userAddress: senderAddress,
			};

			file.data.history.push(historyItem);
			file.meta.collection.id = collection.id;
			file.meta.collection.title = collection.title;
			file.meta = updateMeta(file.meta, timestamp);

			pendingFileRequestIds.push(...file.data.requests.map(req => req.requestId));
			file.data.requests = [];

			const allowedAccounts = file.data.history
				.filter(
					h =>
						h.activity === HistoryItemType.AccessPermission &&
						!buffersAreEqual(h.userAddress, senderAddress),
				)
				.map(h => h.userAddress);

			accountsToUpdate.push(...allowedAccounts);
		});

	/** Remove collectionId from files not part of collection any more  */
	collection.fileIds
		.filter(id => !fileIds.includes(id))
		.forEach(id => {
			const file = fileStore.files.find(f => f.data.id === id);
			if (!file) {
				throw new Error(`File with id ${id} does not exist`);
			}

			const historyItem: HistoryItem = {
				id: context.transaction.id.toString('hex'),
				createdAt: createDateTime(timestamp),
				activity: HistoryItemType.RemovedFromCollection,
				userAddress: senderAddress,
			};

			file.data.history.push(historyItem);
			file.meta.collection.id = '';
			file.meta.collection.title = '';
			file.meta = updateMeta(file.meta, timestamp);
		});

	/** Update accounts that previously had access to file */
	for (const address of accountsToUpdate) {
		const allowedAccount = await getAccountStore(registry, context, address);

		if (allowedAccount) {
			allowedAccount.filesAllowed = allowedAccount.filesAllowed.filter(f => !fileIds.includes(f));

			/** Remove redundant open requests from account */
			removeRequestsFromObject({
				type: 'account',
				input: allowedAccount,
				requestIds: pendingFileRequestIds,
			});

			if (!dryRun) {
				await setAccountStore(registry, context, address, allowedAccount);
			}
		}
	}

	/** Finally, update collection object itself */
	collection.transferFee = transferFee;
	collection.fileIds = fileIds;

	/** Remove redundant open requests from sender */
	removeRequestsFromObject({
		type: 'account',
		input: sender,
		requestIds: pendingFileRequestIds,
	});

	if (!dryRun) {
		await setAccountStore(registry, context, senderAddress, sender);
		await setFileStore(registry, context, fileStore);
		await setCollectionStore(registry, context, collectionStore);
	}
};

export class UpdateCollectionCommand extends BaseCommand {
	public schema = updateCollectionCommandPropsSchema;

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(
		context: CommandVerifyContext<UpdateCollectionCommandProps>,
	): Promise<VerificationResult> {
		if (context.params.fileIds.length > MAX_FILES_IN_COLLECTION) {
			throw new Error(`Num of files exceed maximum amount of ${MAX_FILES_IN_COLLECTION}`);
		}

		if (arrayHasDuplicates(context.params.fileIds)) {
			throw new Error(`'fileIds' array contains duplicates`);
		}

		if (!isValidTimestamp(context.params.timestamp)) {
			throw new Error('Invalid timestamp');
		}

		await executeTransaction({ registry: this.stores, context, dryRun: true });

		return { status: VerifyStatus.OK };
	}

	public async execute(
		context: CommandExecuteContext<UpdateCollectionCommandProps>,
	): Promise<void> {
		try {
			await executeTransaction({ registry: this.stores, context, dryRun: false });
			bigLog(context.logger.info.bind(context.logger), 'Transaction successfully processed');
		} catch (err) {
			bigLog(context.logger.error.bind(context.logger), 'Transaction failed to process', err);
		}
	}
}
