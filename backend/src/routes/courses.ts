import { Router } from 'express';
import pool from '../db';
import { verifyToken, AuthenticatedRequest } from '../middleware/verifyToken';
import { ensureAdmin } from '../middleware/roles';

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
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Determine role name
    const roleRes = await pool.query('SELECT r.name FROM roles r WHERE r.id = $1', [user.role_id]);
    const roleName = roleRes.rows[0]?.name;
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

// Read one with RBAC visibility enforcement
router.get('/:id', verifyToken, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const roleRes = await pool.query('SELECT r.name FROM roles r WHERE r.id = $1', [user.role_id]);
    const roleName = roleRes.rows[0]?.name;
    if (!roleName) {
      res.status(403).json({ error: 'Role not found' });
      return;
    }

    // Always fetch course basic data
    const courseRes = await pool.query(
      `SELECT c.id, c.title, c.description, c.created_at, c.created_by, c.icon,
              u.name AS creator_name
       FROM course c
       LEFT JOIN users u ON u.id = c.created_by
       WHERE c.id = $1`,
      [id]
    );
    if (!courseRes.rows.length) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }
    const course = courseRes.rows[0];

    let allowed = false;
    if (roleName === 'admin') {
      allowed = true;
    } else if (roleName === 'teacher') {
      // Ownership check
      const ownRes = await pool.query(
        `SELECT 1 FROM course_teachers WHERE course_id = $1 AND user_id = $2 AND is_owner = TRUE`,
        [id, user.id]
      );
      allowed = ownRes.rows.length > 0 || course.created_by === user.id;
    } else if (roleName === 'student') {
      const enrRes = await pool.query(
        `SELECT 1 FROM course_enrollments WHERE course_id = $1 AND user_id = $2`,
        [id, user.id]
      );
      allowed = enrRes.rows.length > 0;
    }

    if (!allowed) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

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
