import { RespondToFileRequestCommand } from '../../../../../src/app/modules/storage/commands/respond_to_file_request_command';

describe('RespondToFileRequestCommand', () => {
  let command: RespondToFileRequestCommand;

	beforeEach(() => {
		command = new RespondToFileRequestCommand();
	});

	describe('constructor', () => {
		it('should have valid name', () => {
			expect(command.name).toEqual('respondToFileRequest');
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
