import {
    RespondToCollectionRequestAsset,
} from '../../../../../src/app/modules/storage/assets/transfer_collection_response_asset';

describe('RespondToCollectionRequestAsset', () => {
	let transactionAsset: RespondToCollectionRequestAsset;

	beforeEach(() => {
		transactionAsset = new RespondToCollectionRequestAsset();
	});

	describe('constructor', () => {
		it('should have valid id', () => {
			expect(transactionAsset.id).toEqual(11);
		});

		it('should have valid name', () => {
			expect(transactionAsset.name).toEqual('respondToCollectionRequest');
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
