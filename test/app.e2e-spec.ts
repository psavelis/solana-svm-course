import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { TestUtils } from '../src/test-utils';

/**
 * End-to-End Tests for the Solana SVM Study Application
 *
 * These tests require a PostgreSQL database and Kafka to run properly.
 * The application uses PostgreSQL-specific features (enum, jsonb) that
 * are not supported by SQLite in-memory databases.
 *
 * To run these tests:
 * 1. Start infrastructure: docker-compose up -d
 * 2. Run: npm run test:e2e
 *
 * Environment requirements:
 * - PostgreSQL on localhost:5432
 * - Kafka on localhost:9092
 * - Redis on localhost:6379
 *
 * @see https://solana.com/docs
 */
describe.skip('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Health Check', () => {
    it('/health (GET)', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body.status).toBe('ok');
        });
    });
  });

  describe('API Endpoints', () => {
    describe('Accounts API', () => {
      let createdAccountId: string;

      it('should create an account', () => {
        const createAccountDto = {
          address: '11111111111111111111111111111112',
          owner: 'e2e-test-owner',
        };

        return request(app.getHttpServer())
          .post('/accounts')
          .send(createAccountDto)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body.address).toBe(createAccountDto.address);
            createdAccountId = res.body.id;
          });
      });

      it('should retrieve the created account', () => {
        return request(app.getHttpServer())
          .get(`/accounts/${createdAccountId}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.id).toBe(createdAccountId);
            expect(res.body.address).toBe('11111111111111111111111111111112');
          });
      });

      it('should list accounts', () => {
        return request(app.getHttpServer())
          .get('/accounts')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
          });
      });

      it('should get account balance', () => {
        return request(app.getHttpServer())
          .get(`/accounts/${createdAccountId}/balance`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('balance');
            expect(typeof res.body.balance).toBe('number');
          });
      });
    });

    describe('Tokens API', () => {
      let createdTokenId: string;

      it('should create a token', () => {
        const createTokenDto = {
          name: 'E2E Test Token',
          symbol: 'E2E',
          decimals: 9,
          initialSupply: 1000000000,
        };

        return request(app.getHttpServer())
          .post('/tokens')
          .send(createTokenDto)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body.name).toBe(createTokenDto.name);
            createdTokenId = res.body.id;
          });
      });

      it('should retrieve the created token', () => {
        return request(app.getHttpServer())
          .get(`/tokens/${createdTokenId}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.id).toBe(createdTokenId);
            expect(res.body.name).toBe('E2E Test Token');
          });
      });

      it('should list tokens', () => {
        return request(app.getHttpServer())
          .get('/tokens')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
          });
      });
    });

    describe('Transactions API', () => {
      it('should create a transaction', () => {
        const createTransactionDto = {
          instructions: [
            {
              programId: '11111111111111111111111111111112',
              accounts: [],
              data: Buffer.from('test-instruction-data').toString('base64'),
            },
          ],
        };

        return request(app.getHttpServer())
          .post('/transactions')
          .send(createTransactionDto)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('signature');
          });
      });

      it('should list transactions', () => {
        return request(app.getHttpServer())
          .get('/transactions')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
          });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent endpoints', () => {
      return request(app.getHttpServer()).get('/non-existent-endpoint').expect(404);
    });

    it('should handle invalid request data', () => {
      return request(app.getHttpServer())
        .post('/accounts')
        .send({ invalidField: 'invalid' })
        .expect(400);
    });
  });

  describe('Performance', () => {
    it('should respond within acceptable time', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer()).get('/health').expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should respond within 1 second
      expect(responseTime).toBeLessThan(1000);
    });
  });
});
