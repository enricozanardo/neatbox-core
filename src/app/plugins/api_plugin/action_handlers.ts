import { BaseChannel } from 'lisk-sdk';

import { AccountMapEntry, Collection, File, StorageStatistics } from '../../modules/storage/types';
import { stringMatches } from '../../utils/helpers';
import { isValidSha256Hash } from '../../utils/validation';

const LIMIT = 10;

type Filters = {
	searchInput?: string;
	mimeType?: string;
	sortType?: string;
	isUpdated?: boolean;
};

const setPaginationParams = (params?: { limit?: number; offset?: number }) => {
	let offset = 0;
	let limit = LIMIT;

	if (typeof params?.offset === 'number') {
		offset = params.offset;
	}

	if (typeof params?.limit === 'number') {
		limit = params.limit;
	}

	return { offset, limit };
};

export const getFiles = async (channel: BaseChannel, params?: Record<string, unknown>) => {
	let filters: Filters | undefined;

	const { offset, limit } = setPaginationParams(params);

	if (params?.filters) {
		filters = params.filters as Filters;
	}

	const files = await channel.invoke<File[]>('storage:getFiles');

	/** Query filters */
	const filtered = files.filter(
		f =>
			!f.data.private &&
			(filters?.searchInput
				? stringMatches(f.data.title, filters.searchInput) ||
				  stringMatches(f.meta.collection.title, filters.searchInput)
				: true) &&
			(filters?.mimeType ? stringMatches(f.data.type, filters.mimeType) : true) &&
			(filters?.isUpdated ? f.meta.createdAt.unix !== f.meta.lastModified.unix : true),
	);

	/** Query sorting */
	if (filters?.sortType) {
		const [type, order] = filters.sortType.split(':');

		if (type === 'date') {
			filtered.sort((inputA, inputB) => {
				const a = order === 'asc' ? inputA : inputB;
				const b = order === 'asc' ? inputB : inputA;
				return a.meta.createdAt.unix - b.meta.createdAt.unix;
			});
		}

		if (type === 'size') {
			filtered.sort((inputA, inputB) => {
				const a = order === 'asc' ? inputA : inputB;
				const b = order === 'asc' ? inputB : inputA;
				return a.data.size - b.data.size;
			});
		}
	} else {
		filtered.sort((a, b) => b.meta.createdAt.unix - a.meta.createdAt.unix);
	}

	return { files: limit === -1 ? filtered : filtered.slice(offset, offset + limit), total: filtered.length };
};

export const getFileById = async (channel: BaseChannel, params?: Record<string, unknown>): Promise<unknown> => {
	if (!params) {
		throw new Error('Missing parameters.');
	}

	const { id } = params;

	if (typeof id !== 'string') {
		throw new Error("'id' must be a string.");
	}

	const files = await channel.invoke<File[]>('storage:getFiles');

	return files.find(f => f.data.id === id) ?? null;
};

export const getFilesByIds = async (channel: BaseChannel, params?: Record<string, unknown>) => {
	const { offset, limit } = setPaginationParams(params);

	if (!params) {
		throw new Error('Missing parameters.');
	}

	const { ids } = params;

	if (!Array.isArray(ids)) {
		throw new Error("'ids' must be an array.");
	}

	const files = await channel.invoke<File[]>('storage:getFiles');
	const filtered = files.reverse().filter(f => ids.includes(f.data.id));

	return { files: limit === -1 ? filtered : filtered.slice(offset, offset + limit), total: filtered.length };
};

export const getFileByHash = async (channel: BaseChannel, params?: Record<string, unknown>): Promise<unknown> => {
	if (!params) {
		throw new Error('Missing parameters.');
	}

	const { hash } = params;

	if (typeof hash !== 'string') {
		throw new Error("'hash' must be a string.");
	}

	const files = await channel.invoke<File[]>('storage:getFiles');
	return files.find(f => f.data.hash === hash) ?? null;
};

export const getFilesByHashes = async (channel: BaseChannel, params?: Record<string, unknown>): Promise<unknown> => {
	const { offset, limit } = setPaginationParams(params);

	if (!params) {
		throw new Error('Missing parameters.');
	}

	const { hashes } = params;

	if (!Array.isArray(hashes)) {
		throw new Error("'hashes' must be an array.");
	}

	const files = await channel.invoke<File[]>('storage:getFiles');
	const filtered = files.reverse().filter(f => hashes.includes(f.data.hash));

	return { files: limit === -1 ? filtered : filtered.slice(offset, offset + limit), total: filtered.length };
};

export const getFileByChecksum = async (channel: BaseChannel, params?: Record<string, unknown>): Promise<unknown> => {
	if (!params) {
		throw new Error('Missing parameters.');
	}

	const { checksum } = params;

	if (typeof checksum !== 'string') {
		throw new Error("'checksum' must be a string.");
	}

	const files = await channel.invoke<File[]>('storage:getFiles');
	return files.find(f => f.data.checksum === checksum) ?? null;
};

export const getStatistics = async (channel: BaseChannel) => {
	const data = await channel.invoke<StorageStatistics>('storage:getStatistics');
	return data;
};

export const getCollections = async (channel: BaseChannel, params?: Record<string, unknown>) => {
	const { offset, limit } = setPaginationParams(params);

	const collections = await channel.invoke<Collection[]>('storage:getCollections');
	collections.reverse();

	return {
		collections: limit === -1 ? collections : collections.slice(offset, offset + limit),
		total: collections.length,
	};
};

export const getCollectionById = async (channel: BaseChannel, params?: Record<string, unknown>): Promise<unknown> => {
	if (!params) {
		throw new Error('Missing parameters.');
	}

	const { id } = params;

	if (typeof id !== 'string') {
		throw new Error("'id' must be a string.");
	}

	const collections = await channel.invoke<Collection[]>('storage:getCollections');

	return collections.find(c => c.id === id) ?? null;
};

export const getCollectionsByIds = async (channel: BaseChannel, params?: Record<string, unknown>) => {
	const { offset, limit } = setPaginationParams(params);

	if (!params) {
		throw new Error('Missing parameters.');
	}

	const { ids } = params;

	if (!Array.isArray(ids)) {
		throw new Error("'ids' must be an array.");
	}

	const collections = await channel.invoke<Collection[]>('storage:getCollections');
	const filtered = collections.reverse().filter(c => ids.includes(c.id));

	filtered.reverse();

	return {
		collections: limit === -1 ? filtered : filtered.slice(offset, offset + limit),
		total: filtered.length,
	};
};

export const getAccountMapEntryByEmailHash = async (
	channel: BaseChannel,
	params?: Record<string, unknown>,
): Promise<AccountMapEntry> => {
	if (!params || !isValidSha256Hash(params?.emailHash)) {
		throw new Error("Invalid field 'emailHash");
	}

	const accountMapEntry = await channel.invoke<AccountMapEntry>('storage:getAccountMapEntryByEmailHash', {
		emailHash: params.emailHash,
	});

	return accountMapEntry ?? null;
};

export const getAccountMapEntryByUsername = async (
	channel: BaseChannel,
	params?: Record<string, unknown>,
): Promise<AccountMapEntry> => {
	if (!params || !isValidSha256Hash(params?.username)) {
		throw new Error("Invalid field 'username");
	}

	const accountMapEntry = await channel.invoke<AccountMapEntry>('storage:getAccountMapEntryByUsername', {
		username: params.username,
	});

	return accountMapEntry ?? null;
};

export const accountExists = async (channel: BaseChannel, params?: Record<string, unknown>) => {
	if (!params) {
		throw new Error('No params supplied');
	}

	const { username, emailHash } = params;

	/** Input validation */
	if (!isValidSha256Hash(emailHash)) {
		throw new Error("Invalid field 'emailHash");
	}

	if (typeof username !== 'string') {
		throw new Error("Invalid field 'username'");
	}

	/** check for account presence */
	const emailHashExists = await channel.invoke<AccountMapEntry>('storage:getAccountMapEntryByEmailHash', {
		emailHash,
	});

	if (emailHashExists) {
		return true;
	}

	const usernameExists = await channel.invoke<AccountMapEntry>('storage:getAccountMapEntryByUsername', {
		username,
	});

	if (usernameExists) {
		return true;
	}

	return false;
};
