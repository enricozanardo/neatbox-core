import { BaseEndpoint, ModuleEndpointContext, cryptography } from 'lisk-sdk';
import * as store from './utils/store';
import { isValidSha256Hash } from '../../../utils/validation';
import { returnObjectOrNullData } from '../../../utils/helpers';

export class StorageEndpoint extends BaseEndpoint {
	public async getFiles(ctx: ModuleEndpointContext) {
		return store.getFileStore(this.stores, ctx);
	}

	public async getAccount(ctx: ModuleEndpointContext) {
		const { address } = ctx.params;

		// 3. Validate address
		if (typeof address !== 'string') {
			throw new Error('Parameter address must be a string.');
		}

		cryptography.address.validateLisk32Address(address);

		return store.getAccountStore(
			this.stores,
			ctx,
			cryptography.address.getAddressFromLisk32Address(address),
		);
	}

	public async accountIsInitialized(ctx: ModuleEndpointContext) {
		const { address } = ctx.params;

		// 3. Validate address
		if (typeof address !== 'string') {
			throw new Error('Parameter address must be a string.');
		}

		cryptography.address.validateLisk32Address(address);

		const data = await store.getAccountStore(
			this.stores,
			ctx,
			cryptography.address.getAddressFromLisk32Address(address),
		);

		if (!data) {
			return false;
		}

		return data.emailHash && data.username;
	}

	/**
	 * Checks if username or emailHash is taken
	 */
	public async accountIsTaken(ctx: ModuleEndpointContext) {
		let isTaken = false;

		const { username, emailHash } = ctx.params;

		/** Input validation */
		if (!isValidSha256Hash(emailHash)) {
			throw new Error("Invalid field 'emailHash'");
		}

		if (typeof username !== 'string') {
			throw new Error("Invalid field 'username'");
		}

		const data = await store.getAllAccounts(this.stores, ctx);

		for (const account of data) {
			if (account.value.emailHash === emailHash || account.value.username === username) {
				isTaken = true;
				break;
			}
		}

		return isTaken;
	}

	public async getAccounts(ctx: ModuleEndpointContext) {
		return store.getAllAccounts(this.stores, ctx);
	}

	public async getEmailOrUsernameMap(ctx: ModuleEndpointContext) {
		const { emailHash, username } = ctx.params;

		if (!emailHash && !username) {
			throw new Error('Email and / or username param is missing');
		}

		if (emailHash) {
			if (typeof emailHash !== 'string') {
				throw new Error('Parameter address must be a string.');
			}

			const data = await store.getMapStore(this.stores, ctx, 'emailHash', Buffer.from(emailHash));
			return returnObjectOrNullData(data);
		}

		if (username) {
			if (typeof username !== 'string') {
				throw new Error('Parameter address must be a string.');
			}

			const data = await store.getMapStore(this.stores, ctx, 'username', Buffer.from(username));
			return returnObjectOrNullData(data);
		}

		return null;
	}

	public async getCollections(ctx: ModuleEndpointContext) {
		return store.getCollectionStore(this.stores, ctx);
	}

	public async getTimedTransfers(ctx: ModuleEndpointContext) {
		return store.getTimedTransferStore(this.stores, ctx);
	}

	public async getStatistics(ctx: ModuleEndpointContext) {
		return store.getStatisticStore(this.stores, ctx);
	}
}
