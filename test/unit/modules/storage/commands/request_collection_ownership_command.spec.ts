import { RequestCollectionOwnershipCommand } from '../../../../../src/app/modules/storage/commands/request_collection_ownership_command';

describe('RequestCollectionOwnershipCommand', () => {
	let command: RequestCollectionOwnershipCommand;

	beforeEach(() => {
		command = new RequestCollectionOwnershipCommand();
	});

	describe('constructor', () => {
		it('should have valid name', () => {
			expect(command.name).toBe('requestCollectionOwnership');
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
