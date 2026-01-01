import { PublicKey, Keypair, TransactionInstruction } from '@solana/web3.js';

// Mock token account info
export const mockTokenAccount = {
  address: new PublicKey('11111111111111111111111111111112'),
  mint: new PublicKey('11111111111111111111111111111112'),
  owner: new PublicKey('11111111111111111111111111111112'),
  amount: BigInt(1000000),
  delegate: null,
  delegatedAmount: BigInt(0),
  isInitialized: true,
  isFrozen: false,
  isNative: false,
  rentExemptReserve: null,
  closeAuthority: null,
};

// Mock functions for @solana/spl-token
export const mockSplToken = {
  // Token Program ID
  TOKEN_PROGRAM_ID: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),

  // getAssociatedTokenAddress
  getAssociatedTokenAddress: jest.fn().mockImplementation(
    async (mint: PublicKey, owner: PublicKey): Promise<PublicKey> => {
      // Return a deterministic associated token address
      const seed = `${mint.toString()}-${owner.toString()}`;
      return new PublicKey('AT' + seed.slice(0, 40).padEnd(40, '0'));
    }
  ),

  // getAccount
  getAccount: jest.fn().mockResolvedValue(mockTokenAccount),

  // createMint
  createMint: jest.fn().mockResolvedValue(new PublicKey('11111111111111111111111111111112')),

  // createAssociatedTokenAccount
  createAssociatedTokenAccount: jest.fn().mockResolvedValue(
    new PublicKey('11111111111111111111111111111112')
  ),

  // mintTo
  mintTo: jest.fn().mockResolvedValue('mock-mint-signature'),

  // burn
  burn: jest.fn().mockResolvedValue('mock-burn-signature'),

  // getOrCreateAssociatedTokenAccount
  getOrCreateAssociatedTokenAccount: jest.fn().mockResolvedValue({
    address: new PublicKey('11111111111111111111111111111112'),
    account: mockTokenAccount,
  }),

  // closeAccount
  closeAccount: jest.fn().mockResolvedValue('mock-close-signature'),

  // freezeAccount
  freezeAccount: jest.fn().mockResolvedValue('mock-freeze-signature'),

  // thawAccount
  thawAccount: jest.fn().mockResolvedValue('mock-thaw-signature'),

  // approve
  approve: jest.fn().mockResolvedValue('mock-approve-signature'),

  // revoke
  revoke: jest.fn().mockResolvedValue('mock-revoke-signature'),

  // createTransferInstruction
  createTransferInstruction: jest.fn().mockReturnValue(
    new TransactionInstruction({
      keys: [],
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      data: Buffer.from('mock-transfer-data'),
    })
  ),

  // Reset all mocks
  resetAllMocks: function() {
    Object.values(this).forEach(mock => {
      if (jest.isMockFunction(mock)) {
        mock.mockReset();
      }
    });
  },
};

// Setup function for Jest
export function setupSplTokenMocks() {
  jest.mock('@solana/spl-token', () => mockSplToken);
  return mockSplToken;
}