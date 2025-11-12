import { Router } from 'express';
import pool from '../db';
import { verifyToken, AuthenticatedRequest } from '../middleware/verifyToken';
import { canEditCourse, AuthUser } from './helpers/courseAccess';

const router = Router();

router.post('/', verifyToken, async (req: AuthenticatedRequest, res) => {
  const { courseId, from_hub_id, to_hub_id, rule, rule_value } = req.body as {
    courseId?: number;
    from_hub_id?: number;
    to_hub_id?: number;
    rule?: string;
    rule_value?: Record<string, unknown>;
  };

  if (!courseId || !from_hub_id || !to_hub_id) {
    res.status(400).json({ error: 'courseId, from_hub_id and to_hub_id are required' });
    return;
  }

  if (from_hub_id === to_hub_id) {
    res.status(400).json({ error: 'Cannot connect a hub to itself' });
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

    // Ensure hubs belong to the course
    const hubsRes = await pool.query<{ id: number }>(
      `SELECT id FROM hub WHERE id = ANY($1::int[]) AND course_id = $2`,
      [[from_hub_id, to_hub_id], courseId]
    );
    if (hubsRes.rows.length !== 2) {
      res.status(400).json({ error: 'Both hubs must belong to the course' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO hub_edge (course_id, from_hub_id, to_hub_id, rule, rule_value)
       VALUES ($1, $2, $3, COALESCE($4, 'all_tasks_complete'), COALESCE($5::jsonb, '{}'::jsonb))
       ON CONFLICT (from_hub_id, to_hub_id)
       DO UPDATE SET rule = EXCLUDED.rule, rule_value = EXCLUDED.rule_value
       RETURNING id, course_id, from_hub_id, to_hub_id`,
      [courseId, from_hub_id, to_hub_id, rule ?? 'all_tasks_complete', JSON.stringify(rule_value ?? {})]
    );

    res.status(201).json({ edge: result.rows[0] });
  } catch (err) {
    console.error('Create edge error:', err);
    res.status(500).json({ error: 'Failed to create edge' });
  }
});

export default router;
