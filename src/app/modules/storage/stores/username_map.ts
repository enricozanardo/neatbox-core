import { BaseStore, Schema } from 'lisk-sdk';

import { MapStoreData } from '../../../../types';
import { mapStoreSchema } from '../schemas';

export const usernameMapStoreKey = Buffer.from('usernameMapStore');

export const usernameMapStoreSchema: Schema = {
	$id: 'neatbox/storage/usernamesMapStore',
	...mapStoreSchema,
};

export class UsernameMapStore extends BaseStore<MapStoreData> {
	public schema = usernameMapStoreSchema;
}
