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
import { FileRequestType } from '../../../../types';
import { bigLog } from '../../../../utils/helpers';
import { isValidTimestamp } from '../../../../utils/validation';
import {
	getAccountStore,
	getCollectionStore,
	getFileStore,
	removeRequestsFromObject,
	setAccountStore,
	setCollectionStore,
	setFileStore,
} from '../utils/store';

export type CancelRequestCommandProps = {
	requestId: string;
	collectionId: string;
	fileId: string;
	timestamp: number;
};

export const cancelRequestCommandPropsSchema: Schema = {
	$id: 'neatbox/storage/cancelRequestPropsSchema',
	type: 'object',
	required: ['requestId', 'collectionId', 'fileId', 'timestamp'],
	properties: {
		requestId: {
			dataType: 'string',
			fieldNumber: 1,
		},
		collectionId: {
			dataType: 'string',
			fieldNumber: 2,
		},
		fileId: {
			dataType: 'string',
			fieldNumber: 3,
		},
		timestamp: {
			dataType: 'uint32',
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
			context: CommandVerifyContext<CancelRequestCommandProps>;
	  }
	| {
			dryRun: false;
			registry: NamedRegistry;
			context: CommandExecuteContext<CancelRequestCommandProps>;
	  }) => {
	const { requestId, collectionId, fileId } = context.params;
	const { senderAddress } = context.transaction;

	const sender = await getAccountStore(registry, context, senderAddress);

	if (!sender) {
		throw new Error('Sender account not initialized.');
	}

	/** remove file request from both sender and recipient */
	if (fileId) {
		const fileStore = await getFileStore(registry, context);
		const file = fileStore.files.find(f => f.data.id === fileId);

		if (!file) {
			throw new Error(`File with id ${context.params.fileId} does not exist`);
		}

		const request = file.data.requests.find(req => req.requestId === requestId);

		if (!request) {
			throw new Error(`Request with id ${requestId} does not exist on file ${file.data.id}`);
		}

		const recipientAddress =
			request.type === FileRequestType.Transfer ? request.recipient : file.data.owner;
		const recipient = await getAccountStore(registry, context, recipientAddress);

		if (!recipient) {
			throw new Error('Recipient account not initialized.');
		}

		removeRequestsFromObject({ type: 'account', input: recipient, requestIds: [requestId] });
		removeRequestsFromObject({ type: 'account', input: sender, requestIds: [requestId] });
		removeRequestsFromObject({ type: 'file', input: file, requestIds: [requestId] });

		if (!dryRun) {
			await setAccountStore(registry, context, recipientAddress, recipient);
			await setFileStore(registry, context, fileStore);
		}
	}

	/** remove collection request from both sender and recipient */
	if (collectionId) {
		const collectionStore = await getCollectionStore(registry, context);

		const collection = collectionStore.collections.find(f => f.id === collectionId);

		if (!collection) {
			throw new Error(`Collection with id ${collectionId} does not exist`);
		}

		const request = collection.requests.find(req => req.requestId === requestId);

		if (!request) {
			throw new Error(`Request with id ${requestId} does not exist on collection ${collection.id}`);
		}

		const recipientAddress = request.recipient;
		const recipient = await getAccountStore(registry, context, recipientAddress);

		if (!recipient) {
			throw new Error('Recipient account not initialized.');
		}

		removeRequestsFromObject({ type: 'account', input: recipient, requestIds: [requestId] });
		removeRequestsFromObject({ type: 'account', input: sender, requestIds: [requestId] });
		removeRequestsFromObject({ type: 'collection', input: collection, requestIds: [requestId] });

		if (!dryRun) {
			await setAccountStore(registry, context, recipientAddress, recipient);
			await setCollectionStore(registry, context, collectionStore);
		}
	}

	if (!dryRun) {
		await setAccountStore(registry, context, senderAddress, sender);
	}
};

export class CancelRequestCommand extends BaseCommand {
	public schema = cancelRequestCommandPropsSchema;

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(
		context: CommandVerifyContext<CancelRequestCommandProps>,
	): Promise<VerificationResult> {
		if (!context.params.collectionId && !context.params.fileId) {
			throw new Error('No collectionId or fileId supplied');
		}

		if (context.params.collectionId && context.params.fileId) {
			throw new Error('Only collectionId OR fileId should be supplied');
		}

		if (!isValidTimestamp(context.params.timestamp)) {
			throw new Error('Invalid timestamp');
		}

		await executeTransaction({ registry: this.stores, context, dryRun: true });

		return { status: VerifyStatus.OK };
	}

	public async execute(context: CommandExecuteContext<CancelRequestCommandProps>): Promise<void> {
		try {
			await executeTransaction({ registry: this.stores, context, dryRun: false });
			bigLog(context.logger.info.bind(context.logger), 'Transaction successfully processed');
		} catch (err) {
			bigLog(context.logger.error.bind(context.logger), 'Transaction failed to process', err);
		}
	}
}
