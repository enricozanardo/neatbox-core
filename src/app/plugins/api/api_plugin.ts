import { BasePlugin } from 'lisk-sdk';
import { Endpoint } from './endpoint';

/* eslint-disable class-methods-use-this */
/* eslint-disable  @typescript-eslint/no-empty-function */
export class ApiPlugin extends BasePlugin {
	public endpoint = new Endpoint();

	public get nodeModulePath(): string {
		return __filename;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async load(): Promise<void> {
		this.endpoint.init(this.apiClient);
	}

	public async unload(): Promise<void> {}
}
