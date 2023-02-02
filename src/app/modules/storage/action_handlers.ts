import { BaseModuleDataAccess, codec } from 'lisk-sdk';

import { isValidSha256Hash } from '../../utils/validation';
import { STORAGE_MODULE_INIT, STORAGE_MODULE_KEY } from './constants';
import { storageModuleSchema } from './schemas';
import { StorageModuleChainData } from './types';

const getChainState = async (dataAccess: BaseModuleDataAccess) => {
	const buffer = await dataAccess.getChainState(STORAGE_MODULE_KEY);
	return buffer ? codec.decode<StorageModuleChainData>(storageModuleSchema, buffer) : STORAGE_MODULE_INIT;
};

export const getFiles = async (dataAccess: BaseModuleDataAccess, _: Record<string, unknown>): Promise<unknown> => {
	const chainState = await getChainState(dataAccess);
	return chainState.files;
};

export const getFileById = async (
	dataAccess: BaseModuleDataAccess,
	params: Record<string, unknown>,
): Promise<unknown> => {
	const { id } = params;

	if (typeof id !== 'string') {
		throw new Error("'id' must be a string.");
	}

	const chainState = await getChainState(dataAccess);
	return chainState.files.find(f => f.data.id === id);
};

export const getFilesByIds = async (
	dataAccess: BaseModuleDataAccess,
	params: Record<string, unknown>,
): Promise<unknown> => {
	const { ids } = params;

	if (!Array.isArray(ids)) {
		throw new Error("'ids' must be an array.");
	}

	const chainState = await getChainState(dataAccess);
	return chainState.files.filter(f => ids.includes(f.data.id));
};

export const getCollections = async (
	dataAccess: BaseModuleDataAccess,
	_: Record<string, unknown>,
): Promise<unknown> => {
	const chainState = await getChainState(dataAccess);
	return chainState.collections;
};

export const getCollectionById = async (
	dataAccess: BaseModuleDataAccess,
	params: Record<string, unknown>,
): Promise<unknown> => {
	const { id } = params;

	if (typeof id !== 'string') {
		throw new Error("'id' must be a string.");
	}

	const chainState = await getChainState(dataAccess);
	return chainState.collections.find(c => c.id === id);
};

export const getCollectionsByIds = async (
	dataAccess: BaseModuleDataAccess,
	params: Record<string, unknown>,
): Promise<unknown> => {
	const { ids } = params;

	if (!Array.isArray(ids)) {
		throw new Error("'ids' must be an array.");
	}

	const chainState = await getChainState(dataAccess);
	return chainState.collections.filter(c => ids.includes(c.id));
};

export const getStatistics = async (dataAccess: BaseModuleDataAccess, _: Record<string, unknown>): Promise<unknown> => {
	const chainState = await getChainState(dataAccess);
	return { files: chainState.files.length, transfers: chainState.transfers };
};

export const getAccountMapEntry = async (
	dataAccess: BaseModuleDataAccess,
	params: Record<string, unknown>,
): Promise<unknown> => {
	const { emailHash } = params;

	if (!isValidSha256Hash(emailHash)) {
		throw new Error("Invalid field 'emailHash");
	}
	const chainState = await getChainState(dataAccess);

	return chainState.accountMap.find(a => a.emailHash === emailHash);
};
