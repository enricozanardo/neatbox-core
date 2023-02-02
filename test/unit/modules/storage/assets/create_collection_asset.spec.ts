import { CreateCollectionAsset } from '../../../../../src/app/modules/storage/assets/create_collection_asset';

describe('CreateCollectionAsset', () => {
  let transactionAsset: CreateCollectionAsset;

	beforeEach(() => {
		transactionAsset = new CreateCollectionAsset();
	});

	describe('constructor', () => {
		it('should have valid id', () => {
			expect(transactionAsset.id).toEqual(8);
		});

		it('should have valid name', () => {
			expect(transactionAsset.name).toEqual('createCollection');
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
