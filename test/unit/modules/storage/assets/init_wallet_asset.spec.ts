import { InitWalletAsset } from '../../../../../src/app/modules/storage/assets/init_wallet_asset';

describe('InitWalletAsset', () => {
  let transactionAsset: InitWalletAsset;

	beforeEach(() => {
		transactionAsset = new InitWalletAsset();
	});

	describe('constructor', () => {
		it('should have valid id', () => {
			expect(transactionAsset.id).toEqual(12);
		});

		it('should have valid name', () => {
			expect(transactionAsset.name).toEqual('initWallet');
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
