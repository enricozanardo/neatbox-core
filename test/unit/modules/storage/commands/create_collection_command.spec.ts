import { CreateCollectionCommand } from '../../../../../src/app/modules/storage/commands/create_collection_command';

describe('CreateCollectionCommand', () => {
  let command: CreateCollectionCommand;

	beforeEach(() => {
		command = new CreateCollectionCommand();
	});

	describe('constructor', () => {
		it('should have valid name', () => {
			expect(command.name).toEqual('createCollection');
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
