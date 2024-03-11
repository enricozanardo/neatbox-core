/* eslint-disable no-param-reassign */

import {
	BlockAfterExecuteContext,
	CommandExecuteContext,
	CommandVerifyContext,
	ModuleEndpointContext,
	NamedRegistry,
	cryptography,
} from 'lisk-sdk';
import {
	AccountStoreData,
	Collection,
	HistoryItemType,
	MapStoreData,
	NeatboxFile,
} from '../../../../types';
import { buffersAreEqual } from '../../../../utils/validation';
import { AccountStore } from '../stores/account';
import { EmailMapStore } from '../stores/email_map';
import { UsernameMapStore } from '../stores/username_map';
import { CollectionStore, CollectionStoreData, collectionStoreKey } from '../stores/collections';
import { FileStore, FileStoreData, fileStoreKey } from '../stores/files';
import { StatisticStore, StatisticStoreData, statisticStoreKey } from '../stores/statistics';
import {
	TimedTransferStore,
	TimedTransferStoreData,
	timedTransferStoreKey,
} from '../stores/timedTransfers';

export type AllowedGetContext =
	| CommandExecuteContext<unknown>
	| CommandVerifyContext<unknown>
	| ModuleEndpointContext
	| BlockAfterExecuteContext;

export type AllowedSetContext = CommandExecuteContext<unknown> | BlockAfterExecuteContext;

export const getFileStore = async (registry: NamedRegistry, context: AllowedGetContext) => {
	const subStore = registry.get(FileStore);

	let fileStore: FileStoreData;

	try {
		fileStore = await subStore.get(context, fileStoreKey);
	} catch (err) {
		fileStore = {
			files: [],
		};
	}

	return fileStore;
};

export const setFileStore = async (
	registry: NamedRegistry,
	context: AllowedSetContext,
	data: FileStoreData,
) => {
	const subStore = registry.get(FileStore);
	await subStore.set(context, fileStoreKey, data);
};

export const getTimedTransferStore = async (
	registry: NamedRegistry,
	context: AllowedGetContext,
) => {
	const subStore = registry.get(TimedTransferStore);

	let store: TimedTransferStoreData;

	try {
		store = await subStore.get(context, timedTransferStoreKey);
	} catch (err) {
		store = {
			timedTransfers: [],
		};
	}

	return store;
};

export const setTimedTransferStore = async (
	registry: NamedRegistry,
	context: AllowedSetContext,
	data: TimedTransferStoreData,
) => {
	const subStore = registry.get(TimedTransferStore);
	await subStore.set(context, timedTransferStoreKey, data);
};

export const getCollectionStore = async (registry: NamedRegistry, context: AllowedGetContext) => {
	const subStore = registry.get(CollectionStore);

	let collectionStore: CollectionStoreData;

	try {
		collectionStore = await subStore.get(context, collectionStoreKey);
	} catch (err) {
		collectionStore = {
			collections: [],
		};
	}

	return collectionStore;
};

export const setCollectionStore = async (
	registry: NamedRegistry,
	context: AllowedSetContext,
	data: CollectionStoreData,
) => {
	const subStore = registry.get(CollectionStore);
	await subStore.set(context, collectionStoreKey, data);
};

export const getAccountStore = async (
	registry: NamedRegistry,
	context: AllowedGetContext,
	address: Buffer,
) => {
	const subStore = registry.get(AccountStore);

	let account: AccountStoreData | null;

	try {
		account = await subStore.get(context, address);
	} catch (err) {
		account = null;
	}

	return account;
};

export const setAccountStore = async (
	registry: NamedRegistry,
	context: AllowedSetContext,
	address: Buffer,
	data: AccountStoreData,
) => {
	const subStore = registry.get(AccountStore);
	await subStore.set(context, address, data);
};

export const getAllAccounts = async (registry: NamedRegistry, context: AllowedGetContext) => {
	const subStore = registry.get(AccountStore);

	const accounts = await subStore.iterate(context, {
		gte: Buffer.from([0]),
		lte: Buffer.from([255]),
	});

	return accounts;
};

export const getMapStore = async (
	registry: NamedRegistry,
	context: AllowedGetContext,
	type: 'emailHash' | 'username',
	key: Buffer,
) => {
	const subStore = registry.get(type === 'emailHash' ? EmailMapStore : UsernameMapStore);

	let mapStore: MapStoreData | null;

	try {
		mapStore = await subStore.get(context, key);
	} catch (err) {
		mapStore = null;
	}

	return mapStore;
};

export const setMapStore = async (
	registry: NamedRegistry,
	context: AllowedSetContext,
	type: 'emailHash' | 'username',
	key: Buffer,
	data: MapStoreData,
) => {
	const subStore = registry.get(type === 'emailHash' ? EmailMapStore : UsernameMapStore);

	await subStore.set(context, key, data);
};

export const getStatisticStore = async (registry: NamedRegistry, context: AllowedGetContext) => {
	const subStore = registry.get(StatisticStore);

	let statisticStore: StatisticStoreData;

	try {
		statisticStore = await subStore.get(context, statisticStoreKey);
	} catch (err) {
		statisticStore = {
			accounts: 0,
			collections: 0,
			files: 0,
			transfers: 0,
		};
	}

	return statisticStore;
};

export const setStatisticStore = async (
	registry: NamedRegistry,
	context: AllowedSetContext,
	data: StatisticStoreData,
) => {
	const subStore = registry.get(StatisticStore);
	await subStore.set(context, statisticStoreKey, data);
};

export const removeRequestsFromObject = ({
	type,
	input,
	requestIds,
}:
	| {
			type: 'account';
			input: AccountStoreData;
			requestIds: string[];
	  }
	| {
			type: 'file';
			input: NeatboxFile;
			requestIds: string[];
	  }
	| {
			type: 'collection';
			input: Collection;
			requestIds: string[];
	  }) => {
	if (type === 'account') {
		input.incomingFileRequests = input.incomingFileRequests.filter(
			req => !requestIds.includes(req.requestId),
		);
		input.outgoingFileRequests = input.outgoingFileRequests.filter(
			req => !requestIds.includes(req.requestId),
		);
		input.incomingCollectionRequests = input.incomingCollectionRequests.filter(
			req => !requestIds.includes(req.requestId),
		);
		input.outgoingCollectionRequests = input.outgoingCollectionRequests.filter(
			req => !requestIds.includes(req.requestId),
		);
	}

	if (type === 'file') {
		input.data.requests = input.data.requests.filter(req => !requestIds.includes(req.requestId));
	}

	if (type === 'collection') {
		input.requests = input.requests.filter(req => !requestIds.includes(req.requestId));
	}
};

const cleanUpHelper = (account: AccountStoreData, requestIds: string[], fileId: string) => {
	account.filesAllowed = account.filesAllowed.filter(f => f !== fileId);

	account.incomingFileRequests = account.incomingFileRequests.filter(
		r => !requestIds.includes(r.requestId),
	);
	account.outgoingFileRequests = account.outgoingFileRequests.filter(
		r => !requestIds.includes(r.requestId),
	);
};

/**
 *  Removes file access permission from accounts that were previously granted permission
 */
export const cleanUpOldAccountData = async (
	registry: NamedRegistry,
	context: AllowedSetContext,
	file: NeatboxFile,
	accountA: { data: AccountStoreData; address: Buffer },
	accountB?: { data: AccountStoreData; address: Buffer },
) => {
	const requestIds = file.data.requests.map(r => r.requestId);

	const accountListFromHistory = file.data.history
		.filter(h => h.activity === HistoryItemType.AccessPermission)
		.map(h => h.userAddress);

	const accountListFromRequests = file.data.requests.map(r => r.sender);

	const added: string[] = [];
	const addressesToProcess: Buffer[] = [];

	[...accountListFromHistory, ...accountListFromRequests, file.data.owner].forEach(address => {
		const addressAsHex = cryptography.address.getLisk32AddressFromAddress(address);

		if (added.includes(addressAsHex)) {
			return;
		}

		added.push(addressAsHex);
		addressesToProcess.push(address);
	});

	for (const address of addressesToProcess) {
		if (buffersAreEqual(address, accountA.address)) {
			cleanUpHelper(accountA.data, requestIds, file.data.id);
		} else if (accountB && buffersAreEqual(address, accountB.address)) {
			cleanUpHelper(accountB.data, requestIds, file.data.id);
		} else {
			const account = await getAccountStore(registry, context, address);

			if (account) {
				cleanUpHelper(account, requestIds, file.data.id);
				await setAccountStore(registry, context, address, account);
			}
		}
	}

	/** Account a & b are set in the transaction asset */
};
