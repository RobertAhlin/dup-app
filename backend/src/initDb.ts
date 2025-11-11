import pool from './db';

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1️⃣ Roles
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id   SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL
      );
    `);

    await client.query(`
      INSERT INTO roles (name) VALUES
        ('admin'),
        ('teacher'),
        ('student')
      ON CONFLICT DO NOTHING;
    `);

    // 2️⃣ Users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        email         VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role_id       INTEGER REFERENCES roles(id),
        name          VARCHAR(100),
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3️⃣ Courses
    await client.query(`
      CREATE TABLE IF NOT EXISTS course (
        id          SERIAL PRIMARY KEY,
        title       TEXT NOT NULL,
        description TEXT,
        created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
        icon        VARCHAR(50), 
        created_at  TIMESTAMP DEFAULT NOW()
      );
    `);

    // 4️⃣ Seed Courses
    const { rows } = await client.query('SELECT COUNT(*)::int AS c FROM course');
      if (rows[0].c === 0) {
        await client.query(`
          INSERT INTO course (title, description, created_by, icon) VALUES
            ('Web Development', 'Learn HTML, CSS, and JavaScript to build basic websites.', 1, 'globe-alt'),
            ('Database Design', 'Understand relational databases and how to use SQL for querying and managing data.', 1, 'server'),
            ('Backend Development', 'Build scalable APIs using Express and Node.js.', 1, 'cube'),
            ('Frontend React', 'Learn React to build dynamic and responsive user interfaces.', 2, 'window'),
            ('Fullstack Project', 'Combine frontend and backend skills in a final fullstack project.', 2, 'rocket-launch');
        `);
        console.log('✅ Courses seeded with created_by values and icons');
      } else {
      console.log('ℹ️ Courses already present, skipping seed');
    }

    await client.query('COMMIT');
    console.log('✅ Roles, Users, and Courses tables created/verified');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during DB initialization:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

initDb();
