import { TransferAsset } from '../../../../../src/app/modules/storage/assets/transfer_asset';

describe('TransferAsset', () => {
  let transactionAsset: TransferAsset;

	beforeEach(() => {
		transactionAsset = new TransferAsset();
	});

	describe('constructor', () => {
		it('should have valid id', () => {
			expect(transactionAsset.id).toEqual(4);
		});

		it('should have valid name', () => {
			expect(transactionAsset.name).toEqual('transfer');
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
