import { RespondToCollectionRequestCommand } from '../../../../../src/app/modules/storage/commands/respond_to_collection_request_command';

describe('RespondToCollectionRequestCommand', () => {
	let command: RespondToCollectionRequestCommand;

	beforeEach(() => {
		command = new RespondToCollectionRequestCommand();
	});

	describe('constructor', () => {
		it('should have valid name', () => {
			expect(command.name).toBe('respondToCollectionRequest');
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
