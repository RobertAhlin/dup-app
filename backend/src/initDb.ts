import pool from './db';

async function initDb() {
  try {
    // 1. Create roles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL
      );
    `);

    // 2. Seed default roles
    await pool.query(`
      INSERT INTO roles (name) VALUES
      ('admin'),
      ('teacher'),
      ('student')
      ON CONFLICT DO NOTHING;
    `);

    // 3. Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role_id INTEGER REFERENCES roles(id),
        name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Roles and Users tables created and seeded');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during DB initialization:', err);
    process.exit(1);
  }
}

initDb();
