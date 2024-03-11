import { DashboardPlugin } from '@liskhq/lisk-framework-dashboard-plugin';
import { Application, PartialApplicationConfig } from 'lisk-sdk';
import { registerModules } from './modules';
import { StorageModule } from './modules/storage/module';
import { registerPlugins } from './plugins';
import { ApiPlugin } from './plugins/api/api_plugin';

export const getApplication = (config: PartialApplicationConfig): Application => {
	const { app, method } = Application.defaultApplication(config);

	const storageModule = new StorageModule();

	app.registerModule(storageModule);
	storageModule.addDependencies(method.token);

	app.registerPlugin(new DashboardPlugin());
	app.registerPlugin(new ApiPlugin());

	registerModules(app);
	registerPlugins(app);

	return app;
};
