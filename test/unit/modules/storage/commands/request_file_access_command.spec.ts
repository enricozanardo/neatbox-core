import { RequestFileAccessCommand } from '../../../../../src/app/modules/storage/commands/request_file_access_command';

describe('RequestFileAccessCommand', () => {
	let command: RequestFileAccessCommand;

	beforeEach(() => {
		command = new RequestFileAccessCommand();
	});

	describe('constructor', () => {
		it('should have valid name', () => {
			expect(command.name).toBe('requestFileAccess');
		});

		it('should have valid schema', () => {
			expect(command.schema).toMatchSnapshot();
		});
	});

	describe('verify', () => {
		describe('schema validation', () => {
			it.todo('should throw errors for invalid schema');
			it.todo('should be ok for valid schema');
		});
	});

	describe('execute', () => {
		describe('valid cases', () => {
			it.todo('should update the state store');
		});

		describe('invalid cases', () => {
			it.todo('should throw error');
		});
	});
});
