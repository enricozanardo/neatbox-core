import { Application } from 'lisk-sdk';

import { ApiPlugin } from './plugins/api_plugin/api_plugin';
import { FaucetPlugin } from './plugins/lisk-framework-faucet-plugin';

export const registerPlugins = (app: Application): void => {
	// app.registerPlugin(FaucetPlugin, { applicationUrl: 'ws://localhost:8080/ws' });
	app.registerPlugin(FaucetPlugin, { applicationUrl: 'wss://api.stellab.it/ws' });
	app.registerPlugin(ApiPlugin);
};
