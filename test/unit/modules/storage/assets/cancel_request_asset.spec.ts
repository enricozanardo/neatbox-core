import { CancelRequestAsset } from '../../../../../src/app/modules/storage/assets/cancel_request_asset';

describe('CancelRequestAsset', () => {
  let transactionAsset: CancelRequestAsset;

	beforeEach(() => {
		transactionAsset = new CancelRequestAsset();
	});

	describe('constructor', () => {
		it('should have valid id', () => {
			expect(transactionAsset.id).toEqual(13);
		});

		it('should have valid name', () => {
			expect(transactionAsset.name).toEqual('cancelRequest');
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
