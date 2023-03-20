export interface DateTimeMetadata {
	unix: number;
	human: string;
}

export interface Meta {
	createdAt: DateTimeMetadata;
	lastModified: DateTimeMetadata;
	expiration: DateTimeMetadata;
	collection: {
		id: string;
		title: string;
	};
}

export type FileRequest = {
	fileId: string;
	requestId: string;
	type: FileRequestType;
	sender: Buffer;
	recipient: Buffer;
};

export type TimedTransferSummary = {
	id: string;
	expiration: DateTimeMetadata;
	sender: Buffer;
	recipientEmailHash: string;
};

export type FileData = {
	title: string;
	id: string;
	name: string;
	size: number;
	type: string;
	checksum: string;
	hash: string;
	owner: Buffer;
	customFields: Buffer;
	transferFee: number;
	accessPermissionFee: number;
	requests: FileRequest[];
	history: HistoryItem[];
	private: boolean;
};

export type File = {
	meta: Meta;
	data: FileData;
};

export type Collection = {
	id: string;
	title: string;
	owner: Buffer;
	fileIds: string[];
	transferFee: number;
	requests: CollectionRequest[];
};

export type CollectionRequest = {
	type: CollectionRequestType;
	collectionId: string;
	requestId: string;
	sender: Buffer;
	recipient: Buffer;
};

export enum CollectionRequestType {
	Ownership = 'OWNERSHIP',
	Transfer = 'TRANSFER',
}

export type StorageModuleChainData = {
	files: File[];
	timedTransfers: TimedTransferSummary[];
	collections: Collection[];
	transfers: number;
	accountMap: AccountMapEntry[]; // Is an array in the current version of SDK because it does not support object types (maps). Will be fixed in SDK v6.
};

export enum FileRequestType {
	Ownership = 'OWNERSHIP',
	AccessPermission = 'ACCESS_PERMISSION',
	Transfer = 'TRANSFER',
	TimedTransfer = 'TIMED_TRANSFER',
}

export type Account = StorageModuleAccountProps & {
	address: Buffer;
};

export type StorageModuleAccountProps = {
	storage: {
		filesOwned: string[];
		filesAllowed: string[];
		collectionsOwned: string[];
		collectionsAllowed: string[];
		incomingFileRequests: { fileId: string; requestId: string }[];
		outgoingFileRequests: { fileId: string; requestId: string }[];
		incomingCollectionRequests: { collectionId: string; requestId: string }[];
		outgoingCollectionRequests: { collectionId: string; requestId: string }[];
		map: {
			emailHash: string;
			username: string;
		};
	};
};

export type CreateFileAssetProps = Omit<FileData, 'owner' | 'id' | 'requests' | 'history'> & {
	transferFee: number;
	accessPermissionFee: number;
	private: boolean;
	timestamp: number;
};

export type RequestFileOwnershipAssetProps = {
	id: string;
	timestamp: number;
};

export type RequestFileAccessPermissionAssetProps = {
	id: string;
	timestamp: number;
};

export type RequestFileTransferAssetProps = {
	fileId: string;
	recipientAddress: Buffer;
	timestamp: number;
};

export type RespondToFileRequestAssetProps = {
	fileId: string;
	requestId: string;
	accept: boolean;
	newHash: string;
	timestamp: number;
};

export type TimedTransferAssetProps = Omit<FileData, 'owner' | 'id' | 'requests' | 'history'> & {
	transferFee: number;
	recipientEmailHash: string;
	timestamp: number;
};

export type UpdateFileAssetProps = {
	fileId: string;
	transferFee: number;
	accessPermissionFee: number;
	private: boolean;
	customFields: Buffer;
	timestamp: number;
};

export type CreateCollectionAssetProps = {
	title: string;
	transferFee: number;
	timestamp: number;
};

export type UpdateCollectionAssetProps = {
	collectionId: string;
	transferFee: number;
	fileIds: string[];
	timestamp: number;
};

export type RequestCollectionTransferAssetProps = {
	collectionId: string;
	recipientAddress: Buffer;
	timestamp: number;
};

export type RespondToCollectionRequestAssetProps = {
	collectionId: string;
	requestId: string;
	accept: boolean;
	updatedFileData: {
		fileId: string;
		newHash: string;
	}[];
	timestamp: number;
};

export type InitWalletAssetProps = {
	emailHash: string;
	username: string;
	timestamp: number;
};

export type CancelRequestAssetProps = {
	requestId: string;
	collectionId: string;
	fileId: string;
	timestamp: number;
};

export type StorageStatistics = {
	files: number;
	transfers: number;
};

export enum HistoryItemType {
	Registration = 'REGISTRATION',
	Transfer = 'TRANSFER',
	AccessPermission = 'ACCESS_PERMISSION',
	TimedTransferSubmission = 'TIMED_TRANSFER_SUBMISSION',
	TimedTransferResponse = 'TIMED_TRANSFER_RESPONSE',
	AddedToCollection = 'ADDED_TO_COLLECTION',
	RemovedFromCollection = 'REMOVED_FROM_COLLECTION',
	TransferredViaCollection = 'TRANSFERRED_VIA_COLLECTION',
}

export type HistoryItem = {
	id: string;
	createdAt: DateTimeMetadata;
	activity: HistoryItemType;
	userAddress: Buffer;
};

export type AccountMapEntry = {
	binaryAddress: string;
	emailHash: string;
	username: string;
};

export type RequestCollectionOwnershipAssetProps = {
	id: string;
	timestamp: number;
};

export type CustomField = {
	name: string;
	value: string;
};
