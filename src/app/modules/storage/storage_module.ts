import { AfterBlockApplyContext, AfterGenesisBlockApplyContext, BaseModule, codec, cryptography } from 'lisk-sdk';

import { getCurrentTimestamp } from '../../utils/helpers';
import { getStorageModuleData, setStorageModuleData } from '../../utils/store';
import * as actionHandlers from './action_handlers';
import { CancelRequestAsset } from './assets/cancel_request_asset';
import { CreateCollectionAsset } from './assets/create_collection_asset';
import { CreateFileAsset } from './assets/create_file_asset';
import { InitWalletAsset } from './assets/init_wallet_asset';
import { RequestCollectionTransferAsset } from './assets/request_collection_transfer_asset';
import { RequestFileAccessPermissionAsset } from './assets/request_file_access_permission_asset';
import { RequestFileOwnershipAsset } from './assets/request_file_ownership_asset';
import { RequestFileTransferAsset } from './assets/request_file_transfer_asset';
import { RespondToCollectionRequestAsset } from './assets/respond_to_collection_request_asset';
import { RespondToFileRequestAsset } from './assets/respond_to_file_request_asset';
import { TimedTransferAsset } from './assets/timed_transfer_asset';
import { UpdateCollectionAsset } from './assets/update_collection_asset';
import { UpdateFileAsset } from './assets/update_file_asset';
import { STORAGE_MODULE_INIT, STORAGE_MODULE_KEY } from './constants';
import { storageModuleAccountSchema, storageModuleSchema } from './schemas';
import { StorageModuleAccountProps } from './types';

export class StorageModule extends BaseModule {
	public actions = {
		getFiles: async (params: Record<string, unknown>) => actionHandlers.getFiles(this._dataAccess, params),
		getFileById: async (params: Record<string, unknown>) => actionHandlers.getFileById(this._dataAccess, params),
		getFilesByIds: async (params: Record<string, unknown>) => actionHandlers.getFilesByIds(this._dataAccess, params),
		getCollections: async (params: Record<string, unknown>) => actionHandlers.getCollections(this._dataAccess, params),
		getCollectionById: async (params: Record<string, unknown>) =>
			actionHandlers.getCollectionById(this._dataAccess, params),
		getCollectionsByIds: async (params: Record<string, unknown>) =>
			actionHandlers.getCollectionsByIds(this._dataAccess, params),
		getStatistics: async (params: Record<string, unknown>) => actionHandlers.getStatistics(this._dataAccess, params),
		getAccountMapEntryByEmailHash: async (params: Record<string, unknown>) =>
			actionHandlers.getAccountMapEntryByEmailHash(this._dataAccess, params),
		getAccountMapEntryByUsername: async (params: Record<string, unknown>) =>
			actionHandlers.getAccountMapEntryByUsername(this._dataAccess, params),
	};

	public reducers = {};
	public name = 'storage';
	public transactionAssets = [
		new CreateFileAsset(),
		new RequestFileOwnershipAsset(),
		new RequestFileAccessPermissionAsset(),
		new RequestFileTransferAsset(),
		new RespondToFileRequestAsset(),
		new UpdateFileAsset(),
		new TimedTransferAsset(),
		new CreateCollectionAsset(),
		new UpdateCollectionAsset(),
		new RequestCollectionTransferAsset(),
		new RespondToCollectionRequestAsset(),
		new InitWalletAsset(),
		new CancelRequestAsset(),
	];
	public events = [];
	public id = 1000;
	public accountSchema = storageModuleAccountSchema;

	/** Clean up expired timed transfers */
	public async afterBlockApply({ stateStore }: AfterBlockApplyContext) {
		const stateStoreData = await getStorageModuleData(stateStore);

		const ts = getCurrentTimestamp();
		// const dataToBeRemoved = stateStoreData.timedTransfers;
		const dataToBeRemoved = stateStoreData.timedTransfers.filter(asset => asset.expiration.unix < ts);

		const cleanup = async () => {
			for (const timedTransfer of dataToBeRemoved) {
				this._logger.info(`Cleaning up timed transfer: ${timedTransfer.id}`);

				const sender = await stateStore.account.getOrDefault<StorageModuleAccountProps>(timedTransfer.sender);

				/** ugly method of cleaning up accounts due to eslint no-param-reassign rule */
				sender.storage.filesOwned = sender.storage.filesOwned.filter(fileId => fileId !== timedTransfer.id);
				sender.storage.filesAllowed = sender.storage.filesAllowed.filter(fileId => fileId !== timedTransfer.id);
				sender.storage.incomingFileRequests = sender.storage.incomingFileRequests.filter(
					req => req.fileId !== timedTransfer.id,
				);

				sender.storage.outgoingFileRequests = sender.storage.outgoingFileRequests.filter(
					req => req.fileId !== timedTransfer.id,
				);

				stateStoreData.timedTransfers = stateStoreData.timedTransfers.filter(t => t.id !== timedTransfer.id);
				stateStoreData.files = stateStoreData.files.filter(f => f.data.id !== timedTransfer.id);

				await stateStore.account.set(sender.address, sender);

				const map = stateStoreData.accountMap.find(a => a.emailHash === timedTransfer.recipientEmailHash);

				/** Timed transfer was collected by (new) recipient */
				if (map?.binaryAddress) {
					const recipient = await stateStore.account.getOrDefault<StorageModuleAccountProps>(
						cryptography.hexToBuffer(map.binaryAddress),
					);

					recipient.storage.filesOwned = recipient.storage.filesOwned.filter(fileId => fileId !== timedTransfer.id);
					recipient.storage.filesAllowed = recipient.storage.filesAllowed.filter(fileId => fileId !== timedTransfer.id);
					recipient.storage.incomingFileRequests = recipient.storage.incomingFileRequests.filter(
						req => req.fileId !== timedTransfer.id,
					);
					recipient.storage.outgoingFileRequests = recipient.storage.outgoingFileRequests.filter(
						req => req.fileId !== timedTransfer.id,
					);

					await stateStore.account.set(recipient.address, recipient);
				}
			}
		};

		if (dataToBeRemoved.length > 0) {
			await cleanup();
			await setStorageModuleData(stateStore, stateStoreData);
			this._logger.info('Cleanup complete :)');
		}
	}

	public async afterGenesisBlockApply(_input: AfterGenesisBlockApplyContext) {
		await _input.stateStore.chain.set(STORAGE_MODULE_KEY, codec.encode(storageModuleSchema, STORAGE_MODULE_INIT));
	}
}
