/* eslint-disable dot-notation */
import { BasePlugin, BasePluginEndpoint, PluginEndpointContext, cryptography } from 'lisk-sdk';
import { customFieldsMatches, stringMatches } from '../../../utils/helpers';
import { FileStoreData } from '../../modules/storage/stores/files';
import { StatisticStoreData } from '../../modules/storage/stores/statistics';
import { AccountStoreData, GetBalanceResult } from '../../../types';
import { CollectionStoreData } from '../../modules/storage/stores/collections';

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

const buildApiResponse = <T>(data: T) => ({ data });

export const cleanupMessySDKResponse = <T>(value: T) => {
	if (value === null || value === '{}') {
		return null;
	}

	if (typeof value === 'object' && Object.keys(value).length === 0) {
		return null;
	}

	return value;
};

export class Endpoint extends BasePluginEndpoint {
	private _api!: BasePlugin['apiClient'];

	public init(api: BasePlugin['apiClient']) {
		this._api = api;
	}

	public async getAggregatedAccount(context: PluginEndpointContext) {
		const { params, logger } = context;

		logger.debug('getAggregatedAccount query');

		if (!params) {
			throw new Error('Missing parameters.');
		}

		const { address } = params;

		if (typeof address !== 'string') {
			throw new Error("'address' must be a string.");
		}

		const rawData = await this._api.invoke<AccountStoreData>('storage_getAccount', { address });

		const data = cleanupMessySDKResponse(rawData);

		if (!data) {
			return buildApiResponse(null);
		}

		const balance = (
			await this._api.invoke<GetBalanceResult>('token_getBalance', {
				address,
				tokenID: '0199999900000000',
			})
		).availableBalance;

		const result: AccountStoreData & { address: Buffer; token: { balance: string } } = {
			...data,
			address: cryptography.address.getAddressFromLisk32Address(address),
			token: {
				balance: balance ?? '0',
			},
		};

		return buildApiResponse(result);
	}

	public async getEmailOrUsernameMap(context: PluginEndpointContext) {
		const { emailHash, username } = context.params;

		if (!emailHash && !username) {
			throw new Error('Email and / or username param is missing');
		}

		const rawData = await this._api.invoke<AccountStoreData>('storage_getEmailOrUsernameMap', {
			emailHash,
			username,
		});

		const data = cleanupMessySDKResponse(rawData);

		if (!data) {
			return buildApiResponse(null);
		}

		return buildApiResponse(data);
	}

	public async getFiles(context: PluginEndpointContext) {
		const { params, logger } = context;

		logger.debug('getFiles query');

		let filters: Filters | undefined;

		const { offset, limit } = setPaginationParams(params);

		if (params?.filters) {
			filters = params.filters as Filters;
		}

		const { files } = await this._api.invoke<FileStoreData>('storage_getFiles');

		/** Query filters */
		const filtered = files.filter(
			f =>
				!f.data.private &&
				(filters?.searchInput
					? stringMatches(f.data.title, filters.searchInput) ||
					  stringMatches(f.meta.collection.title, filters.searchInput) ||
					  customFieldsMatches(f.data.customFields, filters.searchInput)
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

		return buildApiResponse({
			files: limit === -1 ? filtered : filtered.slice(offset, offset + limit),
			total: filtered.length,
		});
	}

	public async getFileById(context: PluginEndpointContext) {
		const { params, logger } = context;

		logger.debug('getFileById query');

		if (!params) {
			throw new Error('Missing parameters.');
		}

		const { id } = params;

		if (typeof id !== 'string') {
			throw new Error("'id' must be a string.");
		}

		const { files } = await this._api.invoke<FileStoreData>('storage_getFiles');

		return buildApiResponse(files.find(f => f.data.id === id) ?? null);
	}

	public async getFilesByIds(context: PluginEndpointContext) {
		const { params, logger } = context;
		const { offset, limit } = setPaginationParams(params);

		logger.debug('getFilesByIds query');

		if (!params) {
			throw new Error('Missing parameters.');
		}

		const { ids } = params;

		if (!Array.isArray(ids)) {
			throw new Error("'ids' must be an array.");
		}

		const { files } = await this._api.invoke<FileStoreData>('storage_getFiles');
		const filtered = files.reverse().filter(f => ids.includes(f.data.id));

		return buildApiResponse({
			files: limit === -1 ? filtered : filtered.slice(offset, offset + limit),
			total: filtered.length,
		});
	}

	public async getFileByHash(context: PluginEndpointContext) {
		const { params, logger } = context;

		logger.debug('getFileByHash query');

		if (!params) {
			throw new Error('Missing parameters.');
		}

		const { hash } = params;

		if (typeof hash !== 'string') {
			throw new Error("'hash' must be a string.");
		}

		const { files } = await this._api.invoke<FileStoreData>('storage_getFiles');

		return buildApiResponse(files.find(f => f.data.hash === hash) ?? null);
	}

	public async getFileByChecksum(context: PluginEndpointContext) {
		const { params, logger } = context;

		logger.debug('getFileByChecksum query');

		if (!params) {
			throw new Error('Missing parameters.');
		}

		const { checksum } = params;

		if (typeof checksum !== 'string') {
			throw new Error("'checksum' must be a string.");
		}

		const { files } = await this._api.invoke<FileStoreData>('storage_getFiles');

		return buildApiResponse(files.find(f => f.data.checksum === checksum) ?? null);
	}

	public async getCollectionById(context: PluginEndpointContext) {
		const { params, logger } = context;

		logger.debug('getCollectionById query');

		if (!params) {
			throw new Error('Missing parameters.');
		}

		const { id } = params;

		if (typeof id !== 'string') {
			throw new Error("'id' must be a string.");
		}

		const { collections } = await this._api.invoke<CollectionStoreData>('storage_getCollections');

		return buildApiResponse(collections.find(c => c.id === id) ?? null);
	}

	public async getCollectionsByIds(context: PluginEndpointContext) {
		const { params, logger } = context;
		const { offset, limit } = setPaginationParams(params);

		logger.debug('getCollectionsByIds query');

		if (!params) {
			throw new Error('Missing parameters.');
		}

		const { ids } = params;

		if (!Array.isArray(ids)) {
			throw new Error("'ids' must be an array.");
		}

		const { collections } = await this._api.invoke<CollectionStoreData>('storage_getCollections');
		const filtered = collections.reverse().filter(c => ids.includes(c.id));

		return buildApiResponse({
			collections: limit === -1 ? filtered : filtered.slice(offset, offset + limit),
			total: filtered.length,
		});
	}

	public async getStatistics(context: PluginEndpointContext) {
		const { logger } = context;

		logger.debug('getStatistics query');

		const data = await this._api.invoke<StatisticStoreData>('storage_getStatistics');

		return buildApiResponse(data);
	}
}
