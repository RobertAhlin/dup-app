import { Router } from 'express';
import pool from '../db';
import { verifyToken } from '../middleware/verifyToken';
import { ensureAdmin } from '../middleware/roles';

const router = Router();

// List all roles (admin-only to avoid leaking internal role names unnecessarily; adjust if needed)
router.get('/', verifyToken, ensureAdmin, async (_req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM roles ORDER BY name ASC');
    res.json({ roles: result.rows });
  } catch (err) {
    console.error('List roles error:', err);
    res.status(500).json({ error: 'Failed to list roles' });
  }
});

export default router;