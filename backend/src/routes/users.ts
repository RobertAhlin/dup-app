import { Router, Response } from 'express';
import { verifyToken, AuthenticatedRequest } from '../middleware/verifyToken';
import { ensureAdmin } from '../middleware/roles';
import pool from '../db';

const router = Router();

// List users
router.get('/', verifyToken, ensureAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT users.id, users.email, users.name, roles.name AS role, users.created_at, users.last_login_at
       FROM users JOIN roles ON users.role_id = roles.id
       ORDER BY users.created_at DESC`
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// Create user
router.post('/', verifyToken, ensureAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !role) {
    res.status(400).json({ error: 'email, password, role required' });
    return;
  }
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      res.status(409).json({ error: 'Email already exists' });
      return;
    }
    const roleRes = await pool.query('SELECT id FROM roles WHERE name = $1', [role]);
    if (!roleRes.rows.length) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }
    // For consistency reuse bcrypt from auth route (lazy import to avoid circular)
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.default.hash(password, 10);
    const insert = await pool.query(
      `INSERT INTO users (email, password_hash, name, role_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role_id, created_at, last_login_at`,
      [email, hash, name || null, roleRes.rows[0].id]
    );
    res.status(201).json({ user: insert.rows[0] });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user (name, role, optionally password)
router.put('/:id', verifyToken, ensureAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, role, password } = req.body;
  if (!name && !role && !password) {
    res.status(400).json({ error: 'Nothing to update' });
    return;
  }
  try {
    let roleId: number | undefined;
    if (role) {
      const roleRes = await pool.query('SELECT id FROM roles WHERE name = $1', [role]);
      if (!roleRes.rows.length) {
        res.status(400).json({ error: 'Invalid role' });
        return;
      }
      roleId = roleRes.rows[0].id;
    }
    let passwordHash: string | undefined;
    if (password) {
      const bcrypt = await import('bcrypt');
      passwordHash = await bcrypt.default.hash(password, 10);
    }
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
    if (roleId !== undefined) { fields.push(`role_id = $${idx++}`); values.push(roleId); }
    if (passwordHash !== undefined) { fields.push(`password_hash = $${idx++}`); values.push(passwordHash); }
    values.push(id); // where id
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, email, name, role_id, created_at, last_login_at`;
    const updated = await pool.query(sql, values);
    if (!updated.rows.length) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: updated.rows[0] });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/:id', verifyToken, ensureAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const del = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (!del.rows.length) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ message: 'User deleted', id: del.rows[0].id });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;