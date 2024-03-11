import { CancelRequestCommand } from '../../../../../src/app/modules/storage/commands/cancel_request_command';

describe('CancelRequestCommand', () => {
	let command: CancelRequestCommand;

	beforeEach(() => {
		command = new CancelRequestCommand();
	});

	describe('constructor', () => {
		it('should have valid name', () => {
			expect(command.name).toBe('cancelRequest');
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
