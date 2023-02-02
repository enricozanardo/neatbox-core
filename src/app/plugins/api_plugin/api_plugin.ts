import { BasePlugin, PluginInfo } from 'lisk-sdk';
import type { BaseChannel, EventsDefinition, ActionsDefinition, SchemaWithDefault } from 'lisk-sdk';

import * as actionHandlers from './action_handlers';

/* eslint-disable  @typescript-eslint/no-empty-function */
export class ApiPlugin extends BasePlugin {
	private _channel!: BaseChannel;

	public static get alias(): string {
		return 'apiPlugin';
	}

	// eslint-disable-next-line @typescript-eslint/class-literal-property-style
	public static get info(): PluginInfo {
		return {
			author: 'John Doe &lt;john@doe.com&gt;',
			version: '0.1.0',
			name: 'apiPlugin',
		};
	}

	// eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
	public get defaults(): SchemaWithDefault {
		return {
			$id: '/plugins/plugin-apiPlugin/config',
			type: 'object',
			properties: {},
			required: [],
			default: {},
		};
	}

	public get events(): EventsDefinition {
		return [
			// 'block:created',
			// 'block:missed'
		];
	}

	public get actions(): ActionsDefinition {
		return {
			getFiles: async params => actionHandlers.getFiles(this._channel, params),
			getFileById: async params => actionHandlers.getFileById(this._channel, params),
			getFilesByIds: async params => actionHandlers.getFilesByIds(this._channel, params),
			getFileByHash: async params => actionHandlers.getFileByHash(this._channel, params),
			getFilesByHashes: async params => actionHandlers.getFilesByHashes(this._channel, params),
			getFileByChecksum: async params => actionHandlers.getFileByChecksum(this._channel, params),
			getCollections: async params => actionHandlers.getCollections(this._channel, params),
			getCollectionById: async params => actionHandlers.getCollectionById(this._channel, params),
			getCollectionsByIds: async params => actionHandlers.getCollectionsByIds(this._channel, params),
			getStatistics: async () => actionHandlers.getStatistics(this._channel),
			getAccountMapEntry: async params => actionHandlers.getAccountMapEntry(this._channel, params),
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async load(channel: BaseChannel): Promise<void> {
		this._channel = channel;

		this._channel.once('app:ready', async () => {
			this._logger.info('Neatbox API plugin up and running.');

			this._logger.info('Enabling faucet..');
			await this._channel.invoke('faucet:authorize', {
				password: 'neatbox',
				enable: true,
			});
		});
	}

	public async unload(): Promise<void> {}
}
