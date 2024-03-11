import { TimedTransferCommand } from '../../../../../src/app/modules/storage/commands/timed_transfer_command';

describe('TimedTransferCommand', () => {
  let command: TimedTransferCommand;

	beforeEach(() => {
		command = new TimedTransferCommand();
	});

	describe('constructor', () => {
		it('should have valid name', () => {
			expect(command.name).toBe('timedTransfer');
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
