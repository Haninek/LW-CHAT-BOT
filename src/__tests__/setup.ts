// Jest setup file
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set default test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.CORS_ORIGIN = 'https://test.lendwizely.com';
process.env.API_KEY_PARTNER = 'test-api-key';
process.env.JWT_ISSUER = 'test-lw-bot';
process.env.JWT_TTL_MIN = '30';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.OPENAI_MODEL_PARSE = 'gpt-4o-mini';
process.env.PLAID_CLIENT_ID = 'test-plaid-client-id';
process.env.PLAID_SECRET = 'test-plaid-secret';
process.env.PLAID_ENV = 'sandbox';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};