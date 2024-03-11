import { BaseStore, Schema } from 'lisk-sdk';

export const statisticStoreKey = Buffer.from('statisticStore');

export type StatisticStoreData = {
	accounts: number;
	files: number;
	transfers: number;
	collections: number;
};

export const statisticStoreSchema: Schema = {
	$id: 'neatbox/storage/statistics',
	type: 'object',
	required: ['accounts', 'files', 'transfers', 'collections'],
	properties: {
		accounts: {
			fieldNumber: 1,
			dataType: 'uint32',
		},
		files: {
			fieldNumber: 2,
			dataType: 'uint32',
		},
		transfers: {
			fieldNumber: 3,
			dataType: 'uint32',
		},
		collections: {
			fieldNumber: 4,
			dataType: 'uint32',
		},
	},
};
export class StatisticStore extends BaseStore<StatisticStoreData> {
	public schema = statisticStoreSchema;
}
