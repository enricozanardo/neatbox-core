/* eslint-disable @typescript-eslint/no-empty-function */
import { Application } from 'lisk-sdk';

import { StorageModule } from './modules/storage/storage_module';

export const registerModules = (app: Application): void => {
	app.registerModule(StorageModule);
};
