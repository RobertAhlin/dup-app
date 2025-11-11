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
        created_at  TIMESTAMP DEFAULT NOW()
      );
    `);

    // 4️⃣ Seed Courses
    const { rows } = await client.query('SELECT COUNT(*)::int AS c FROM course');
    if (rows[0].c === 0) {
      await client.query(`
        INSERT INTO course (title, description, created_by) VALUES
          ('Introduction to Web Development', 'Learn HTML, CSS, and JavaScript to build basic websites.', 1),
          ('Database Design & SQL', 'Understand relational databases and how to use SQL for querying and managing data.', 1),
          ('Backend Development with Node.js', 'Build scalable APIs using Express and Node.js.', 1),
          ('Frontend Frameworks with React', 'Learn React to build dynamic and responsive user interfaces.', 2),
          ('Fullstack Project: Build a Web App', 'Combine frontend and backend skills in a final fullstack project.', 2);
      `);
      console.log('✅ Courses seeded with created_by values');
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
