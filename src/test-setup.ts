// Jest setup file for blockchain mocks
import { setupSplTokenMocks } from './__mocks__/spl-token.mock';
import { setupWeb3Mocks } from './__mocks__/web3.mock';

// Setup all mocks globally
setupSplTokenMocks();
setupWeb3Mocks();

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USERNAME = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_DATABASE = 'test';
process.env.SOLANA_RPC_URL = 'http://mock-solana-endpoint';
process.env.JAEGER_ENDPOINT = 'http://mock-jaeger-endpoint';

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  Object.assign(console, originalConsole);
});

// Global test timeout
jest.setTimeout(30000);
