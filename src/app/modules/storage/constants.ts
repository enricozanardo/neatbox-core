import { StorageModuleChainData } from './types';

export const STORAGE_MODULE_KEY = 'neatbox:storageModule';

export const STORAGE_MODULE_INIT: StorageModuleChainData = {
	files: [],
	timedTransfers: [],
	collections: [],
	transfers: 0,
	accountMap: [], // Is an array in the current version of SDK because it does not support object types (maps). Will be fixed in SDK v6.
};

export const TX_FEES = {
	create: BigInt('10000000000'),
	timedTransfer: BigInt('2500000000'),
	createCollection: BigInt('5000000000'),
};

export const EXPIRATION = 604800; // 7 days in seconds

export const MAX_FILES_IN_COLLECTION = 10;
