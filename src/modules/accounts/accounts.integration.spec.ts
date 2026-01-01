import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TestUtils } from '../../test-utils';
import { AccountsModule } from './accounts.module';

describe('Accounts (Integration)', () => {
  let app: INestApplication;
  let testUtils: typeof TestUtils;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await TestUtils.createTestingModule({
      imports: [AccountsModule],
    });

    app = moduleFixture.createNestApplication();
    await app.init();

    testUtils = TestUtils;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/accounts (GET)', () => {
    it('should return accounts array', () => {
      return request(app.getHttpServer())
        .get('/accounts')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/accounts (POST)', () => {
    it('should create a new account', () => {
      const createAccountDto = {
        address: '11111111111111111111111111111112',
        owner: 'test-owner',
      };

      return request(app.getHttpServer())
        .post('/accounts')
        .send(createAccountDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.address).toBe(createAccountDto.address);
          expect(res.body.owner).toBe(createAccountDto.owner);
        });
    });

    it('should validate required fields', () => {
      return request(app.getHttpServer())
        .post('/accounts')
        .send({})
        .expect(400);
    });
  });

  describe('/accounts/:id (GET)', () => {
    it('should return account by id', async () => {
      // First create an account
      const createAccountDto = {
        address: '22222222222222222222222222222222',
        owner: 'test-owner-2',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/accounts')
        .send(createAccountDto)
        .expect(201);

      const accountId = createResponse.body.id;

      // Then retrieve it
      return request(app.getHttpServer())
        .get(`/accounts/${accountId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(accountId);
          expect(res.body.address).toBe(createAccountDto.address);
          expect(res.body.owner).toBe(createAccountDto.owner);
        });
    });

    it('should return 404 for non-existent account', () => {
      return request(app.getHttpServer())
        .get('/accounts/non-existent-id')
        .expect(404);
    });
  });

  describe('/accounts/:id (PUT)', () => {
    it('should update account', async () => {
      // First create an account
      const createAccountDto = {
        address: '33333333333333333333333333333333',
        owner: 'test-owner-3',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/accounts')
        .send(createAccountDto)
        .expect(201);

      const accountId = createResponse.body.id;
      const updateDto = {
        owner: 'updated-owner',
      };

      // Then update it
      return request(app.getHttpServer())
        .put(`/accounts/${accountId}`)
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(accountId);
          expect(res.body.owner).toBe(updateDto.owner);
        });
    });
  });

  describe('/accounts/:id (DELETE)', () => {
    it('should delete account', async () => {
      // First create an account
      const createAccountDto = {
        address: '44444444444444444444444444444444',
        owner: 'test-owner-4',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/accounts')
        .send(createAccountDto)
        .expect(201);

      const accountId = createResponse.body.id;

      // Then delete it
      await request(app.getHttpServer())
        .delete(`/accounts/${accountId}`)
        .expect(200);

      // Verify it's deleted
      return request(app.getHttpServer())
        .get(`/accounts/${accountId}`)
        .expect(404);
    });
  });
});