import { TimedTransferAsset } from '../../../../../src/app/modules/storage/assets/timed_transfer_asset';

describe('TimedTransferAsset', () => {
  let transactionAsset: TimedTransferAsset;

	beforeEach(() => {
		transactionAsset = new TimedTransferAsset();
	});

	describe('constructor', () => {
		it('should have valid id', () => {
			expect(transactionAsset.id).toEqual(7);
		});

		it('should have valid name', () => {
			expect(transactionAsset.name).toEqual('timedTransfer');
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
