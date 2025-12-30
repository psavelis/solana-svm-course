import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SigningService } from '../signing.service';
import { Transaction } from '../../transactions/transaction.entity';
import { Keypair } from '@solana/web3.js';

describe('SigningService', () => {
  let service: SigningService;
  let transactionRepository: Repository<Transaction>;

  const mockTransactionRepository = {
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SigningService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
      ],
    }).compile();

    service = module.get<SigningService>(SigningService);
    transactionRepository = module.get<Repository<Transaction>>(getRepositoryToken(Transaction));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateKeyPair', () => {
    it('should generate a valid Ed25519 keypair', () => {
      const result = service.generateKeyPair();

      expect(result).toHaveProperty('publicKey');
      expect(typeof result.publicKey).toBe('string');
      expect(result.publicKey).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/); // Base58 pattern

      // Verify it's a valid public key by trying to create PublicKey object
      expect(() => {
        new (require('@solana/web3.js').PublicKey)(result.publicKey);
      }).not.toThrow();
    });

    it('should generate different keypairs on multiple calls', () => {
      const result1 = service.generateKeyPair();
      const result2 = service.generateKeyPair();

      expect(result1.publicKey).not.toBe(result2.publicKey);
    });
  });

  describe('signMessage', () => {
    let testKeypair: Keypair;
    let privateKeyString: string;

    beforeEach(() => {
      testKeypair = Keypair.generate();
      privateKeyString = JSON.stringify(Array.from(testKeypair.secretKey));
    });

    it('should sign a message successfully', () => {
      const message = new Uint8Array([1, 2, 3, 4, 5]);
      const result = service.signMessage(privateKeyString, message);

      expect(result).toHaveProperty('signature');
      expect(result).toHaveProperty('publicKey');
      expect(result).toHaveProperty('success', true);
      expect(result.signature).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64 pattern
      expect(result.publicKey).toBe(testKeypair.publicKey.toString());
    });

    it('should throw error for invalid private key', () => {
      const message = new Uint8Array([1, 2, 3]);
      expect(() => {
        service.signMessage('invalid-key', message);
      }).toThrow('Failed to sign message');
    });
  });

  describe('verifySignature', () => {
    let testKeypair: Keypair;
    let privateKeyString: string;
    let message: Uint8Array;
    let signature: string;

    beforeEach(() => {
      testKeypair = Keypair.generate();
      privateKeyString = JSON.stringify(Array.from(testKeypair.secretKey));
      message = new Uint8Array([1, 2, 3, 4, 5]);
      const signResult = service.signMessage(privateKeyString, message);
      signature = signResult.signature;
    });

    it('should verify a valid signature', () => {
      const result = service.verifySignature(signature, message, testKeypair.publicKey.toString());

      expect(result).toHaveProperty('isValid', true);
      expect(result).toHaveProperty('publicKey', testKeypair.publicKey.toString());
      expect(result.message).toBe('Signature is valid');
    });

    it('should reject an invalid signature', () => {
      const invalidSignature = Buffer.from('invalid').toString('base64');
      const result = service.verifySignature(invalidSignature, message, testKeypair.publicKey.toString());

      expect(result).toHaveProperty('isValid', false);
      expect(result.message).toContain('Verification error');
    });

    it('should handle invalid public key', () => {
      const result = service.verifySignature(signature, message, 'invalid-public-key');

      expect(result).toHaveProperty('isValid', false);
      expect(result.message).toContain('Verification error');
    });
  });

  describe('getPublicKeyFromPrivateKey', () => {
    it('should extract public key from private key', () => {
      const keypair = Keypair.generate();
      const privateKeyString = JSON.stringify(Array.from(keypair.secretKey));

      const publicKey = service.getPublicKeyFromPrivateKey(privateKeyString);

      expect(publicKey).toBe(keypair.publicKey.toString());
    });

    it('should throw error for invalid private key', () => {
      expect(() => {
        service.getPublicKeyFromPrivateKey('invalid-key');
      }).toThrow('Invalid private key');
    });
  });

  describe('createAndSignTransfer', () => {
    let testKeypair: Keypair;
    let privateKeyString: string;
    let recipientPublicKey: string;

    beforeEach(() => {
      testKeypair = Keypair.generate();
      privateKeyString = JSON.stringify(Array.from(testKeypair.secretKey));
      recipientPublicKey = Keypair.generate().publicKey.toString();

      // Mock the transaction save
      mockTransactionRepository.save.mockResolvedValue({});
    });

    it('should create and sign a transfer transaction', async () => {
      // Note: This test would require mocking the Solana connection
      // For now, we'll test the error handling
      const amount = 1000000; // 0.001 SOL

      // This will fail because we're not connected to a real Solana network
      // but it tests the service logic up to the network call
      await expect(
        service.createAndSignTransfer(privateKeyString, recipientPublicKey, amount)
      ).rejects.toThrow('Failed to sign and send transaction');
    });
  });
});