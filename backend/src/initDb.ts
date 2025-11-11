// backend/src/initDb.ts
import pool from './db';

const ADMIN_USER_ID = 1;   // ändra vid behov
const TEACHER_USER_ID = 2; // ändra vid behov
const STUDENT_USER_ID = 4; // ändra vid behov

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
      ON CONFLICT (name) DO NOTHING;
    `);

    // 2️⃣ Users (schema only)
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

    // 4️⃣ M2M: Enrollments (students ↔ courses)
    await client.query(`
      CREATE TABLE IF NOT EXISTS course_enrollments (
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id   INTEGER NOT NULL REFERENCES course(id) ON DELETE CASCADE,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, course_id)
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_course_enrollments_course
      ON course_enrollments (course_id);
    `);

    // 5️⃣ M2M: Teachers (teachers ↔ courses)
    await client.query(`
      CREATE TABLE IF NOT EXISTS course_teachers (
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id   INTEGER NOT NULL REFERENCES course(id) ON DELETE CASCADE,
        is_owner    BOOLEAN NOT NULL DEFAULT FALSE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, course_id)
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_course_teachers_course
      ON course_teachers (course_id);
    `);

    // Helpers
    const userExists = async (id: number) => {
      const { rows } = await client.query<{ c: number }>(
        `SELECT COUNT(*)::int AS c FROM users WHERE id = $1`,
        [id]
      );
      return rows[0]?.c === 1;
    };

    const teacherExists = await userExists(TEACHER_USER_ID);
    const studentExists = await userExists(STUDENT_USER_ID);

    // 6️⃣ Seed Courses (only if empty)
    const { rows: courseCountRows } = await client.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM course`
    );

    let courseIds: number[] = [];
    if (courseCountRows[0].c === 0) {
      const createdByValue = teacherExists ? TEACHER_USER_ID : null;
      const insert = await client.query<{ id: number }>(
        `
        INSERT INTO course (title, description, created_by, icon)
        VALUES
          ('Web Development', 'Learn HTML, CSS, and JavaScript to build basic websites.', $1, 'globe-alt'),
          ('Database Design', 'Understand relational databases and how to use SQL for querying and managing data.', $1, 'server'),
          ('Backend Development', 'Build scalable APIs using Express and Node.js.', $1, 'cube'),
          ('Frontend React', 'Learn React to build dynamic and responsive user interfaces.', $1, 'window'),
          ('Fullstack Project', 'Combine frontend and backend skills in a final fullstack project.', $1, 'rocket-launch')
        RETURNING id
        `,
        [createdByValue]
      );
      courseIds = insert.rows.map(r => r.id);
      console.log('✅ Courses seeded');
    } else {
      const { rows } = await client.query<{ id: number }>(
        `SELECT id FROM course ORDER BY id ASC`
      );
      courseIds = rows.map(r => r.id);
    }

    // 7️⃣ Koppla teacher ↔ courses (om teacher finns)
    if (teacherExists && courseIds.length > 0) {
      await client.query(
        `
        INSERT INTO course_teachers (user_id, course_id, is_owner)
        SELECT $1, c.id, TRUE
        FROM course c
        ON CONFLICT (user_id, course_id) DO NOTHING
        `,
        [TEACHER_USER_ID]
      );
      console.log('✅ course_teachers seeded (teacher ↔ courses, is_owner)');
    } else if (!teacherExists) {
      console.log('ℹ️ Skipping course_teachers seed: teacher user not found');
    }

    // 8️⃣ Enroll student i två kurser (om student finns)
    if (studentExists && courseIds.length >= 2) {
      await client.query(
        `
        INSERT INTO course_enrollments (user_id, course_id)
        VALUES ($1, $2), ($1, $3)
        ON CONFLICT (user_id, course_id) DO NOTHING
        `,
        [STUDENT_USER_ID, courseIds[0], courseIds[1]]
      );
      console.log('✅ course_enrollments seeded (student enrolled in two courses)');
    } else if (!studentExists) {
      console.log('ℹ️ Skipping enrollments: student user not found');
    }

    await client.query('COMMIT');
    console.log('✅ DB init complete: schema up-to-date and initial data inserted');
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
