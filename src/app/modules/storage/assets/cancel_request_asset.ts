import { ApplyAssetContext, BaseAsset, ValidateAssetContext } from 'lisk-sdk';

import { getStorageModuleData, setStorageModuleData } from '../../../utils/store';
import { isValidTimestamp } from '../../../utils/validation';
import { cancelRequestAssetPropsSchema } from '../transaction_schemas';
import { CancelRequestAssetProps, FileRequestType, StorageModuleAccountProps } from '../types';

export class CancelRequestAsset extends BaseAsset {
	public name = 'cancelRequest';
	public id = 13;
	public schema = cancelRequestAssetPropsSchema;

	public validate({ asset }: ValidateAssetContext<CancelRequestAssetProps>): void {
		if (!asset.collectionId && !asset.fileId) {
			throw new Error('No collectionId or fileId supplied');
		}

		if (asset.collectionId && asset.fileId) {
			throw new Error('Only collectionId OR fileId should be supplied');
		}

		if (!isValidTimestamp(asset.timestamp)) {
			throw new Error('Invalid timestamp');
		}
	}

	public async apply({ asset, transaction, stateStore }: ApplyAssetContext<CancelRequestAssetProps>): Promise<void> {
		const stateStoreData = await getStorageModuleData(stateStore);
		const sender = await stateStore.account.getOrDefault<StorageModuleAccountProps>(transaction.senderAddress);

		const { fileId, collectionId } = asset;

		/** remove file request from both sender and recipient */
		if (fileId) {
			const file = stateStoreData.files.find(f => f.data.id === asset.fileId);
			if (!file) {
				throw new Error(`File with id ${asset.fileId} does not exist`);
			}

			const request = file.data.requests.find(req => req.requestId === asset.requestId);

			if (!request) {
				throw new Error(`Request with id ${asset.requestId} does not exist on file ${file.data.id}`);
			}

			const recipient = await stateStore.account.get<StorageModuleAccountProps>(
				request.type === FileRequestType.Transfer ? request.recipient : file.data.owner,
			);
			recipient.storage.incomingFileRequests = recipient.storage.incomingFileRequests.filter(
				req => req.requestId !== asset.requestId,
			);

			await stateStore.account.set(recipient.address, recipient);

			sender.storage.outgoingFileRequests = sender.storage.outgoingFileRequests.filter(
				req => req.requestId !== asset.requestId,
			);
			file.data.requests = file.data.requests.filter(req => req.requestId !== asset.requestId);
		}

		/** remove collection request from both sender and recipient */
		if (collectionId) {
			const collection = stateStoreData.collections.find(c => c.id === asset.collectionId);
			if (!collection) {
				throw new Error(`Collection with id ${asset.collectionId} does not exist`);
			}

			const request = collection.requests.find(req => req.requestId === asset.requestId);

			if (!request) {
				throw new Error(`Request with id ${asset.requestId} does not exist on collection ${collection.id}`);
			}

			const recipient = await stateStore.account.get<StorageModuleAccountProps>(request.recipient);
			recipient.storage.incomingCollectionRequests = sender.storage.incomingCollectionRequests.filter(
				req => req.requestId !== asset.requestId,
			);
			await stateStore.account.set(recipient.address, recipient);

			sender.storage.outgoingCollectionRequests = sender.storage.outgoingCollectionRequests.filter(
				req => req.requestId !== asset.requestId,
			);
			collection.requests = collection.requests.filter(req => req.requestId !== asset.requestId);
		}

		await stateStore.account.set(sender.address, sender);
		await setStorageModuleData(stateStore, stateStoreData);
	}
}
