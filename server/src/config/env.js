import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Priority 1: Current working directory .env
dotenv.config();

// Priority 2: server directory .env (if executed from root or child)
const serverEnvPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath, override: false });
}

// Ensure single consistent variable name
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (mongoUri && !process.env.MONGODB_URI) {
  process.env.MONGODB_URI = mongoUri;
}

export function validateConfig() {
  if (!process.env.MONGODB_URI || typeof process.env.MONGODB_URI !== 'string' || !process.env.MONGODB_URI.trim()) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ CONFIGURATION ERROR: MongoDB URI is missing or undefined.');
    console.error('Please configure MONGODB_URI in your server/.env file.');
    console.error('Example: MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname');
    console.error('='.repeat(60) + '\n');
    throw new Error('MongoDB configuration missing: MONGODB_URI is undefined or empty.');
  }

  if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET is not set; falling back to default secret (not recommended for production).');
    process.env.JWT_SECRET = 'threads_of_chaithu_secret_default_key_fallback';
  }

  return {
    port: process.env.PORT || 5000,
    mongoUri: process.env.MONGODB_URI,
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    adminEmail: (process.env.ADMIN_EMAIL || 'admin@threadsofchaithu.example').toLowerCase(),
    adminInitialPassword: process.env.ADMIN_INITIAL_PASSWORD || 'Admin123',
    adminName: process.env.ADMIN_NAME || 'Boutique Admin',
    upiId: process.env.UPI_ID || 'threadsofchaithu@oksbi',
    upiName: process.env.UPI_PAYEE_NAME || 'Threads of Chaithu Boutique'
  };
}

export default validateConfig;
