import * as dotenv from 'dotenv';
import { start } from './src/app.mjs';

dotenv.config();

if (process.argv.includes('--testing')) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS_TESTING
}

start();

