/* eslint-disable no-param-reassign */
import { codec, cryptography, StateStore } from 'lisk-sdk';

import { STORAGE_MODULE_INIT, STORAGE_MODULE_KEY } from '../modules/storage/constants';
import { storageModuleSchema } from '../modules/storage/schemas';
import { Account, File, HistoryItemType, StorageModuleAccountProps, StorageModuleChainData } from '../modules/storage/types';
import { buffersAreEqual } from './validation';

export const getStorageModuleData = async (stateStore: StateStore): Promise<StorageModuleChainData> => {
	const stateStoreDataBuffer = await stateStore.chain.get(STORAGE_MODULE_KEY);

	return stateStoreDataBuffer
		? codec.decode<StorageModuleChainData>(storageModuleSchema, stateStoreDataBuffer)
		: STORAGE_MODULE_INIT;
};

export const setStorageModuleData = async (stateStore: StateStore, stateStoreData: StorageModuleChainData) => {
	await stateStore.chain.set(STORAGE_MODULE_KEY, codec.encode(storageModuleSchema, stateStoreData));
};

export const setAccountData = async (
	stateStore: StateStore,
	account: { address: Buffer } & StorageModuleAccountProps,
) => {
	await stateStore.account.set(account.address, account);
};

const cleanUpHelper = (account: Account, requestIds: string[], fileId: string) => {
	account.storage.filesAllowed = account.storage.filesAllowed.filter(f => f !== fileId);
	account.storage.incomingFileRequests = account.storage.incomingFileRequests.filter(
		r => !requestIds.includes(r.requestId),
	);
	account.storage.outgoingFileRequests = account.storage.outgoingFileRequests.filter(
		r => !requestIds.includes(r.requestId),
	);
};

export const cleanUpAccountData = async (stateStore: StateStore, file: File, accountA: Account, accountB?: Account) => {
	const requestIds = file.data.requests.map(r => r.requestId);

	const accountListFromHistory = file.data.history
		.filter(h => h.activity === HistoryItemType.AccessPermission)
		.map(h => h.userAddress);

	const accountListFromRequests = file.data.requests.map(r => r.sender);

	const added: string[] = [];
	const addressesToProcess: Buffer[] = [];
	[...accountListFromHistory, ...accountListFromRequests, file.data.owner].forEach(address => {
		const addressAsHex = cryptography.bufferToHex(address);

		if (added.includes(addressAsHex)) {
			return;
		}

		added.push(addressAsHex);
		addressesToProcess.push(address);
	});

	for (const address of addressesToProcess) {
		if (buffersAreEqual(address, accountA.address)) {
			cleanUpHelper(accountA, requestIds, file.data.id);
		} else if (accountB && buffersAreEqual(address, accountB.address)) {
			cleanUpHelper(accountB, requestIds, file.data.id);
		} else {
			const account = await stateStore.account.getOrDefault<StorageModuleAccountProps>(address);
			cleanUpHelper(account, requestIds, file.data.id);

			/** Account a & b are set in the transaction asset */
			await stateStore.account.set(account.address, account);
		}
	}
};
