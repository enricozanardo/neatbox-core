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
import { buffersAreEqual, isValidId, isValidTimestamp } from '../../../../utils/validation';
import { getAccountStore, getFileStore, setFileStore } from '../utils/store';
import { bigLog, updateMeta } from '../../../../utils/helpers';

export const updateFileCommandPropsSchema: Schema = {
	$id: 'neatbox/storage/updateFileCommandPropsSchema',
	type: 'object',
	required: [
		'fileId',
		'transferFee',
		'accessPermissionFee',
		'private',
		'customFields',
		'timestamp',
	],
	properties: {
		fileId: {
			dataType: 'string',
			fieldNumber: 1,
		},
		transferFee: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		accessPermissionFee: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
		private: {
			dataType: 'boolean',
			fieldNumber: 4,
		},
		customFields: {
			dataType: 'bytes',
			fieldNumber: 5,
		},
		timestamp: {
			dataType: 'uint32',
			fieldNumber: 6,
		},
	},
};
export type UpdateFileCommandProps = {
	fileId: string;
	transferFee: number;
	accessPermissionFee: number;
	private: boolean;
	customFields: Buffer;
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
			context: CommandVerifyContext<UpdateFileCommandProps>;
	  }
	| {
			dryRun: false;
			registry: NamedRegistry;
			context: CommandExecuteContext<UpdateFileCommandProps>;
	  }) => {
	const { senderAddress } = context.transaction;

	const fileStore = await getFileStore(registry, context);
	const sender = await getAccountStore(registry, context, senderAddress);

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

	if (file.data.requests.length > 0) {
		throw new Error(`Can not update file while there are pending requests`);
	}

	if (
		file.data.accessPermissionFee === context.params.accessPermissionFee &&
		file.data.transferFee === context.params.transferFee &&
		file.data.private === context.params.private &&
		buffersAreEqual(file.data.customFields, context.params.customFields)
	) {
		throw new Error(`No changes detected`);
	}

	// Update file
	file.data.transferFee = context.params.transferFee;
	file.data.accessPermissionFee = context.params.accessPermissionFee;
	file.data.private = context.params.private;
	file.data.customFields = context.params.customFields;
	file.meta = updateMeta(file.meta, context.params.timestamp);

	if (!dryRun) {
		await setFileStore(registry, context, fileStore);
	}
};

export class UpdateFileCommand extends BaseCommand {
	public schema = updateFileCommandPropsSchema;

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(
		context: CommandVerifyContext<UpdateFileCommandProps>,
	): Promise<VerificationResult> {
		if (!isValidId(context.params.fileId)) {
			throw new Error('Invalid file id');
		}

		if (!isValidTimestamp(context.params.timestamp)) {
			throw new Error('Invalid timestamp');
		}

		await executeTransaction({ registry: this.stores, context, dryRun: true });

		return { status: VerifyStatus.OK };
	}

	public async execute(context: CommandExecuteContext<UpdateFileCommandProps>): Promise<void> {
		try {
			await executeTransaction({ registry: this.stores, context, dryRun: false });
			bigLog(context.logger.info.bind(context.logger), 'Transaction successfully processed');
		} catch (err) {
			bigLog(context.logger.error.bind(context.logger), 'Transaction failed to process', err);
		}
	}
}
