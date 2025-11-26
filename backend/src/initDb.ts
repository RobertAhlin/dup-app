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

    // Add last_login_at column if it doesn't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'last_login_at'
        ) THEN
          ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
        END IF;
      END$$;
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
    
    // Add is_locked column if it doesn't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'course' AND column_name = 'is_locked'
        ) THEN
          ALTER TABLE course ADD COLUMN is_locked BOOLEAN DEFAULT FALSE;
        END IF;
      END$$;
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

    // ─────────────────────────────────────────────────────────────
    // 📚 Course Builder (graph) schema
    // ─────────────────────────────────────────────────────────────

    // Enums (robust creation)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_type') THEN
          CREATE TYPE task_type AS ENUM ('content','quiz','assignment','reflection');
        END IF;
      END$$;
    `);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'unlock_rule') THEN
          CREATE TYPE unlock_rule AS ENUM ('all_tasks_complete','min_hub_score','custom');
        END IF;
      END$$;
    `);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
          CREATE TYPE task_status AS ENUM ('not_started','in_progress','completed');
        END IF;
      END$$;
    `);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hub_state') THEN
          CREATE TYPE hub_state AS ENUM ('locked','unlocked','completed');
        END IF;
      END$$;
    `);

    // Hubs (big circles)
    await client.query(`
      CREATE TABLE IF NOT EXISTS hub (
        id           SERIAL PRIMARY KEY,
        course_id    INTEGER NOT NULL REFERENCES course(id) ON DELETE CASCADE,
        title        TEXT NOT NULL,
        description  TEXT,
        x            INTEGER NOT NULL,
        y            INTEGER NOT NULL,
        color        TEXT DEFAULT '#3498db',
        radius       INTEGER DEFAULT 100,
        quiz_id      INTEGER,          -- optional: link to your quiz table
        is_required  BOOLEAN DEFAULT TRUE,
        is_start     BOOLEAN DEFAULT FALSE,
        created_at   TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_hub_course ON hub(course_id);`);
    // Ensure column exists if table pre-dated this field
    await client.query(`ALTER TABLE hub ADD COLUMN IF NOT EXISTS is_start BOOLEAN DEFAULT FALSE;`);
    // Add content payload support for hubs (similar to tasks)
    await client.query(`ALTER TABLE hub ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;`);
    // Enforce at most one starting hub per course
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'uniq_start_hub_per_course'
        ) THEN
          CREATE UNIQUE INDEX uniq_start_hub_per_course ON hub (course_id) WHERE is_start = TRUE;
        END IF;
      END$$;
    `);

    // Tasks (small circles attached to hubs)
    await client.query(`
      CREATE TABLE IF NOT EXISTS task (
        id                    SERIAL PRIMARY KEY,
        hub_id                INTEGER NOT NULL REFERENCES hub(id) ON DELETE CASCADE,
        title                 TEXT NOT NULL,
        task_kind             task_type NOT NULL,                    -- renamed from "type"
        is_required           BOOLEAN DEFAULT TRUE,
        order_index           INTEGER DEFAULT 0,
        payload               JSONB NOT NULL DEFAULT '{}'::jsonb,     -- TipTap JSON etc.
        -- Draft/Publish
        is_published          BOOLEAN DEFAULT FALSE,
        payload_published     JSONB DEFAULT NULL,                     -- snapshot at publish
        -- Layout (optional, relative to hub center)
        x                     INTEGER,
        y                     INTEGER,
        -- Completion rules
        completion_rule       TEXT NOT NULL DEFAULT 'manual',         -- 'manual'|'min_score'|'duration'|'submit'|'teacher'
        completion_criteria   JSONB NOT NULL DEFAULT '{}'::jsonb,
        -- If task is a quiz, link it here (optional)
        quiz_id               INTEGER,
        created_at            TIMESTAMP DEFAULT NOW(),
        updated_at            TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_task_hub ON task(hub_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_task_published ON task(is_published);`);

    // Directed edges between hubs
    await client.query(`
      CREATE TABLE IF NOT EXISTS hub_edge (
        id            SERIAL PRIMARY KEY,
        course_id     INTEGER NOT NULL REFERENCES course(id) ON DELETE CASCADE,
        from_hub_id   INTEGER NOT NULL REFERENCES hub(id) ON DELETE CASCADE,
        to_hub_id     INTEGER NOT NULL REFERENCES hub(id) ON DELETE CASCADE,
        rule          unlock_rule NOT NULL DEFAULT 'all_tasks_complete',
        rule_value    JSONB NOT NULL DEFAULT '{}'::jsonb,
        UNIQUE (from_hub_id, to_hub_id)
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_hub_edge_course ON hub_edge(course_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_hub_edge_from ON hub_edge(from_hub_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_hub_edge_to   ON hub_edge(to_hub_id);`);

    // Per-user task progress
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_progress (
        id           SERIAL PRIMARY KEY,
        user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        task_id      INTEGER NOT NULL REFERENCES task(id) ON DELETE CASCADE,
        status       task_status NOT NULL DEFAULT 'not_started',
        score        NUMERIC,
        completed_at TIMESTAMP,
        updated_at   TIMESTAMP DEFAULT NOW(),
        UNIQUE (user_id, task_id)
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_task_progress_user ON task_progress(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_task_progress_task ON task_progress(task_id);`);

    // Per-user hub state (cached unlock state)
    await client.query(`
      CREATE TABLE IF NOT EXISTS hub_user_state (
        user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        hub_id       INTEGER NOT NULL REFERENCES hub(id) ON DELETE CASCADE,
        state        hub_state NOT NULL DEFAULT 'locked',
        unlocked_at  TIMESTAMP,
        completed_at TIMESTAMP,
        PRIMARY KEY (user_id, hub_id)
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_hub_user_state_hub ON hub_user_state(hub_id);`);

    // Trigger to keep task.updated_at fresh
    await client.query(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await client.query(`
      DROP TRIGGER IF EXISTS trg_task_updated_at ON task;
      CREATE TRIGGER trg_task_updated_at
      BEFORE UPDATE ON task
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);

    // ─────────────────────────────────────────────────────────────
    // 📝 Quiz System Schema
    // ─────────────────────────────────────────────────────────────

    // Quizzes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz (
        id                    SERIAL PRIMARY KEY,
        course_id             INTEGER NOT NULL REFERENCES course(id) ON DELETE CASCADE,
        hub_id                INTEGER REFERENCES hub(id) ON DELETE SET NULL,
        title                 TEXT NOT NULL,
        description           TEXT,
        questions_per_attempt INTEGER NOT NULL DEFAULT 3 CHECK (questions_per_attempt IN (3, 5)),
        created_at            TIMESTAMP DEFAULT NOW(),
        updated_at            TIMESTAMP DEFAULT NOW(),
        UNIQUE(course_id, title)
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_quiz_course ON quiz(course_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_quiz_hub ON quiz(hub_id);`);

    // Questions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_question (
        id          SERIAL PRIMARY KEY,
        quiz_id     INTEGER NOT NULL REFERENCES quiz(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        order_index INTEGER DEFAULT 0,
        created_at  TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_quiz_question_quiz ON quiz_question(quiz_id);`);

    // Answers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_answer (
        id          SERIAL PRIMARY KEY,
        question_id INTEGER NOT NULL REFERENCES quiz_question(id) ON DELETE CASCADE,
        answer_text TEXT NOT NULL,
        is_correct  BOOLEAN NOT NULL DEFAULT FALSE,
        order_index INTEGER DEFAULT 0,
        created_at  TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_quiz_answer_question ON quiz_answer(question_id);`);

    // Quiz attempts tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_attempt (
        id                SERIAL PRIMARY KEY,
        quiz_id           INTEGER NOT NULL REFERENCES quiz(id) ON DELETE CASCADE,
        user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        hub_id            INTEGER REFERENCES hub(id) ON DELETE SET NULL,
        started_at        TIMESTAMP DEFAULT NOW(),
        submitted_at      TIMESTAMP,
        questions_shown   JSONB NOT NULL DEFAULT '[]'::jsonb,
        answers_submitted JSONB NOT NULL DEFAULT '[]'::jsonb,
        passed            BOOLEAN,
        score             INTEGER,
        created_at        TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_quiz_attempt_quiz ON quiz_attempt(quiz_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_quiz_attempt_user ON quiz_attempt(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_quiz_attempt_hub ON quiz_attempt(hub_id);`);

    // Update quiz.updated_at trigger
    await client.query(`
      DROP TRIGGER IF EXISTS trg_quiz_updated_at ON quiz;
      CREATE TRIGGER trg_quiz_updated_at
      BEFORE UPDATE ON quiz
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);

    // Add foreign key constraint from hub to quiz (if not exists)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'fk_hub_quiz' AND table_name = 'hub'
        ) THEN
          ALTER TABLE hub ADD CONSTRAINT fk_hub_quiz FOREIGN KEY (quiz_id) REFERENCES quiz(id) ON DELETE SET NULL;
        END IF;
      END$$;
    `);

    // ─────────────────────────────────────────────────────────────
    // 🎓 Certificate System Schema
    // ─────────────────────────────────────────────────────────────

    await client.query(`
      CREATE TABLE IF NOT EXISTS certificate (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id  INTEGER NOT NULL REFERENCES course(id) ON DELETE CASCADE,
        issued_at  TIMESTAMP DEFAULT NOW(),
        UNIQUE (user_id, course_id)
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_certificate_user ON certificate(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_certificate_course ON certificate(course_id);`);

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

    // 7️⃣ Connect teacher ↔ courses
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

    // 8️⃣ Enroll student in two courses (if student exists)
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
