import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // fallback to local cwd .env

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('5000'),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/securechainflow'),
  USE_IN_MEMORY_DB: z.string().transform(v => v === 'true').default('true'),
  JWT_SECRET: z.string().min(16).default('securechainflow_default_dev_secret_key_change_in_prod'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  BCRYPT_ROUNDS: z.string().transform(Number).default('10'),
  AI_SERVICE_URL: z.string().default('http://localhost:8000'),
  OBJECT_STORAGE_PROVIDER: z.string().default('local'),
  OBJECT_STORAGE_BUCKET: z.string().default('securechainflow-documents'),
  FABRIC_USE_MOCK_GATEWAY: z.string().transform(v => v === 'true').default('true'),
  FABRIC_CONNECTION_PROFILE: z.string().default('blockchain/network/connection-org1.json'),
  FABRIC_WALLET_PATH: z.string().default('blockchain/network/wallet'),
  FABRIC_CHANNEL_NAME: z.string().default('mychannel'),
  FABRIC_CHAINCODE_NAME: z.string().default('securechainflow'),
  FABRIC_MSP_ID: z.string().default('Org1MSP'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
