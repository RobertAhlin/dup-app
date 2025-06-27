import { Router, Request, Response } from 'express';
import pool from '../db';
import bcrypt from 'bcrypt';

const router = Router();

const registerHandler = async (req: Request, res: Response) => {
  const { email, password, name, role_id } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({ error: 'Email already in use.' });
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role_id, created_at`,
      [email, password_hash, name || null, role_id || null]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error('❌ Registration error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
};

router.post('/register', (req: Request, res: Response) => {
  registerHandler(req, res);
});

export default router;
