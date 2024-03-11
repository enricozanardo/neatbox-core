import { BaseStore, Schema } from 'lisk-sdk';
import { fileSchema } from '../schemas';
import { NeatboxFile } from '../../../../types';

export const fileStoreKey = Buffer.from('fileStore');

export type FileStoreData = {
	files: NeatboxFile[];
};

export const fileStoreSchema: Schema = {
	$id: 'neatbox/storage/files',
	type: 'object',
	required: ['files'],
	properties: {
		files: {
			fieldNumber: 1,
			type: 'array',
			items: fileSchema,
		},
	},
};
export class FileStore extends BaseStore<FileStoreData> {
	public schema = fileStoreSchema;
}
