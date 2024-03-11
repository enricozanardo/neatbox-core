/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/member-ordering */

import {
	BaseModule,
	BlockAfterExecuteContext,
	ModuleInitArgs,
	ModuleMetadata,
	TokenMethod,
	utils,
	validator,
} from 'lisk-sdk';
import { StorageModuleConfigJSON } from '../../../types';
import { CreateCollectionCommand } from './commands/create_collection_command';
import { CreateFileCommand } from './commands/create_file_command';
import { InitializeAccountCommand } from './commands/initialize_account_command';
import { RequestCollectionOwnershipCommand } from './commands/request_collection_ownership_command';
import { RequestCollectionTransferCommand } from './commands/request_collection_transfer_command';
import { RequestFileAccessCommand } from './commands/request_file_access_command';
import { RequestFileOwnershipCommand } from './commands/request_file_ownership_command';
import { RequestFileTransferCommand } from './commands/request_file_transfer_command';
import { RespondToCollectionRequestCommand } from './commands/respond_to_collection_request_command';
import { RespondToFileRequestCommand } from './commands/respond_to_file_request_command';
import { TimedTransferCommand } from './commands/timed_transfer_command';
import { UpdateCollectionCommand } from './commands/update_collection_command';
import { UpdateFileCommand } from './commands/update_file_command';
import { CancelRequestCommand } from './commands/cancel_request_command';
import { StorageEndpoint } from './endpoint';
import { StorageMethod } from './method';
import { storageModuleConfigSchema } from './schemas';
import { AccountStore } from './stores/account';
import { CollectionStore } from './stores/collections';
import { EmailMapStore } from './stores/email_map';
import { FileStore } from './stores/files';
import { StatisticStore } from './stores/statistics';
import { TimedTransferStore } from './stores/timedTransfers';
import { UsernameMapStore } from './stores/username_map';
import {
	getAccountStore,
	getFileStore,
	getMapStore,
	getTimedTransferStore,
	removeRequestsFromObject,
	setAccountStore,
	setFileStore,
	setTimedTransferStore,
} from './utils/store';

export const defaultConfig = {
	expiration: 604800,
};

export class StorageModule extends BaseModule {
	public endpoint = new StorageEndpoint(this.stores, this.offchainStores);
	public method = new StorageMethod(this.stores, this.events);
	private _tokenMethod!: TokenMethod;
	private _config!: StorageModuleConfigJSON;

	public requestFileTransferCommand = new RequestFileTransferCommand(this.stores, this.events);
	public requestFileOwnershipCommand = new RequestFileOwnershipCommand(this.stores, this.events);
	public requestFileAccessCommand = new RequestFileAccessCommand(this.stores, this.events);
	public timedTransferCommand = new TimedTransferCommand(this.stores, this.events);
	public requestCollectionOwnershipCommand = new RequestCollectionOwnershipCommand(
		this.stores,
		this.events,
	);
	public requestCollectionTransferCommand = new RequestCollectionTransferCommand(
		this.stores,
		this.events,
	);
	public respondToFileRequestCommand = new RespondToFileRequestCommand(this.stores, this.events);
	public respondToCollectionRequestCommand = new RespondToCollectionRequestCommand(
		this.stores,
		this.events,
	);

	public commands = [
		new InitializeAccountCommand(this.stores, this.events),
		new CancelRequestCommand(this.stores, this.events),
		new CreateFileCommand(this.stores, this.events),
		new UpdateFileCommand(this.stores, this.events),
		new CreateCollectionCommand(this.stores, this.events),
		new UpdateCollectionCommand(this.stores, this.events),
		this.respondToFileRequestCommand,
		this.respondToCollectionRequestCommand,
		this.requestFileTransferCommand,
		this.requestFileOwnershipCommand,
		this.requestFileAccessCommand,
		this.timedTransferCommand,
		this.requestCollectionTransferCommand,
		this.requestCollectionOwnershipCommand,
	];

	public constructor() {
		super();
		this.stores.register(FileStore, new FileStore(this.name, 0));
		this.stores.register(AccountStore, new AccountStore(this.name, 1));
		this.stores.register(CollectionStore, new CollectionStore(this.name, 2));
		this.stores.register(TimedTransferStore, new TimedTransferStore(this.name, 3));
		this.stores.register(StatisticStore, new StatisticStore(this.name, 4));
		this.stores.register(EmailMapStore, new EmailMapStore(this.name, 5));
		this.stores.register(UsernameMapStore, new UsernameMapStore(this.name, 6));
	}

	public addDependencies(tokenMethod: TokenMethod) {
		this._tokenMethod = tokenMethod;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(args: ModuleInitArgs): Promise<void> {
		const { moduleConfig } = args;
		const config = utils.objects.mergeDeep(
			{},
			defaultConfig,
			moduleConfig,
		) as StorageModuleConfigJSON;

		validator.validator.validate<StorageModuleConfigJSON>(storageModuleConfigSchema, config);
		this._config = config;

		this.requestFileTransferCommand.init({ tokenMethod: this._tokenMethod });
		this.requestFileOwnershipCommand.init({ tokenMethod: this._tokenMethod });
		this.requestFileAccessCommand.init({ tokenMethod: this._tokenMethod });
		this.timedTransferCommand.init({
			tokenMethod: this._tokenMethod,
			expiration: config.expiration,
		});
		this.requestCollectionOwnershipCommand.init({ tokenMethod: this._tokenMethod });
		this.requestCollectionTransferCommand.init({ tokenMethod: this._tokenMethod });
		this.respondToFileRequestCommand.init({ tokenMethod: this._tokenMethod });
		this.respondToCollectionRequestCommand.init({ tokenMethod: this._tokenMethod });
	}

	public metadata(): ModuleMetadata {
		return {
			...this.baseMetadata(),
			endpoints: [],
			assets: [],
		};
	}

	public async afterTransactionsExecute(context: BlockAfterExecuteContext): Promise<void> {
		const currentTs = context.header.timestamp;
		const timedTransferStore = await getTimedTransferStore(this.stores, context);

		const dataToBeRemoved = timedTransferStore.timedTransfers.filter(
			asset => asset.expiration.unix < currentTs,
		);

		context.logger.debug(`Block timestamp / expiration: ${currentTs} / ${this._config.expiration}`);

		const cleanup = async () => {
			const fileStore = await getFileStore(this.stores, context);

			for (const timedTransfer of dataToBeRemoved) {
				context.logger.info(
					`Cleaning up timed transfer: ${timedTransfer.id}, expiration: ${timedTransfer.expiration.unix} (current timestamp: ${currentTs})`,
				);

				const senderAddress = timedTransfer.sender;
				const sender = await getAccountStore(this.stores, context, senderAddress);

				if (!sender) {
					throw new Error('Sender does not exist.');
				}

				sender.filesOwned = sender.filesOwned.filter(fileId => fileId !== timedTransfer.id);
				sender.filesAllowed = sender.filesAllowed.filter(fileId => fileId !== timedTransfer.id);
				removeRequestsFromObject({
					type: 'account',
					input: sender,
					requestIds: [timedTransfer.id],
				});

				sender.incomingFileRequests = sender.incomingFileRequests.filter(
					req => req.fileId !== timedTransfer.id,
				);

				fileStore.files = fileStore.files.filter(f => f.data.id !== timedTransfer.id);

				await setAccountStore(this.stores, context, senderAddress, sender);

				const mapByEmail = await getMapStore(
					this.stores,
					context,
					'emailHash',
					Buffer.from(timedTransfer.recipientEmailHash),
				);

				/**
				 * If the timed transfer was collected by a (new) recipient, an account must exist.
				 * Therefore, remove timed transfer data from this account.
				 */
				if (mapByEmail?.address) {
					const recipientAddress = mapByEmail?.address;

					const recipient = await getAccountStore(this.stores, context, recipientAddress);

					if (!recipient) {
						throw new Error('Recipient does not exist.');
					}

					recipient.filesOwned = recipient.filesOwned.filter(fileId => fileId !== timedTransfer.id);
					recipient.filesAllowed = recipient.filesAllowed.filter(
						fileId => fileId !== timedTransfer.id,
					);

					removeRequestsFromObject({
						type: 'account',
						input: recipient,
						requestIds: [timedTransfer.id],
					});

					await setAccountStore(this.stores, context, recipientAddress, recipient);
				}
			}

			const removedTransferIds = dataToBeRemoved.map(t => t.id);
			timedTransferStore.timedTransfers = timedTransferStore.timedTransfers.filter(
				t => !removedTransferIds.includes(t.id),
			);

			await setFileStore(this.stores, context, fileStore);
			await setTimedTransferStore(this.stores, context, timedTransferStore);
		};

		if (dataToBeRemoved.length > 0) {
			await cleanup();
			context.logger.info('Cleanup complete :)');
		}
	}
}
