import { BaseStore, Schema } from 'lisk-sdk';

import { Collection } from '../../../../types';
import { collectionSchema } from '../schemas';

export const collectionStoreKey = Buffer.from('collectionStore');

export type CollectionStoreData = {
	collections: Collection[];
};

export const collectionStoreSchema: Schema = {
	$id: 'neatbox/storage/collections',
	type: 'object',
	required: ['collections'],
	properties: {
		collections: {
			fieldNumber: 1,
			type: 'array',
			items: collectionSchema,
		},
	},
};
export class CollectionStore extends BaseStore<CollectionStoreData> {
	public schema = collectionStoreSchema;
}
