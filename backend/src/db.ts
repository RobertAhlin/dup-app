import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();
console.log('DATABASE_URL:', process.env.DATABASE_URL);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL as string,

  ssl: {
    rejectUnauthorized: false // Render requires this!
  }
});

export default pool;
