/* eslint-disable class-methods-use-this */

import {
	BaseCommand,
	CommandVerifyContext,
	CommandExecuteContext,
	VerificationResult,
	VerifyStatus,
	Schema,
	NamedRegistry,
} from 'lisk-sdk';
import { isValidTimestamp } from '../../../../utils/validation';
import { TX_FEES } from '../constants';
import {
	getAccountStore,
	getCollectionStore,
	getStatisticStore,
	setAccountStore,
	setCollectionStore,
	setStatisticStore,
} from '../utils/store';
import { Collection } from '../../../../types';
import { bigLog } from '../../../../utils/helpers';

export type CreateCollectionCommandProps = {
	title: string;
	transferFee: number;
	timestamp: number;
	fileIds: string[];
};

export const createCollectionCommandPropsSchema: Schema = {
	$id: 'neatbox/storage/createCollectionCommandPropsSchema',
	type: 'object',
	required: ['title', 'transferFee', 'timestamp', 'fileIds'],
	properties: {
		title: {
			dataType: 'string',
			fieldNumber: 1,
		},
		transferFee: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		timestamp: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
		fileIds: {
			type: 'array',
			items: {
				dataType: 'string',
			},
			fieldNumber: 4,
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
	dryRun,
}:
	| {
			dryRun: true;
			registry: NamedRegistry;
			context: CommandVerifyContext<CreateCollectionCommandProps>;
	  }
	| {
			dryRun: false;
			registry: NamedRegistry;
			context: CommandExecuteContext<CreateCollectionCommandProps>;
	  }) => {
	const { title, transferFee, fileIds } = context.params;
	const { senderAddress } = context.transaction;

	const collectionStore = await getCollectionStore(registry, context);
	const sender = await getAccountStore(registry, context, senderAddress);
	const statisticStore = await getStatisticStore(registry, context);

	if (!sender) {
		throw new Error('Account not initialized.');
	}

	const collectionExists = !!collectionStore.collections.find(
		c => c.title === context.params.title,
	);

	if (collectionExists) {
		throw new Error('Collection already exist');
	}

	const id = context.transaction.id.toString('hex');

	const collection: Collection = {
		id,
		title,
		transferFee,
		fileIds,
		requests: [],
		owner: senderAddress,
	};

	collectionStore.collections.push(collection);

	sender.collectionsOwned.push(id);

	const updatedStatisticStore = {
		...statisticStore,
		collections: statisticStore.collections + 1,
	};

	if (!dryRun) {
		await setCollectionStore(registry, context, collectionStore);
		await setAccountStore(registry, context, senderAddress, sender);
		await setStatisticStore(registry, context, updatedStatisticStore);
	}
};

export class CreateCollectionCommand extends BaseCommand {
	public schema = createCollectionCommandPropsSchema;

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(
		context: CommandVerifyContext<CreateCollectionCommandProps>,
	): Promise<VerificationResult> {
		if (context.transaction.fee < TX_FEES.createCollection) {
			throw new Error(
				`Fee of ${context.transaction.fee} is too low (required: ${TX_FEES.createCollection})`,
			);
		}

		if (!isValidTimestamp(context.params.timestamp)) {
			throw new Error('Invalid timestamp');
		}

		await executeTransaction({ registry: this.stores, context, dryRun: true });

		return { status: VerifyStatus.OK };
	}

	public async execute(
		context: CommandExecuteContext<CreateCollectionCommandProps>,
	): Promise<void> {
		try {
			await executeTransaction({ registry: this.stores, context, dryRun: false });
			bigLog(context.logger.info.bind(context.logger), 'Transaction successfully processed');
		} catch (err) {
			bigLog(context.logger.error.bind(context.logger), 'Transaction failed to process', err);
		}
	}
}
