import { Test, TestingModule } from '@nestjs/testing';
import { PdaService } from './pda.service';
import { PublicKey } from '@solana/web3.js';

describe('PdaService', () => {
  let service: PdaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdaService],
    }).compile();

    service = module.get<PdaService>(PdaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('derivePDA', () => {
    it('should derive a PDA with string seeds', async () => {
      const programId = new PublicKey('11111111111111111111111111111112');
      const seeds = ['test-seed', 'another-seed'];

      const result = await service.derivePDA(programId, seeds);

      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('bump');
      expect(result.address).toBeDefined();
      expect(typeof result.address.toBase58).toBe('function');
      expect(typeof result.bump).toBe('number');
      expect(result.bump).toBeGreaterThanOrEqual(0);
      expect(result.bump).toBeLessThanOrEqual(255);
    });

    it('should derive a PDA with buffer seeds', async () => {
      const programId = new PublicKey('11111111111111111111111111111112');
      const seeds = [Buffer.from('test'), Buffer.from('seed')];

      const result = await service.derivePDA(programId, seeds);

      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('bump');
    });

    it('should derive a PDA with public key seeds', async () => {
      const programId = new PublicKey('11111111111111111111111111111112');
      const ownerKey = new PublicKey('EPZP2wrcgtfUhjWPTZX2tJiY1Fg7fBn7ARq9W3J9s1L');
      const seeds = [ownerKey];

      const result = await service.derivePDA(programId, seeds);

      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('bump');
    });
  });

  describe('deriveAccountPDA', () => {
    it('should derive an account PDA', async () => {
      const programId = new PublicKey('11111111111111111111111111111112');
      const ownerAddress = new PublicKey('EPZP2wrcgtfUhjWPTZX2tJiY1Fg7fBn7ARq9W3J9s1L');
      const accountType = 'token';

      const result = await service.deriveAccountPDA(programId, ownerAddress, accountType);

      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('bump');
      expect(result.address).toBeDefined();
      expect(typeof result.address.toBase58).toBe('function');
    });
  });

  describe('deriveAssociatedTokenAccount', () => {
    it('should derive an associated token account', async () => {
      const tokenProgramId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
      const mintAddress = new PublicKey('EPZP2wrcgtfUhjWPTZX2tJiY1Fg7fBn7ARq9W3J9s1L');
      const ownerAddress = new PublicKey('EPZP2wrcgtfUhjWPTZX2tJiY1Fg7fBn7ARq9W3J9s1L');

      const ataAddress = await service.deriveAssociatedTokenAccount(
        tokenProgramId,
        mintAddress,
        ownerAddress,
      );

      expect(ataAddress).toBeDefined();
      expect(typeof ataAddress.toBase58).toBe('function');
    });
  });

  describe('validatePDA', () => {
    it('should validate a correct PDA', async () => {
      const programId = new PublicKey('11111111111111111111111111111112');
      const seeds = ['test-seed'];

      const { address } = await service.derivePDA(programId, seeds);
      const isValid = await service.validatePDA(address, programId, seeds);

      expect(isValid).toBe(true);
    });

    it('should reject an invalid PDA', async () => {
      const programId = new PublicKey('11111111111111111111111111111112');
      const wrongProgramId = new PublicKey('EPZP2wrcgtfUhjWPTZX2tJiY1Fg7fBn7ARq9W3J9s1L');
      const seeds = ['test-seed'];

      const { address } = await service.derivePDA(programId, seeds);
      const isValid = await service.validatePDA(address, wrongProgramId, seeds);

      expect(isValid).toBe(false);
    });
  });

  describe('deriveMultiplePDAs', () => {
    it('should derive multiple PDAs', async () => {
      const programId = new PublicKey('11111111111111111111111111111112');
      const seedMatrix = [['seed1'], ['seed2'], ['seed3']];

      const results = await service.deriveMultiplePDAs(programId, seedMatrix);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toHaveProperty('address');
        expect(result).toHaveProperty('bump');
        expect(result).toHaveProperty('seeds');
      });
    });
  });

  describe('deriveEscrowPDA', () => {
    it('should derive an escrow PDA', async () => {
      const programId = new PublicKey('11111111111111111111111111111112');
      const escrowId = 'test-escrow';
      const authority = new PublicKey('EPZP2wrcgtfUhjWPTZX2tJiY1Fg7fBn7ARq9W3J9s1L');

      const result = await service.deriveEscrowPDA(programId, escrowId, authority);

      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('bump');
    });
  });

  describe('deriveMetadataPDA', () => {
    it('should derive a metadata PDA', async () => {
      const metadataProgramId = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
      const mintAddress = new PublicKey('EPZP2wrcgtfUhjWPTZX2tJiY1Fg7fBn7ARq9W3J9s1L');

      const metadataAddress = await service.deriveMetadataPDA(metadataProgramId, mintAddress);

      expect(metadataAddress).toBeDefined();
      expect(typeof metadataAddress.toBase58).toBe('function');
    });
  });

  describe('deriveMasterEditionPDA', () => {
    it('should derive a master edition PDA', async () => {
      const metadataProgramId = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
      const mintAddress = new PublicKey('EPZP2wrcgtfUhjWPTZX2tJiY1Fg7fBn7ARq9W3J9s1L');

      const masterEditionAddress = await service.deriveMasterEditionPDA(
        metadataProgramId,
        mintAddress,
      );

      expect(masterEditionAddress).toBeDefined();
      expect(typeof masterEditionAddress.toBase58).toBe('function');
    });
  });
});
