import { Schema } from 'lisk-sdk';

export const createFileAssetPropsSchema: Schema = {
	$id: 'neatbox/storage/createFileAssetPropsSchema',
	type: 'object',
	required: [
		'title',
		'name',
		'size',
		'type',
		'checksum',
		'hash',
		'customFields',
		'transferFee',
		'accessPermissionFee',
		'private',
		'timestamp',
	],
	properties: {
		title: {
			dataType: 'string',
			fieldNumber: 1,
		},
		name: {
			dataType: 'string',
			fieldNumber: 2,
		},
		size: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
		type: {
			dataType: 'string',
			fieldNumber: 4,
		},
		checksum: {
			dataType: 'string',
			fieldNumber: 5,
		},
		hash: {
			dataType: 'string',
			fieldNumber: 6,
		},
		customFields: {
			dataType: 'bytes',
			fieldNumber: 7,
		},
		transferFee: {
			dataType: 'uint32',
			fieldNumber: 8,
		},
		accessPermissionFee: {
			dataType: 'uint32',
			fieldNumber: 9,
		},
		private: {
			dataType: 'boolean',
			fieldNumber: 10,
		},
		timestamp: {
			dataType: 'uint32',
			fieldNumber: 11,
		},
	},
};

export const requestFileOwnershipAssetPropsSchema: Schema = {
	$id: 'neatbox/storage/requestFileOwnershipAssetPropsSchema',
	type: 'object',
	required: ['id', 'timestamp'],
	properties: {
		id: {
			dataType: 'string',
			fieldNumber: 1,
		},
		timestamp: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
	},
};

export const requestFileAccessPermissionAssetPropsSchema: Schema = {
	$id: 'neatbox/storage/requestFileAccessPermissionAssetPropsSchema',
	type: 'object',
	required: ['id', 'timestamp'],
	properties: {
		id: {
			dataType: 'string',
			fieldNumber: 1,
		},
		timestamp: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
	},
};

export const requestFileTransferAssetPropsSchema: Schema = {
	$id: 'neatbox/storage/requestFileTransferAssetPropsSchema',
	type: 'object',
	required: ['fileId', 'recipientAddress', 'timestamp'],
	properties: {
		fileId: {
			dataType: 'string',
			fieldNumber: 1,
		},
		recipientAddress: {
			dataType: 'bytes',
			fieldNumber: 2,
		},
		timestamp: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
	},
};

export const respondAssetPropsSchema: Schema = {
	$id: 'neatbox/storage/respondAssetPropsSchema',
	type: 'object',
	required: ['fileId', 'requestId', 'accept', 'newHash', 'timestamp'],
	properties: {
		fileId: {
			dataType: 'string',
			fieldNumber: 1,
		},
		requestId: {
			dataType: 'string',
			fieldNumber: 2,
		},
		accept: {
			dataType: 'boolean',
			fieldNumber: 3,
		},
		newHash: {
			dataType: 'string',
			fieldNumber: 4,
		},
		timestamp: {
			dataType: 'uint32',
			fieldNumber: 5,
		},
	},
};

export const timedTransferAssetPropsSchema: Schema = {
	$id: 'neatbox/storage/timedTransferAssetPropsSchema',
	type: 'object',
	required: [
		'title',
		'name',
		'size',
		'type',
		'checksum',
		'hash',
		'customFields',
		'transferFee',
		'recipientEmailHash',
		'timestamp',
	],
	properties: {
		title: {
			dataType: 'string',
			fieldNumber: 1,
		},
		name: {
			dataType: 'string',
			fieldNumber: 2,
		},
		size: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
		type: {
			dataType: 'string',
			fieldNumber: 4,
		},
		checksum: {
			dataType: 'string',
			fieldNumber: 5,
		},
		hash: {
			dataType: 'string',
			fieldNumber: 6,
		},
		customFields: {
			dataType: 'bytes',
			fieldNumber: 7,
		},
		transferFee: {
			dataType: 'uint32',
			fieldNumber: 8,
		},
		recipientEmailHash: {
			dataType: 'string',
			fieldNumber: 9,
		},
		timestamp: {
			dataType: 'uint32',
			fieldNumber: 10,
		},
	},
};

export const updateFileAssetPropsSchema: Schema = {
	$id: 'neatbox/storage/updateFileAssetPropsSchema',
	type: 'object',
	required: ['fileId', 'transferFee', 'accessPermissionFee', 'private', 'customFields', 'timestamp'],
	properties: {
		fileId: {
			dataType: 'string',
			fieldNumber: 1,
		},
		transferFee: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		accessPermissionFee: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
		private: {
			dataType: 'boolean',
			fieldNumber: 4,
		},
		customFields: {
			dataType: 'bytes',
			fieldNumber: 5,
		},
		timestamp: {
			dataType: 'uint32',
			fieldNumber: 6,
		},
	},
};

export const createCollectionAssetPropsSchema: Schema = {
	$id: 'neatbox/storage/createCollectionAssetPropsSchema',
	type: 'object',
	required: ['title', 'transferFee', 'timestamp'],
	properties: {
		title: {
			dataType: 'string',
			fieldNumber: 1,
		},
		transferFee: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		timestamp: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
	},
};

export const updateCollectionAssetPropsSchema: Schema = {
	$id: 'neatbox/storage/updateCollectionAssetPropsSchema',
	type: 'object',
	required: ['collectionId', 'fileIds', 'transferFee', 'timestamp'],
	properties: {
		collectionId: {
			dataType: 'string',
			fieldNumber: 1,
		},
		fileIds: {
			type: 'array',
			fieldNumber: 2,
			items: {
				dataType: 'string',
			},
		},
		transferFee: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
		timestamp: {
			dataType: 'uint32',
			fieldNumber: 4,
		},
	},
};

export const requestCollectionTransferAssetPropsSchema: Schema = {
	$id: 'neatbox/storage/requestCollectionTransferAssetPropsSchema',
	type: 'object',
	required: ['collectionId', 'recipientAddress', 'timestamp'],
	properties: {
		collectionId: {
			dataType: 'string',
			fieldNumber: 1,
		},
		recipientAddress: {
			dataType: 'bytes',
			fieldNumber: 2,
		},
		timestamp: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
	},
};

export const respondToCollectionRequestAssetPropsSchema: Schema = {
	$id: 'neatbox/storage/respondToCollectionRequestAssetPropsSchema',
	type: 'object',
	required: ['collectionId', 'requestId', 'accept', 'updatedFileData', 'timestamp'],
	properties: {
		collectionId: {
			dataType: 'string',
			fieldNumber: 1,
		},
		requestId: {
			dataType: 'string',
			fieldNumber: 2,
		},
		accept: {
			dataType: 'boolean',
			fieldNumber: 3,
		},
		updatedFileData: {
			fieldNumber: 4,
			type: 'array',
			items: {
				type: 'object',
				required: ['fileId', 'newHash'],
				properties: {
					fileId: {
						fieldNumber: 1,
						dataType: 'string',
					},
					newHash: {
						fieldNumber: 2,
						dataType: 'string',
					},
				},
			},
		},
		timestamp: {
			dataType: 'uint32',
			fieldNumber: 5,
		},
	},
};

export const initWalletAssetPropsSchema: Schema = {
	$id: 'neatbox/storage/initWalletPropsSchema',
	type: 'object',
	required: ['emailHash', 'username', 'timestamp'],
	properties: {
		emailHash: {
			dataType: 'string',
			fieldNumber: 1,
		},
		username: {
			dataType: 'string',
			fieldNumber: 2,
		},
		timestamp: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
	},
};

export const cancelRequestAssetPropsSchema: Schema = {
	$id: 'neatbox/storage/cancelRequestPropsSchema',
	type: 'object',
	required: ['requestId', 'collectionId', 'fileId', 'timestamp'],
	properties: {
		requestId: {
			dataType: 'string',
			fieldNumber: 1,
		},
		collectionId: {
			dataType: 'string',
			fieldNumber: 2,
		},
		fileId: {
			dataType: 'string',
			fieldNumber: 3,
		},
		timestamp: {
			dataType: 'uint32',
			fieldNumber: 4,
		},
	},
};
