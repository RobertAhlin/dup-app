import { Router } from 'express';
import pool from '../db';
import { verifyToken, AuthenticatedRequest } from '../middleware/verifyToken';
import { ensureAdmin } from '../middleware/roles';

const router = Router();

// Create
router.post('/', verifyToken, ensureAdmin, async (req: AuthenticatedRequest, res) => {
  const { title, description } = req.body as { title?: string; description?: string };
  if (!title) {
    res.status(400).json({ error: 'title is required' });
    return;
  }
  try {
    const created_by = req.user?.id ?? null;
    const result = await pool.query(
      `INSERT INTO course (title, description, created_by)
       VALUES ($1, $2, $3)
       RETURNING id, title, description, created_by, created_at`,
      [title, description ?? null, created_by]
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

// Read all
// Public to authenticated users: list courses
router.get('/', verifyToken, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.title, c.description, c.created_at, c.created_by,
              u.name AS creator_name
       FROM course c
       LEFT JOIN users u ON u.id = c.created_by
       ORDER BY c.created_at DESC`
    );
    res.json({ courses: result.rows });
  } catch (err) {
    console.error('List courses error:', err);
    res.status(500).json({ error: 'Failed to list courses' });
  }
});

// Read one
// Public to authenticated users: read single course
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT c.id, c.title, c.description, c.created_at, c.created_by,
              u.name AS creator_name
       FROM course c
       LEFT JOIN users u ON u.id = c.created_by
       WHERE c.id = $1`,
      [id]
    );
    if (!result.rows.length) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }
    res.json({ course: result.rows[0] });
  } catch (err) {
    console.error('Get course error:', err);
    res.status(500).json({ error: 'Failed to get course' });
  }
});

// Update
router.put('/:id', verifyToken, ensureAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body as { title?: string; description?: string | null };
  try {
    const result = await pool.query(
      `UPDATE course
       SET title = COALESCE($1, title),
           description = $2
       WHERE id = $3
       RETURNING id, title, description, created_at`,
      [title ?? null, description ?? null, id]
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
