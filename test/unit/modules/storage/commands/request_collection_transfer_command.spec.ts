import { RequestCollectionTransferCommand } from '../../../../../src/app/modules/storage/commands/request_collection_transfer_command';

describe('RequestCollectionTransferCommand', () => {
	let command: RequestCollectionTransferCommand;

	beforeEach(() => {
		command = new RequestCollectionTransferCommand();
	});

	describe('constructor', () => {
		it('should have valid name', () => {
			expect(command.name).toBe('requestCollectionTransfer');
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
