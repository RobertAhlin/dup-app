import { Router } from 'express';
import pool from '../db';
import { verifyToken, AuthenticatedRequest } from '../middleware/verifyToken';
import { ensureAdmin } from '../middleware/roles';
import { getRoleName, canViewCourse, AuthUser } from './helpers/courseAccess';

const router = Router();

// Create
router.post('/', verifyToken, ensureAdmin, async (req: AuthenticatedRequest, res) => {
  const { title, description, icon } = req.body as { title?: string; description?: string; icon?: string };
  if (!title) {
    res.status(400).json({ error: 'title is required' });
    return;
  }
  try {
    const created_by = req.user?.id ?? null;
    const result = await pool.query(
      `INSERT INTO course (title, description, created_by, icon)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, description, created_by, icon, created_at`,
      [title, description ?? null, created_by, icon ?? null]
    );
    const inserted = result.rows[0];
    // fetch creator name
    const ures = inserted.created_by ? await pool.query('SELECT name FROM users WHERE id = $1', [inserted.created_by]) : { rows: [{ name: null }] };
    res.status(201).json({ course: { ...inserted, creator_name: ures.rows[0]?.name ?? null } });
  } catch (err) {
    console.error('Create course error:', err);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// Read all with RBAC filtering
// admin: all courses
// teacher: courses they own (created_by = user.id OR course_teachers.is_owner)
// student: courses they are enrolled in (course_enrollments)
router.get('/', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const roleName = await getRoleName(user.role_id);
    if (!roleName) {
      res.status(403).json({ error: 'Role not found' });
      return;
    }

    let rows: any[] = [];
    if (roleName === 'admin') {
      const result = await pool.query(
        `SELECT c.id, c.title, c.description, c.created_at, c.created_by, c.icon,
                u.name AS creator_name
         FROM course c
         LEFT JOIN users u ON u.id = c.created_by
         ORDER BY c.created_at DESC`
      );
      rows = result.rows;
    } else if (roleName === 'teacher') {
      const result = await pool.query(
        `SELECT DISTINCT c.id, c.title, c.description, c.created_at, c.created_by, c.icon,
                u.name AS creator_name
         FROM course c
         LEFT JOIN users u ON u.id = c.created_by
         LEFT JOIN course_teachers ct ON ct.course_id = c.id AND ct.user_id = $1 AND ct.is_owner = TRUE
         WHERE c.created_by = $1 OR ct.user_id = $1
         ORDER BY c.created_at DESC`,
        [user.id]
      );
      rows = result.rows;
    } else if (roleName === 'student') {
      const result = await pool.query(
        `SELECT c.id, c.title, c.description, c.created_at, c.created_by, c.icon,
                u.name AS creator_name
         FROM course c
         JOIN course_enrollments ce ON ce.course_id = c.id AND ce.user_id = $1
         LEFT JOIN users u ON u.id = c.created_by
         ORDER BY c.created_at DESC`,
        [user.id]
      );
      rows = result.rows;
    } else {
      // Unknown role -> no courses
      rows = [];
    }

    res.json({ courses: rows });
  } catch (err) {
    console.error('List courses error:', err);
    res.status(500).json({ error: 'Failed to list courses' });
  }
});

router.get('/:id/graph', verifyToken, async (req: AuthenticatedRequest, res) => {
  const courseId = Number(req.params.id);
  if (!Number.isInteger(courseId)) {
    res.status(400).json({ error: 'Invalid course id' });
    return;
  }

  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const allowed = await canViewCourse(user, courseId);
    if (!allowed) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const [hubsRes, tasksRes, edgesRes] = await Promise.all([
      pool.query(
        `SELECT id, course_id, title, x, y, color, radius
         FROM hub
         WHERE course_id = $1
         ORDER BY id`,
        [courseId]
      ),
      pool.query(
        `SELECT t.id, t.hub_id, t.title, t.task_kind, t.x, t.y
         FROM task t
         JOIN hub h ON h.id = t.hub_id
         WHERE h.course_id = $1
         ORDER BY t.id`,
        [courseId]
      ),
      pool.query(
        `SELECT id, course_id, from_hub_id, to_hub_id
         FROM hub_edge
         WHERE course_id = $1
         ORDER BY id`,
        [courseId]
      ),
    ]);

    res.json({
      graph: {
        hubs: hubsRes.rows,
        tasks: tasksRes.rows,
        edges: edgesRes.rows,
      },
    });
  } catch (err) {
    console.error('Get course graph error:', err);
    res.status(500).json({ error: 'Failed to load course graph' });
  }
});

// Read one with RBAC visibility enforcement
router.get('/:id', verifyToken, async (req: AuthenticatedRequest, res) => {
  const courseId = Number(req.params.id);
  if (!Number.isInteger(courseId)) {
    res.status(400).json({ error: 'Invalid course id' });
    return;
  }
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const allowed = await canViewCourse(user, courseId);
    if (!allowed) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Always fetch course basic data
    const courseRes = await pool.query(
      `SELECT c.id, c.title, c.description, c.created_at, c.created_by, c.icon,
              u.name AS creator_name
       FROM course c
       LEFT JOIN users u ON u.id = c.created_by
       WHERE c.id = $1`,
      [courseId]
    );
    if (!courseRes.rows.length) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }
    const course = courseRes.rows[0];

    res.json({ course });
  } catch (err) {
    console.error('Get course error:', err);
    res.status(500).json({ error: 'Failed to get course' });
  }
});

// Update
router.put('/:id', verifyToken, ensureAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, description, icon } = req.body as { title?: string; description?: string | null; icon?: string | null };
  try {
    const result = await pool.query(
      `UPDATE course
       SET title = COALESCE($1, title),
           description = $2,
           icon = COALESCE($3, icon)
       WHERE id = $4
       RETURNING id, title, description, created_at, created_by, icon`,
      [title ?? null, description ?? null, icon ?? null, id]
    );
    if (!result.rows.length) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }
    res.json({ course: result.rows[0] });
  } catch (err) {
    console.error('Update course error:', err);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// Delete
router.delete('/:id', verifyToken, ensureAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM course WHERE id = $1 RETURNING id`, [id]);
    if (!result.rows.length) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Delete course error:', err);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

export default router;
