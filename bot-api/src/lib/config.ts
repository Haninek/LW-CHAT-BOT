import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenvConfig();

const configSchema = z.object({
  // Server
  server: z.object({
    port: z.coerce.number().default(8080),
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
    maxRequestSize: z.string().default('2mb'),
  }),
  
  // JWT
  jwt: z.object({
    secret: z.string().min(32, 'JWT secret must be at least 32 characters'),
    issuer: z.string().default('lw-bot'),
    ttlMinutes: z.coerce.number().default(30),
  }),
  
  // API Keys
  apiKeys: z.object({
    partner: z.string().min(1, 'Partner API key is required'),
  }),
  
  // OpenAI
  openai: z.object({
    apiKey: z.string().min(1, 'OpenAI API key is required'),
    modelParse: z.string().default('gpt-4o-mini'),
    modelReason: z.string().default('gpt-4o-mini'),
  }),
  
  // Plaid
  plaid: z.object({
    clientId: z.string().min(1, 'Plaid client ID is required'),
    secret: z.string().min(1, 'Plaid secret is required'),
    env: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
    products: z.string().default('transactions,statements'),
  }),
  
  // Cherry SMS
  cherry: z.object({
    apiKey: z.string().min(1, 'Cherry SMS API key is required'),
    baseUrl: z.string().url().default('https://api.cherrysms.com'),
    webhookSecret: z.string().optional(),
  }),
  
  // E-Sign (at least one required)
  esign: z.object({
    provider: z.enum(['docusign', 'dropbox']).default('docusign'),
    docusign: z.object({
      accountId: z.string().optional(),
      token: z.string().optional(),
      base: z.string().url().default('https://demo.docusign.net'),
    }).optional(),
    dropbox: z.object({
      apiKey: z.string().optional(),
    }).optional(),
  }),
  
  // Background Check
  background: z.object({
    provider: z.string().default('clear'),
    clear: z.object({
      apiKey: z.string().optional(),
      baseUrl: z.string().url().default('https://api.clear.com'),
    }).optional(),
  }),
  
  // Database
  database: z.object({
    url: z.string().url().optional(),
    host: z.string().default('localhost'),
    port: z.coerce.number().default(3306),
    name: z.string().default('lendwizely_bot'),
    user: z.string().default('root'),
    password: z.string().default(''),
  }),
  
  // Redis
  redis: z.object({
    url: z.string().optional(),
    host: z.string().default('localhost'),
    port: z.coerce.number().default(6379),
    password: z.string().optional(),
  }),
  
  // Webhooks
  webhooks: z.object({
    publicBaseUrl: z.string().url().default('https://api.yourbot.com'),
    lendwizelyUrl: z.string().url().optional(),
  }),
  
  // CORS
  cors: z.object({
    origin: z.string().default('https://app.lendwizely.com'),
    credentials: z.boolean().default(true),
  }),
  
  // Rate Limiting
  rateLimit: z.object({
    windowMs: z.coerce.number().default(15 * 60 * 1000), // 15 minutes
    maxRequests: z.coerce.number().default(100),
  }),
  
  // File Upload
  upload: z.object({
    maxFileSize: z.coerce.number().default(25 * 1024 * 1024), // 25MB
  }),
});

// Parse and validate configuration
const rawConfig = {
  server: {
    port: process.env.PORT,
    nodeEnv: process.env.NODE_ENV,
    maxRequestSize: process.env.MAX_REQUEST_SIZE_MB ? `${process.env.MAX_REQUEST_SIZE_MB}mb` : undefined,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    issuer: process.env.JWT_ISSUER,
    ttlMinutes: process.env.JWT_TTL_MIN,
  },
  apiKeys: {
    partner: process.env.API_KEY_PARTNER,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    modelParse: process.env.OPENAI_MODEL_PARSE,
    modelReason: process.env.OPENAI_MODEL_REASON,
  },
  plaid: {
    clientId: process.env.PLAID_CLIENT_ID,
    secret: process.env.PLAID_SECRET,
    env: process.env.PLAID_ENV,
    products: process.env.PLAID_PRODUCTS,
  },
  cherry: {
    apiKey: process.env.CHERRY_API_KEY,
    baseUrl: process.env.CHERRY_BASE_URL,
    webhookSecret: process.env.CHERRY_WEBHOOK_SECRET,
  },
  esign: {
    provider: process.env.ESIGN_PROVIDER || 'docusign',
    docusign: {
      accountId: process.env.DOCUSIGN_ACCOUNT_ID,
      token: process.env.DOCUSIGN_TOKEN,
      base: process.env.DOCUSIGN_BASE,
    },
    dropbox: {
      apiKey: process.env.DROPBOX_SIGN_API_KEY,
    },
  },
  background: {
    provider: process.env.BACKGROUND_PROVIDER || 'clear',
    clear: {
      apiKey: process.env.CLEAR_API_KEY,
      baseUrl: process.env.CLEAR_BASE_URL,
    },
  },
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
  },
  webhooks: {
    publicBaseUrl: process.env.PUBLIC_BASE_URL,
    lendwizelyUrl: process.env.LENDWIZELY_WEBHOOK_URL,
  },
  cors: {
    origin: process.env.CORS_ORIGIN,
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },
  rateLimit: {
    windowMs: process.env.RATE_LIMIT_WINDOW_MS,
    maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,
  },
  upload: {
    maxFileSize: process.env.MAX_FILE_SIZE_MB,
  },
};

export const config = configSchema.parse(rawConfig);

// Validate provider-specific configurations
if (config.esign.provider === 'docusign') {
  if (!config.esign.docusign?.accountId || !config.esign.docusign?.token) {
    throw new Error('DocuSign account ID and token are required when using DocuSign provider');
  }
} else if (config.esign.provider === 'dropbox') {
  if (!config.esign.dropbox?.apiKey) {
    throw new Error('Dropbox Sign API key is required when using Dropbox provider');
  }
}

if (config.background.provider === 'clear') {
  if (!config.background.clear?.apiKey) {
    console.warn('Clear API key not provided, background checks will be simulated');
  }
}