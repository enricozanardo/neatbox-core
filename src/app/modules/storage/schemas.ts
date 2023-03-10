import { AccountSchema, Schema } from 'lisk-sdk';

export const dateTimeSchema = {
	type: 'object',
	required: ['unix', 'human'],
	properties: {
		unix: {
			fieldNumber: 1,
			dataType: 'uint32',
		},
		human: {
			fieldNumber: 2,
			dataType: 'string',
		},
	},
};

export const metaSchema = {
	type: 'object',
	required: ['createdAt', 'lastModified', 'expiration'],
	properties: {
		createdAt: {
			fieldNumber: 1,
			...dateTimeSchema,
		},
		lastModified: {
			fieldNumber: 2,
			...dateTimeSchema,
		},
		expiration: {
			fieldNumber: 3,
			...dateTimeSchema,
		},
		collection: {
			fieldNumber: 4,
			type: 'object',
			required: ['id', 'title'],
			properties: {
				id: {
					fieldNumber: 1,
					dataType: 'string',
				},
				title: {
					fieldNumber: 2,
					dataType: 'string',
				},
			},
		},
	},
};

export const fileSchema: Schema = {
	$id: 'neatbox/storage/fileSchema',
	type: 'object',
	required: ['meta', 'data'],
	properties: {
		meta: {
			fieldNumber: 1,
			...metaSchema,
		},
		data: {
			fieldNumber: 2,
			type: 'object',
			required: [
				'id',
				'title',
				'name',
				'size',
				'type',
				'checksum',
				'hash',
				'owner',
				'customFields',
				'transferFee',
				'accessPermissionFee',
				'requests',
				'history',
				'private',
			],
			properties: {
				id: {
					dataType: 'string',
					fieldNumber: 1,
				},
				title: {
					dataType: 'string',
					fieldNumber: 2,
				},
				name: {
					dataType: 'string',
					fieldNumber: 3,
				},
				size: {
					dataType: 'uint32',
					fieldNumber: 4,
				},
				type: {
					dataType: 'string',
					fieldNumber: 5,
				},
				checksum: {
					dataType: 'string',
					fieldNumber: 6,
				},
				hash: {
					dataType: 'string',
					fieldNumber: 7,
				},
				owner: {
					dataType: 'bytes',
					fieldNumber: 8,
				},
				customFields: {
					dataType: 'bytes',
					fieldNumber: 9,
				},
				transferFee: {
					dataType: 'uint32',
					fieldNumber: 10,
				},
				accessPermissionFee: {
					dataType: 'uint32',
					fieldNumber: 11,
				},
				requests: {
					fieldNumber: 12,
					type: 'array',
					items: {
						type: 'object',
						required: ['fileId', 'requestId', 'type', 'sender', 'recipient'],
						properties: {
							fileId: {
								dataType: 'string',
								fieldNumber: 1,
							},
							requestId: {
								dataType: 'string',
								fieldNumber: 2,
							},
							type: {
								dataType: 'string',
								fieldNumber: 3,
							},
							sender: {
								dataType: 'bytes',
								fieldNumber: 4,
							},
							recipient: {
								dataType: 'bytes',
								fieldNumber: 5,
							},
						},
					},
				},
				history: {
					fieldNumber: 13,
					type: 'array',
					items: {
						type: 'object',
						required: ['id', 'createdAt', 'activity', 'userAddress'],
						properties: {
							id: {
								dataType: 'string',
								fieldNumber: 1,
							},
							createdAt: {
								fieldNumber: 2,
								...dateTimeSchema,
							},
							activity: {
								dataType: 'string',
								fieldNumber: 3,
							},
							userAddress: {
								dataType: 'bytes',
								fieldNumber: 4,
							},
						},
					},
				},
				private: {
					dataType: 'boolean',
					fieldNumber: 14,
				},
			},
		},
	},
};

export const collectionSchema: Schema = {
	$id: 'neatbox/storage/collectionSchema',
	type: 'object',
	required: ['id', 'owner', 'fileIds', 'transferFee'],
	properties: {
		id: {
			dataType: 'string',
			fieldNumber: 1,
		},
		title: {
			dataType: 'string',
			fieldNumber: 2,
		},
		owner: {
			dataType: 'bytes',
			fieldNumber: 3,
		},
		fileIds: {
			type: 'array',
			items: {
				dataType: 'string',
			},
			fieldNumber: 4,
		},
		transferFee: {
			dataType: 'uint32',
			fieldNumber: 5,
		},
		requests: {
			fieldNumber: 6,
			type: 'array',
			items: {
				type: 'object',
				required: ['collectionId', 'requestId', 'sender', 'recipient'],
				properties: {
					collectionId: {
						fieldNumber: 1,
						dataType: 'string',
					},
					requestId: {
						fieldNumber: 2,
						dataType: 'string',
					},
					sender: {
						fieldNumber: 3,
						dataType: 'bytes',
					},
					recipient: {
						fieldNumber: 4,
						dataType: 'bytes',
					},
				},
			},
		},
	},
};

export const timedTransferSchema: Schema = {
	$id: 'neatbox/storage/timedTransferSchema',
	type: 'object',
	required: ['id', 'expiration', 'sender', 'recipientEmailHash'],
	properties: {
		id: {
			dataType: 'string',
			fieldNumber: 1,
		},
		expiration: {
			fieldNumber: 2,
			...dateTimeSchema,
		},
		sender: {
			fieldNumber: 3,
			dataType: 'bytes',
		},
		recipientEmailHash: {
			fieldNumber: 4,
			dataType: 'string',
		},
	},
};

export const accountMapSchema: Schema = {
	$id: 'neatbox/storage/accountMapSchema',
	type: 'object',
	required: ['binaryAddress', 'username', 'emailHash'],
	properties: {
		binaryAddress: {
			dataType: 'string',
			fieldNumber: 1,
		},
		username: {
			fieldNumber: 2,
			dataType: 'string',
		},
		emailHash: {
			fieldNumber: 3,
			dataType: 'string',
		},
	},
};

export const storageModuleSchema: Schema = {
	$id: 'neatbox/storage/moduleSchema',
	type: 'object',
	required: ['files', 'timedTransfers', 'transfers'],
	properties: {
		files: {
			fieldNumber: 1,
			type: 'array',
			items: fileSchema,
		},
		timedTransfers: {
			fieldNumber: 2,
			type: 'array',
			items: timedTransferSchema,
		},
		collections: {
			fieldNumber: 3,
			type: 'array',
			items: collectionSchema,
		},
		transfers: {
			fieldNumber: 4,
			dataType: 'uint32',
		},
		accountMap: {
			fieldNumber: 5,
			type: 'array',
			items: accountMapSchema,
		},
	},
};

export const storageModuleAccountSchema: AccountSchema = {
	type: 'object',
	properties: {
		filesOwned: {
			fieldNumber: 1,
			type: 'array',
			items: {
				dataType: 'string',
			},
		},
		filesAllowed: {
			fieldNumber: 2,
			type: 'array',
			items: {
				dataType: 'string',
			},
		},
		incomingFileRequests: {
			fieldNumber: 3,
			type: 'array',
			items: {
				type: 'object',
				required: ['fileId', 'requestId'],
				properties: {
					fileId: {
						fieldNumber: 1,
						dataType: 'string',
					},
					requestId: {
						fieldNumber: 2,
						dataType: 'string',
					},
				},
			},
		},
		outgoingFileRequests: {
			fieldNumber: 4,
			type: 'array',
			items: {
				type: 'object',
				required: ['fileId', 'requestId'],
				properties: {
					fileId: {
						fieldNumber: 1,
						dataType: 'string',
					},
					requestId: {
						fieldNumber: 2,
						dataType: 'string',
					},
				},
			},
		},
		collectionsOwned: {
			fieldNumber: 5,
			type: 'array',
			items: {
				dataType: 'string',
			},
		},
		collectionsAllowed: {
			fieldNumber: 6,
			type: 'array',
			items: {
				dataType: 'string',
			},
		},
		incomingCollectionRequests: {
			fieldNumber: 7,
			type: 'array',
			items: {
				type: 'object',
				required: ['collectionId', 'requestId'],
				properties: {
					collectionId: {
						fieldNumber: 1,
						dataType: 'string',
					},
					requestId: {
						fieldNumber: 2,
						dataType: 'string',
					},
				},
			},
		},
		outgoingCollectionRequests: {
			fieldNumber: 8,
			type: 'array',
			items: {
				type: 'object',
				required: ['collectionId', 'requestId'],
				properties: {
					collectionId: {
						fieldNumber: 1,
						dataType: 'string',
					},
					requestId: {
						fieldNumber: 2,
						dataType: 'string',
					},
				},
			},
		},
		map: {
			fieldNumber: 9,
			type: 'object',
			required: ['emailHash', 'username'],
			properties: {
				emailHash: {
					fieldNumber: 1,
					dataType: 'string',
				},
				username: {
					fieldNumber: 2,
					dataType: 'string',
				},
			},
		},
	},
	default: {
		filesOwned: [],
		filesAllowed: [],
		incomingFileRequests: [],
		outgoingFileRequests: [],
		collectionsOwned: [],
		collectionsAllowed: [],
		incomingCollectionRequests: [],
		outgoingCollectionRequests: [],
		map: '',
	},
};
