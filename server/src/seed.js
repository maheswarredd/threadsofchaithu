import './config/env.js';
import validateConfig from './config/env.js';
import mongoose from 'mongoose';
import { ensureAdminAndSeed } from './services/adminService.js';

async function runSeed() {
  let config;
  try {
    config = validateConfig();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB for manual seed...');
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB:', mongoose.connection.name);

    await ensureAdminAndSeed();

    console.log('🌱 Seeding process completed successfully.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed execution failed:', err.message);
    process.exit(1);
  }
}

runSeed();
