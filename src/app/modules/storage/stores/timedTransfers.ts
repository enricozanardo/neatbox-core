import { BaseStore, Schema } from 'lisk-sdk';

import { TimedTransferSummary } from '../../../../types';
import { timedTransferSchema } from '../schemas';

export const timedTransferStoreKey = Buffer.from('timedTransferStore');

export type TimedTransferStoreData = {
	timedTransfers: TimedTransferSummary[];
};

export const timedTransferStoreSchema: Schema = {
	$id: 'neatbox/storage/timedTransfers',
	type: 'object',
	required: ['timedTransfers'],
	properties: {
		timedTransfers: {
			fieldNumber: 1,
			type: 'array',
			items: timedTransferSchema,
		},
	},
};
export class TimedTransferStore extends BaseStore<TimedTransferStoreData> {
	public schema = timedTransferStoreSchema;
}
