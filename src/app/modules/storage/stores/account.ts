import { BaseStore, Schema } from 'lisk-sdk';
import { AccountStoreData } from '../../../../types';

export const accountStoreKey = Buffer.from('accountStore');

export const accountStoreSchema: Schema = {
	$id: 'neatbox/storage/account',
	type: 'object',
	properties: {
		username: {
			fieldNumber: 1,
			dataType: 'string',
		},
		emailHash: {
			fieldNumber: 2,
			dataType: 'string',
		},
		filesOwned: {
			fieldNumber: 3,
			type: 'array',
			items: {
				dataType: 'string',
			},
		},
		filesAllowed: {
			fieldNumber: 4,
			type: 'array',
			items: {
				dataType: 'string',
			},
		},
		incomingFileRequests: {
			fieldNumber: 5,
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
			fieldNumber: 6,
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
			fieldNumber: 7,
			type: 'array',
			items: {
				dataType: 'string',
			},
		},
		collectionsAllowed: {
			fieldNumber: 8,
			type: 'array',
			items: {
				dataType: 'string',
			},
		},
		incomingCollectionRequests: {
			fieldNumber: 9,
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
			fieldNumber: 10,
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
	},
};
export class AccountStore extends BaseStore<AccountStoreData> {
	public schema = accountStoreSchema;
}
