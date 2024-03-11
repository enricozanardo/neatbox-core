import { AccountStoreData } from '../../../../types';

export const generateDefaultAccountData = (username = '', emailHash = ''): AccountStoreData => ({
	username,
	emailHash,
	filesOwned: [],
	filesAllowed: [],
	incomingFileRequests: [],
	outgoingFileRequests: [],
	collectionsOwned: [],
	collectionsAllowed: [],
	incomingCollectionRequests: [],
	outgoingCollectionRequests: [],
});
