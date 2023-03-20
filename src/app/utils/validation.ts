import { validator } from 'lisk-sdk';
import { DateTime } from 'luxon';

import { CustomField, StorageModuleAccountProps } from '../modules/storage/types';

export const isValidChecksum = (input: string) => {
	const md5Regex = /^[a-fA-F0-9]{64}$/;
	return md5Regex.test(input);
};

export const isValidHash = (input: string) => {
	// TODO: perform validation on to-be-decided hash algorithm
	return true;
};

export const isValidId = (input: string) => validator.isHexString(input);

export const buffersAreEqual = (bufferA: Buffer, bufferB: Buffer) => Buffer.compare(bufferA, bufferB) === 0;

export const isHexString = (input: string) => validator.isHexString(input);

export const isValidTimestamp = (ts: number) => {
	if (typeof ts !== 'number') {
		return false;
	}

	return ts < DateTime.now().toUTC().toUnixInteger();
};

export const arrayHasDuplicates = (arr: unknown[]) => arr.length !== new Set(arr).size;

export const isValidSha256Hash = (input: unknown) => {
	if (typeof input !== 'string') {
		return false;
	}

	const regex = /^[a-f0-9]{64}$/gi;
	return regex.test(input);
};

export const accountHasMap = (account: StorageModuleAccountProps) => !!account.storage.map;

export const validateCustomFields = (data: unknown) => {
	if (!Array.isArray(data)) {
		throw Error('Input is not an array');
	}

	if (data.length === 0) {
		throw Error('Array is empty');
	}

	if (
		data.every(entry => typeof entry === 'object') &&
		!data.every((entry: Record<string, string>) => entry.name && entry.value)
	) {
		throw Error('Array entries are not of Custom Field type');
	}

	return data as CustomField[];
};
