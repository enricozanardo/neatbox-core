/* eslint-disable class-methods-use-this */

import {
	BaseCommand,
	CommandExecuteContext,
	CommandVerifyContext,
	NamedRegistry,
	Schema,
	VerificationResult,
	VerifyStatus,
	cryptography,
} from 'lisk-sdk';
import { isValidSha256Hash, isValidTimestamp } from '../../../../utils/validation';
import { generateDefaultAccountData } from '../utils/helpers';
import {
	getAccountStore,
	getMapStore,
	getStatisticStore,
	getTimedTransferStore,
	setAccountStore,
	setMapStore,
	setStatisticStore,
} from '../utils/store';
import { bigLog } from '../../../../utils/helpers';
import { MapStoreData } from '../../../../types';

export const initializeAccountCommandPropsSchema: Schema = {
	$id: 'neatbox/storage/initWalletPropsSchema',
	type: 'object',
	required: ['emailHash', 'username', 'timestamp'],
	properties: {
		emailHash: {
			dataType: 'string',
			fieldNumber: 1,
		},
		username: {
			dataType: 'string',
			fieldNumber: 2,
		},
		timestamp: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
	},
};

export type InitializeAccountCommandProps = {
	emailHash: string;
	username: string;
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
			context: CommandVerifyContext<InitializeAccountCommandProps>;
	  }
	| {
			dryRun: false;
			registry: NamedRegistry;
			context: CommandExecuteContext<InitializeAccountCommandProps>;
	  }) => {
	const { senderAddress } = context.transaction;
	const { emailHash, username } = context.params;

	const sender = await getAccountStore(registry, context, senderAddress);
	const statisticStore = await getStatisticStore(registry, context);
	const timedTransferStore = await getTimedTransferStore(registry, context);

	if (sender) {
		throw new Error('Account is already initialized');
	}

	if (await getMapStore(registry, context, 'username', Buffer.from(username))) {
		throw new Error('Username is already registered');
	}

	if (!sender) {
		const newAccount = generateDefaultAccountData(username.toLocaleLowerCase(), emailHash);
		const mapByEmail = await getMapStore(registry, context, 'emailHash', Buffer.from(emailHash));

		if (mapByEmail && !mapByEmail?.username) {
			/** add any pending timed transfer requests to the account */
			timedTransferStore.timedTransfers.forEach(transfer => {
				if (transfer.recipientEmailHash === emailHash) {
					const accountRequest = {
						fileId: transfer.id,
						requestId: transfer.id,
					};

					newAccount.incomingFileRequests.push(accountRequest);
				}
			});
		}

		if (!dryRun) {
			await setAccountStore(registry, context, senderAddress, newAccount);
		}
	}

	const updatedStatisticStore = {
		...statisticStore,
		accounts: statisticStore.accounts + 1,
	};

	const mapStore: MapStoreData = {
		address: senderAddress,
		lsk32address: cryptography.address.getLisk32AddressFromAddress(senderAddress),
		emailHash,
		username,
	};

	if (!dryRun) {
		await setStatisticStore(registry, context, updatedStatisticStore);
		await setMapStore(registry, context, 'emailHash', Buffer.from(emailHash), mapStore);
		await setMapStore(registry, context, 'username', Buffer.from(username), mapStore);
	}
};

export class InitializeAccountCommand extends BaseCommand {
	public schema = initializeAccountCommandPropsSchema;

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(
		context: CommandVerifyContext<InitializeAccountCommandProps>,
	): Promise<VerificationResult> {
		if (!isValidSha256Hash(context.params.emailHash)) {
			throw new Error('Invalid hash');
		}

		if (!isValidTimestamp(context.params.timestamp)) {
			throw new Error('Invalid timestamp');
		}

		await executeTransaction({ registry: this.stores, context, dryRun: true });

		return { status: VerifyStatus.OK };
	}

	public async execute(
		context: CommandExecuteContext<InitializeAccountCommandProps>,
	): Promise<void> {
		try {
			await executeTransaction({ registry: this.stores, context, dryRun: false });
			bigLog(context.logger.info.bind(context.logger), 'Transaction successfully processed');
		} catch (err) {
			bigLog(context.logger.error.bind(context.logger), 'Transaction failed to process', err);
		}
	}
}
