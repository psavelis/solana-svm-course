import { PublicKey, Keypair, Transaction, SystemProgram } from '@solana/web3.js';

// Mock keypair
export const mockKeypair = Keypair.generate();

// Mock public keys for common use cases
export const mockPublicKeys = {
  user: new PublicKey('11111111111111111111111111111112'),
  program: new PublicKey('11111111111111111111111111111112'),
  mint: new PublicKey('11111111111111111111111111111112'),
  tokenAccount: new PublicKey('11111111111111111111111111111112'),
};

// Mock transaction
export const mockTransaction = new Transaction();

// Mock web3.js functions
export const mockWeb3 = {
  // PublicKey constructor mock
  PublicKey: jest.fn().mockImplementation((value: string | Buffer | Uint8Array | number[]) => {
    if (typeof value === 'string') {
      // Return mock public keys for known strings
      if (value in mockPublicKeys) {
        return mockPublicKeys[value as keyof typeof mockPublicKeys];
      }
      // For other strings, create a real PublicKey but mock the methods
      const realKey = new PublicKey(value);
      jest.spyOn(realKey, 'toString').mockReturnValue(value);
      return realKey;
    }
    return new PublicKey(value);
  }),

  // Keypair
  Keypair: {
    generate: jest.fn().mockReturnValue(mockKeypair),
  },

  // SystemProgram
  SystemProgram: {
    transfer: jest.fn().mockReturnValue({
      keys: [],
      programId: SystemProgram.programId,
      data: Buffer.from('mock-system-transfer'),
    }),
  },

  // Transaction
  Transaction: jest.fn().mockImplementation(() => mockTransaction),

  // sendAndConfirmTransaction
  sendAndConfirmTransaction: jest.fn().mockResolvedValue('mock-web3-transaction-signature'),

  // ComputeBudgetProgram
  ComputeBudgetProgram: {
    setComputeUnitPrice: jest.fn().mockReturnValue({
      keys: [],
      programId: new PublicKey('ComputeBudget111111111111111111111111111111'),
      data: Buffer.from('mock-compute-budget'),
    }),
  },

  // Reset all mocks
  resetAllMocks: function() {
    Object.values(this).forEach(mock => {
      if (typeof mock === 'object' && mock !== null) {
        Object.values(mock).forEach(method => {
          if (jest.isMockFunction(method)) {
            method.mockReset();
          }
        });
      } else if (jest.isMockFunction(mock)) {
        mock.mockReset();
      }
    });
  },
};

// Setup function for Jest
export function setupWeb3Mocks() {
  jest.mock('@solana/web3.js', () => ({
    ...jest.requireActual('@solana/web3.js'),
    ...mockWeb3,
  }));
  return mockWeb3;
}