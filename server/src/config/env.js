import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory or root if exists
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_job_agent',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production_key_12345',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  get AI_PROVIDER() {
    return (process.env.AI_PROVIDER || 'gemini').toLowerCase().trim();
  },
  set AI_PROVIDER(val) {
    process.env.AI_PROVIDER = val;
  },
  get AI_API_KEY() {
    return process.env.AI_API_KEY || '';
  },
  set AI_API_KEY(val) {
    process.env.AI_API_KEY = val;
  },
  get AI_MODEL() {
    const raw = process.env.AI_MODEL;
    if (this.AI_PROVIDER === 'gemini') {
      if (!raw || raw === 'gpt-4o-mini' || raw === 'gpt-4o' || raw === 'gemini-1.5-flash' || raw === 'gemini-3.5-flash') {
        return 'gemini-3.7-flash';
      }
      return raw;
    }
    if (!raw || raw.startsWith('gemini')) {
      return 'gpt-4o-mini';
    }
    return raw;
  },
  set AI_MODEL(val) {
    process.env.AI_MODEL = val;
  },
  get AI_BASE_URL() {
    const raw = process.env.AI_BASE_URL;
    if (this.AI_PROVIDER === 'gemini') {
      return raw || '';
    }
    if (!raw || raw.includes('generativelanguage.googleapis.com')) {
      return 'https://api.openai.com/v1';
    }
    return raw;
  },
  set AI_BASE_URL(val) {
    process.env.AI_BASE_URL = val;
  },
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 5,
};
