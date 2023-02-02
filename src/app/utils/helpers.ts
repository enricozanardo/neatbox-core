import { DateTime } from 'luxon';

import { Meta } from '../modules/storage/types';

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
