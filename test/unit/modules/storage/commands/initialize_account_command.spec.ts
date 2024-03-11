import { InitializeAccountCommand } from '../../../../../src/app/modules/storage/commands/initialize_account_command';

describe('InitializeAccountCommand', () => {
  let command: InitializeAccountCommand;

	beforeEach(() => {
		command = new InitializeAccountCommand();
	});

	describe('constructor', () => {
		it('should have valid name', () => {
			expect(command.name).toEqual('initializeAccount');
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
