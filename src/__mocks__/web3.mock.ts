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
  PublicKey: class MockPublicKey {
    private _value: string;

    constructor(value: string | Buffer | Uint8Array | number[]) {
      if (typeof value === 'string') {
        // Basic validation - throw error for obviously invalid strings
        if (value === 'invalid' || value.length === 0) {
          throw new Error('Invalid public key input');
        }
        // Return mock public keys for known strings
        if (value in mockPublicKeys) {
          this._value = value;
          this.toString = () => value;
          return;
        }
        // For other strings, create a mock
        this._value = value;
        this.toString = () => value;
      } else {
        this._value = 'mock-public-key';
        this.toString = () => 'mock-public-key';
      }
    }

    toString() {
      return this._value;
    }

    toBase58() {
      return this._value;
    }

    toBytes() {
      // For real public key strings, return real bytes
      const realPubKey = new (jest.requireActual('@solana/web3.js').PublicKey)(this._value);
      return realPubKey.toBytes();
    }

    toBuffer() {
      return Buffer.from(this.toBytes());
    }

    equals(other: MockPublicKey) {
      return this._value === other._value;
    }

    static async findProgramAddress(seeds: any[], programId: any) {
      // Create a deterministic mock address based on seeds and programId
      const input = seeds.map(seed => 
        Buffer.isBuffer(seed) ? seed.toString('hex') : String(seed)
      ).join('') + programId.toString();
      const hash = require('crypto').createHash('sha256').update(input).digest();
      const mockAddress = new MockPublicKey(hash.slice(0, 32).toString('hex'));
      return [mockAddress, 0];
    }
  },

  // Keypair
  Keypair: class MockKeypair extends Keypair {
    static fromSecretKey = jest.fn().mockImplementation((secretKey: Uint8Array) => {
      return Keypair.fromSecretKey(secretKey); // Use real fromSecretKey
    });

    static generate = jest.fn().mockImplementation(() => {
      return Keypair.generate(); // Use real generate for different keys
    });
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
  Transaction: class MockTransaction extends Transaction {
    static from = jest.fn().mockImplementation((buffer: Buffer) => {
      return new MockTransaction();
    });

    sign = jest.fn().mockImplementation((...signers: Keypair[]) => {
      // Mock signing - don't validate signers for tests
      // Just set a mock signature using Object.defineProperty to bypass readonly
      Object.defineProperty(this, 'signature', {
        value: Buffer.from('mock-signature-' + Math.random().toString(36)),
        writable: true,
      });
    });
  },

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
  jest.mock('@solana/web3.js', () => {
    const actual = jest.requireActual('@solana/web3.js');
    return {
      ...actual,
      PublicKey: mockWeb3.PublicKey,
      Keypair: mockWeb3.Keypair,
      SystemProgram: mockWeb3.SystemProgram,
      Transaction: mockWeb3.Transaction,
      sendAndConfirmTransaction: mockWeb3.sendAndConfirmTransaction,
      ComputeBudgetProgram: mockWeb3.ComputeBudgetProgram,
    };
  });
  return mockWeb3;
}