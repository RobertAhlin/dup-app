import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Configure pg to parse timestamps as UTC
import pg from 'pg';
const types = pg.types;
// Override the default timestamp parser (type ID 1114 is TIMESTAMP)
types.setTypeParser(1114, (str) => new Date(str + 'Z'));

//console.log('DATABASE_URL:', process.env.DATABASE_URL);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL as string,

  ssl: {
    rejectUnauthorized: false // Render requires this!
  }
});

export default pool;
