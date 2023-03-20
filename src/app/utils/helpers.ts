import { DateTime } from 'luxon';

import { CustomField, Meta } from '../modules/storage/types';
import { validateCustomFields } from './validation';

export const createDateTime = (unix: number) => {
	const date = DateTime.fromSeconds(unix).toUTC();

	return {
		unix: date.toUnixInteger(),
		human: date.toString(),
	};
};

export const createMeta = (unix: number, expiration = 0): Meta => ({
	createdAt: createDateTime(unix),
	lastModified: createDateTime(unix),
	expiration: createDateTime(expiration),
	collection: {
		id: '',
		title: '',
	},
});

export const updateMeta = (metaObject: Meta, unix: number): Meta => ({
	...metaObject,
	lastModified: createDateTime(unix),
});

export const getCurrentTimestamp = () => DateTime.now().toUTC().toUnixInteger();

export const stringMatches = (a: string, b: string) => a.toLowerCase().includes(b.toLocaleLowerCase());

export const bufferToJson = (input: Buffer): unknown => {
	let buffer!: Buffer;

	if (!Buffer.isBuffer(input)) {
		buffer = Buffer.from(input);
	} else {
		buffer = input;
	}

	return JSON.parse(buffer.toString());
};

const getCustomFields = (input: Buffer) => {
	let fields: CustomField[] = [];
	const data = bufferToJson(input);

	try {
		fields = validateCustomFields(data);
	} catch (err) {
		/** Invalid or no fields found, but no need to log it */
	}

	return fields;
};

export const customFieldsMatches = (fieldsInput: Buffer, searchInput: string) => {
	const customFields = getCustomFields(fieldsInput);
	let match = false;

	for (const customField of customFields) {
		if (stringMatches(customField.name, searchInput) || stringMatches(customField.value, searchInput)) {
			match = true;
			break;
		}
	}

	return match;
};
