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

import { HistoryItem, HistoryItemType, NeatboxFile, NeatboxFileData } from '../../../../types';
import { bigLog, createDateTime, createMeta } from '../../../../utils/helpers';
import { isValidChecksum, isValidHash, isValidTimestamp } from '../../../../utils/validation';
import { TX_FEES } from '../constants';
import {
	getAccountStore,
	getFileStore,
	getStatisticStore,
	setAccountStore,
	setFileStore,
	setStatisticStore,
} from '../utils/store';

export const createFileCommandPropsSchema: Schema = {
	$id: 'neatbox/storage/createFileCommandPropsSchema',
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
		'accessPermissionFee',
		'private',
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
	},
};

export type CreateFileCommandProps = Omit<
	NeatboxFileData,
	'owner' | 'id' | 'requests' | 'history'
> & {
	transferFee: number;
	accessPermissionFee: number;
	private: boolean;
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
			context: CommandVerifyContext<CreateFileCommandProps>;
	  }
	| {
			dryRun: false;
			registry: NamedRegistry;
			context: CommandExecuteContext<CreateFileCommandProps>;
	  }) => {
	const fileStore = await getFileStore(registry, context);
	const statisticStore = await getStatisticStore(registry, context);

	const { senderAddress } = context.transaction;
	const sender = await getAccountStore(registry, context, senderAddress);

	if (!sender) {
		throw new Error('Account not initialized.');
	}

	const fileExists = !!fileStore.files.find(
		f => f.data.checksum === context.params.checksum || f.data.hash === context.params.hash,
	);

	if (fileExists) {
		throw new Error('File already exist');
	}

	const historyItem: HistoryItem = {
		id: context.transaction.id.toString('hex'),
		createdAt: createDateTime(context.params.timestamp),
		activity: HistoryItemType.Registration,
		userAddress: senderAddress,
	};

	const file: NeatboxFile = {
		meta: createMeta(context.params.timestamp),
		data: {
			...context.params,
			id: context.transaction.id.toString('hex'),
			owner: senderAddress,
			requests: [],
			history: [historyItem],
		},
	};

	fileStore.files.push(file);
	sender.filesOwned.push(file.data.id);
	const updatedStatisticStore = {
		...statisticStore,
		files: statisticStore.files + 1,
	};

	if (!dryRun) {
		await setFileStore(registry, context, fileStore);
		await setAccountStore(registry, context, senderAddress, sender);
		await setStatisticStore(registry, context, updatedStatisticStore);
	}
};

export class CreateFileCommand extends BaseCommand {
	public schema = createFileCommandPropsSchema;

	public async verify(
		context: CommandVerifyContext<CreateFileCommandProps>,
	): Promise<VerificationResult> {
		if (!isValidChecksum(context.params.checksum)) {
			throw new Error('Invalid checksum');
		}

		if (!isValidHash(context.params.hash)) {
			throw new Error('Invalid hash');
		}

		if (context.transaction.fee < TX_FEES.createFile) {
			throw new Error(
				`Fee of ${context.transaction.fee} is too low (required: ${TX_FEES.createFile})`,
			);
		}

		if (!isValidTimestamp(context.params.timestamp)) {
			throw new Error('Invalid timestamp');
		}

		await executeTransaction({ registry: this.stores, context, dryRun: true });

		return { status: VerifyStatus.OK };
	}

	public async execute(context: CommandExecuteContext<CreateFileCommandProps>): Promise<void> {
		try {
			await executeTransaction({ registry: this.stores, context, dryRun: false });
			bigLog(context.logger.info.bind(context.logger), 'Transaction successfully processed');
		} catch (err) {
			bigLog(context.logger.error.bind(context.logger), 'Transaction failed to process', err);
		}
	}
}
