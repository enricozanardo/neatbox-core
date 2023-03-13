import { Application } from 'lisk-sdk';

import { ApiPlugin } from './plugins/api_plugin/api_plugin';

export const registerPlugins = (app: Application): void => {
	app.registerPlugin(ApiPlugin);
};
