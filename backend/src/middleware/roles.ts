import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './verifyToken';
import pool from '../db';

export function allowRoles(...allowedRoles: number[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user || !allowedRoles.includes(user.role_id)) {
      res.status(403).json({ error: 'Access denied: insufficient permissions' });
      return;
    }

    next();
  };
}

// Name-based admin guard that doesn't assume numeric role ids
export async function ensureAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const roleRes = await pool.query('SELECT name FROM roles WHERE id = $1', [user.role_id]);
    const roleName = roleRes.rows[0]?.name;
    if (roleName !== 'admin') {
      res.status(403).json({ error: 'Access denied: admin only' });
      return;
    }

    next();
  } catch (err) {
    console.error('ensureAdmin error:', err);
    res.status(500).json({ error: 'Role check failed' });
  }
}
