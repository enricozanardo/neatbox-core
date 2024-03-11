import { JSONObject } from 'lisk-sdk';

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

export type NeatboxFileData = {
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

export type NeatboxFile = {
	meta: Meta;
	data: NeatboxFileData;
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

export enum FileRequestType {
	Ownership = 'OWNERSHIP',
	AccessPermission = 'ACCESS_PERMISSION',
	Transfer = 'TRANSFER',
	TimedTransfer = 'TIMED_TRANSFER',
}

export type AccountStoreData = {
	filesOwned: string[];
	filesAllowed: string[];
	collectionsOwned: string[];
	collectionsAllowed: string[];
	incomingFileRequests: { fileId: string; requestId: string }[];
	outgoingFileRequests: { fileId: string; requestId: string }[];
	incomingCollectionRequests: { collectionId: string; requestId: string }[];
	outgoingCollectionRequests: { collectionId: string; requestId: string }[];
	emailHash: string;
	username: string;
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

export type CustomField = {
	name: string;
	value: string;
};

export type GetBalanceResult = {
	availableBalance: string;
	lockedBalances: unknown[];
};

export type MapStoreData = {
	address: Buffer;
	lsk32address: string;
	username: string;
	emailHash: string;
};

export type StorageModuleConfig = {
	expiration: number;
};

export type StorageModuleConfigJSON = JSONObject<StorageModuleConfig>;
