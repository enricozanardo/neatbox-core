import { ApplyAssetContext, BaseAsset, ValidateAssetContext } from 'lisk-sdk';

import { getStorageModuleData, setStorageModuleData } from '../../../utils/store';
import { isValidSha256Hash, isValidTimestamp } from '../../../utils/validation';
import { initWalletAssetPropsSchema } from '../transaction_schemas';
import { AccountMapEntry, InitWalletAssetProps, StorageModuleAccountProps } from '../types';

export class InitWalletAsset extends BaseAsset {
	public name = 'initWallet';
	public id = 12;
	public schema = initWalletAssetPropsSchema;

	public validate({ asset }: ValidateAssetContext<InitWalletAssetProps>): void {
		if (!isValidSha256Hash(asset.emailHash)) {
			throw new Error('Invalid hash');
		}

		if (!isValidTimestamp(asset.timestamp)) {
			throw new Error('Invalid timestamp');
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async apply({ asset, transaction, stateStore }: ApplyAssetContext<InitWalletAssetProps>): Promise<void> {
		const stateStoreData = await getStorageModuleData(stateStore);
		const sender = await stateStore.account.getOrDefault<StorageModuleAccountProps>(transaction.senderAddress);

		const { emailHash, username } = asset;
		const binaryAddress = sender.address.toString('hex');

		if (stateStoreData.accountMap.find(a => a.binaryAddress === binaryAddress)) {
			throw new Error('Wallet is already mapped to an e-mail');
		}

		const account = stateStoreData.accountMap.find(a => a.emailHash === emailHash);

		/** is allowed to continue, because users can send transfers to an email-address not yet mapped to a wallet */
		if (account) {
			/** however, an already initialized account can not be re-mapped */
			if (account.binaryAddress) {
				throw Error('E-mail is already mapped to a wallet');
			}

			account.binaryAddress = binaryAddress;

			/** add any pending timed transfer requests to the account */
			stateStoreData.timedTransfers.forEach(transfer => {
				if (transfer.recipientEmailHash === emailHash) {
					const accountRequest = {
						fileId: transfer.id,
						requestId: transfer.id,
					};

					sender.storage.incomingFileRequests.push(accountRequest);
				}
			});
		}

		/** account is fresh, therefore create a new entry */
		if (!account) {
			const accountMapEntry: AccountMapEntry = {
				binaryAddress,
				emailHash,
				username,
			};

			stateStoreData.accountMap.push(accountMapEntry); // The "map" is an array in the current version of SDK because it does not support object types. Will be fixed in SDK v6.
		}

		sender.storage.map = {
			emailHash,
			username,
		};

		await setStorageModuleData(stateStore, stateStoreData);
		await stateStore.account.set(sender.address, sender);
	}
}
