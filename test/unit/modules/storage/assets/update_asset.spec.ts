import { UpdateFileAsset } from '../../../../../src/app/modules/storage/assets/update_asset';

describe('UpdateFileAsset', () => {
	let transactionAsset: UpdateFileAsset;

	beforeEach(() => {
		transactionAsset = new UpdateFileAsset();
	});

	describe('constructor', () => {
		it('should have valid id', () => {
			expect(transactionAsset.id).toEqual(6);
		});

		it('should have valid name', () => {
			expect(transactionAsset.name).toEqual('update');
		});

		it('should have valid schema', () => {
			expect(transactionAsset.schema).toMatchSnapshot();
		});
	});

	describe('validate', () => {
		describe('schema validation', () => {
			it.todo('should throw errors for invalid schema');
			it.todo('should be ok for valid schema');
		});
	});

	describe('apply', () => {
		describe('valid cases', () => {
			it.todo('should update the state store');
		});

		describe('invalid cases', () => {
			it.todo('should throw error');
		});
	});
});
