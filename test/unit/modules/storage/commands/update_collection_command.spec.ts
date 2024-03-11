import { UpdateCollectionCommand } from '../../../../../src/app/modules/storage/commands/update_collection_command';

describe('UpdateCollectionCommand', () => {
  let command: UpdateCollectionCommand;

	beforeEach(() => {
		command = new UpdateCollectionCommand();
	});

	describe('constructor', () => {
		it('should have valid name', () => {
			expect(command.name).toEqual('updateCollection');
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
