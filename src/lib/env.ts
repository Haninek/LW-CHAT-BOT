import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const envSchema = z.object({
  // Server Configuration
  PORT: z.string().default('8080').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // CORS Configuration
  CORS_ORIGIN: z.string().default('*'),
  
  // API Authentication
  API_KEY_PARTNER: z.string().default('development-key'),
  
  // JWT Configuration
  JWT_ISSUER: z.string().default('lw-bot'),
  JWT_TTL_MIN: z.string().default('30').transform(Number),
  
  // OpenAI Configuration
  OPENAI_API_KEY: z.string().default('placeholder-openai-key'),
  OPENAI_MODEL_PARSE: z.string().default('gpt-4o-mini'),
  
  // Plaid Configuration
  PLAID_CLIENT_ID: z.string().default('placeholder-plaid-client-id'),
  PLAID_SECRET: z.string().default('placeholder-plaid-secret'),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
  
  // Database Configuration
  DATABASE_URL: z.string().default('sqlite:///./data.db'),
  
  // Encryption Configuration
  ENCRYPTION_KEY: z.string().default('94870efa56b3a057c2c7de8899f1b2968a43559fea8442f1bda525f0b68ebadc'),
  
  // Cherry SMS Configuration
  CHERRY_BASE_URL: z.string().url().default('https://api.cherrysms.com'),
  CHERRY_API_KEY: z.string().optional(),
  
  // E-Signature Configuration
  SIGN_PROVIDER: z.enum(['docusign', 'dropboxsign']).default('docusign'),
  
  // DocuSign Configuration
  DOCUSIGN_BASE: z.string().url().default('https://demo.docusign.net'),
  DOCUSIGN_ACCOUNT_ID: z.string().optional(),
  DOCUSIGN_TOKEN: z.string().optional(),
  
  // Dropbox Sign Configuration
  DROPBOX_SIGN_API_KEY: z.string().optional(),
  
  // Webhook Configuration
  LENDWIZELY_WEBHOOK_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
  
  // Validate provider-specific requirements in production
  if (env.NODE_ENV === 'production') {
    if (env.SIGN_PROVIDER === 'docusign') {
      if (!env.DOCUSIGN_TOKEN || !env.DOCUSIGN_ACCOUNT_ID) {
        throw new Error('DOCUSIGN_TOKEN and DOCUSIGN_ACCOUNT_ID are required when SIGN_PROVIDER=docusign');
      }
    } else if (env.SIGN_PROVIDER === 'dropboxsign') {
      if (!env.DROPBOX_SIGN_API_KEY) {
        throw new Error('DROPBOX_SIGN_API_KEY is required when SIGN_PROVIDER=dropboxsign');
      }
    }
  }
} catch (error) {
  if (error instanceof z.ZodError) {
    const missingVars = error.errors.map(err => {
      const path = err.path.join('.');
      return `${path}: ${err.message}`;
    });
    
    console.error('❌ Environment validation failed:');
    missingVars.forEach(msg => console.error(`  - ${msg}`));
    console.error('\n💡 Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
  throw error;
}

// Log successful validation (without sensitive values)
const logEnv = {
  ...env,
  API_KEY_PARTNER: env.API_KEY_PARTNER ? '[SET]' : '[NOT SET]',
  OPENAI_API_KEY: env.OPENAI_API_KEY ? '[SET]' : '[NOT SET]',
  PLAID_SECRET: env.PLAID_SECRET ? '[SET]' : '[NOT SET]',
  DATABASE_URL: env.DATABASE_URL.includes('sqlite') ? '[SQLITE]' : '[OTHER]',
  ENCRYPTION_KEY: env.ENCRYPTION_KEY ? '[SET]' : '[NOT SET]',
  CHERRY_BASE_URL: env.CHERRY_BASE_URL,
  CHERRY_API_KEY: env.CHERRY_API_KEY ? '[SET]' : '[NOT SET]',
  SIGN_PROVIDER: env.SIGN_PROVIDER,
  DOCUSIGN_BASE: env.DOCUSIGN_BASE,
  DOCUSIGN_ACCOUNT_ID: env.DOCUSIGN_ACCOUNT_ID ? '[SET]' : '[NOT SET]',
  DOCUSIGN_TOKEN: env.DOCUSIGN_TOKEN ? '[SET]' : '[NOT SET]',
  DROPBOX_SIGN_API_KEY: env.DROPBOX_SIGN_API_KEY ? '[SET]' : '[NOT SET]',
};

if (env.NODE_ENV === 'development') {
  console.log('✅ Environment validation passed:', logEnv);
}

export { env };