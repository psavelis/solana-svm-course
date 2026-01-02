import { PublicKey, Connection, AccountInfo } from '@solana/web3.js';

// Mock Account Info
export const mockAccountInfo: AccountInfo<Buffer> = {
  lamports: 1000000,
  data: Buffer.from('mock account data'),
  owner: new PublicKey('11111111111111111111111111111112'),
  executable: false,
  rentEpoch: 0,
};

// Mock Connection class
export class MockConnection extends Connection {
  private mockResponses: Map<string, any> = new Map();

  constructor(endpoint?: string, config?: any) {
    super(endpoint || 'http://mock-solana-endpoint', config || {});
  }

  // Override getAccountInfo
  async getAccountInfo(publicKey: PublicKey): Promise<AccountInfo<Buffer> | null> {
    const key = `accountInfo-${publicKey.toString()}`;
    if (this.mockResponses.has(key)) {
      return this.mockResponses.get(key);
    }
    // Return mock data for known addresses, null for unknown
    return publicKey.toString().startsWith('111') ? mockAccountInfo : null;
  }

  // Override getBalance
  async getBalance(publicKey: PublicKey): Promise<number> {
    const key = `balance-${publicKey.toString()}`;
    if (this.mockResponses.has(key)) {
      return this.mockResponses.get(key);
    }
    return 1000000; // 0.001 SOL in lamports
  }

  // Override getSlot
  async getSlot(): Promise<number> {
    return 123456789;
  }

  // Override getVersion
  async getVersion(): Promise<any> {
    return {
      'solana-core': '1.14.0',
      'feature-set': 123456789,
    };
  }

  // Override getRecentBlockhash
  async getRecentBlockhash(): Promise<any> {
    return {
      blockhash: 'G8qV9J3k8qV9J3k8qV9J3k8qV9J3k8qV9J3k8qV9J3k',
      feeCalculator: {
        lamportsPerSignature: 5000,
      },
    };
  }

  // Override sendAndConfirmTransaction
  async sendAndConfirmTransaction(
    transaction: any,
    signers?: any[],
    options?: any,
  ): Promise<string> {
    return 'mock-transaction-signature-' + Date.now();
  }

  // Mock response setter for testing
  setMockResponse(key: string, value: any): void {
    this.mockResponses.set(key, value);
  }

  // Clear all mock responses
  clearMockResponses(): void {
    this.mockResponses.clear();
  }
}

// Factory function to create mock connection
export function createMockConnection(): MockConnection {
  return new MockConnection();
}
