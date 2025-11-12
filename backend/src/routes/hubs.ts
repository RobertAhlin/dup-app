import { Router } from 'express';
import pool from '../db';
import { verifyToken, AuthenticatedRequest } from '../middleware/verifyToken';
import { canEditCourse, canViewCourse, AuthUser } from './helpers/courseAccess';

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

router.delete('/:id', verifyToken, async (req: AuthenticatedRequest, res) => {
  const hubId = Number(req.params.id);
  if (!Number.isInteger(hubId)) {
    res.status(400).json({ error: 'Invalid hub id' });
    return;
  }

  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const hubRes = await pool.query<{ course_id: number }>(
      `SELECT course_id FROM hub WHERE id = $1`,
      [hubId]
    );
    if (!hubRes.rows.length) {
      res.status(404).json({ error: 'Hub not found' });
      return;
    }

    const courseId = hubRes.rows[0].course_id;
    const allowed = await canEditCourse(user, courseId);
    if (!allowed) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    await pool.query(`DELETE FROM hub WHERE id = $1`, [hubId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete hub error:', err);
    res.status(500).json({ error: 'Failed to delete hub' });
  }
});

export default router;

// Progress endpoints for hub: mark completed/uncompleted per user
router.put('/:id/progress', verifyToken, async (req: AuthenticatedRequest, res) => {
  const hubId = Number(req.params.id)
  if (!Number.isInteger(hubId)) {
    res.status(400).json({ error: 'Invalid hub id' })
    return
  }
  const { done } = req.body as { done?: boolean }
  if (typeof done !== 'boolean') {
    res.status(400).json({ error: 'done boolean is required' })
    return
  }

  try {
    const user = req.user as AuthUser | undefined
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }

    const cRes = await pool.query<{ course_id: number }>(`SELECT course_id FROM hub WHERE id = $1`, [hubId])
    const courseId = cRes.rows[0]?.course_id
    if (!courseId) {
      res.status(404).json({ error: 'Hub not found' })
      return
    }
    const canView = await canViewCourse(user, courseId)
    if (!canView) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    if (done) {
      // Ensure all tasks in this hub are completed for this user
      const { rows } = await pool.query<{ all_done: boolean }>(
        `SELECT (COUNT(*) = COALESCE(SUM(CASE WHEN tp.status = 'completed' THEN 1 ELSE 0 END), 0)) AS all_done
           FROM task t
           LEFT JOIN task_progress tp
             ON tp.task_id = t.id AND tp.user_id = $1
          WHERE t.hub_id = $2`,
        [user.id, hubId]
      )
      if (!rows[0]?.all_done) {
        res.status(400).json({ error: 'All tasks in this hub must be completed first' })
        return
      }
    }

    await pool.query(
      `INSERT INTO hub_user_state (user_id, hub_id, state, completed_at)
       VALUES ($1, $2, $3::hub_state,
               CASE WHEN $3::hub_state = 'completed'::hub_state THEN NOW() ELSE NULL END)
       ON CONFLICT (user_id, hub_id)
       DO UPDATE SET state = EXCLUDED.state,
                     completed_at = CASE WHEN EXCLUDED.state = 'completed'::hub_state THEN NOW() ELSE NULL END`,
      [user.id, hubId, done ? 'completed' : 'unlocked']
    )

    res.json({ success: true })
  } catch (err) {
    console.error('Update hub progress error:', err)
    res.status(500).json({ error: 'Failed to update hub progress' })
  }
})
