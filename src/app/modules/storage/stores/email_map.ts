import { BaseStore, Schema } from 'lisk-sdk';

import { MapStoreData } from '../../../../types';
import { mapStoreSchema } from '../schemas';

export const emailMapStoreKey = Buffer.from('emailMapStore');

export const emailMapStoreSchema: Schema = {
	$id: 'neatbox/storage/emailMapStore',
	...mapStoreSchema,
};

export class EmailMapStore extends BaseStore<MapStoreData> {
	public schema = emailMapStoreSchema;
}
