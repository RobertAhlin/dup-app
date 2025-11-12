import { Router } from 'express';
import pool from '../db';
import { verifyToken, AuthenticatedRequest } from '../middleware/verifyToken';
import { canEditCourse, AuthUser } from './helpers/courseAccess';

const router = Router();

router.post('/', verifyToken, async (req: AuthenticatedRequest, res) => {
  const { courseId, title, x, y, color, radius } = req.body as {
    courseId?: number;
    title?: string;
    x?: number;
    y?: number;
    color?: string;
    radius?: number;
  };

  if (!courseId || !title) {
    res.status(400).json({ error: 'courseId and title are required' });
    return;
  }

  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const allowed = await canEditCourse(user, courseId);
    if (!allowed) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO hub (course_id, title, x, y, color, radius)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, course_id, title, x, y, color, radius`,
      [courseId, title, x ?? 0, y ?? 0, color ?? '#3498db', radius ?? 100]
    );

    res.status(201).json({ hub: result.rows[0] });
  } catch (err) {
    console.error('Create hub error:', err);
    res.status(500).json({ error: 'Failed to create hub' });
  }
});

router.patch('/:id', verifyToken, async (req: AuthenticatedRequest, res) => {
  const hubId = Number(req.params.id);
  if (!Number.isInteger(hubId)) {
    res.status(400).json({ error: 'Invalid hub id' });
    return;
  }

  const { title, x, y, color, radius } = req.body as {
    title?: string;
    x?: number | null;
    y?: number | null;
    color?: string | null;
    radius?: number | null;
  };

  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const courseRes = await pool.query<{ course_id: number }>(
      `SELECT course_id FROM hub WHERE id = $1`,
      [hubId]
    );
    if (!courseRes.rows.length) {
      res.status(404).json({ error: 'Hub not found' });
      return;
    }
    const courseId = courseRes.rows[0].course_id;

    const allowed = await canEditCourse(user, courseId);
    if (!allowed) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const result = await pool.query(
      `UPDATE hub
         SET title = COALESCE($1, title),
             x = COALESCE($2, x),
             y = COALESCE($3, y),
             color = COALESCE($4, color),
             radius = COALESCE($5, radius)
       WHERE id = $6
       RETURNING id, course_id, title, x, y, color, radius`,
      [
        title ?? null,
        x ?? null,
        y ?? null,
        color ?? null,
        radius ?? null,
        hubId,
      ]
    );

    res.json({ hub: result.rows[0] });
  } catch (err) {
    console.error('Update hub error:', err);
    res.status(500).json({ error: 'Failed to update hub' });
  }
});

export default router;
