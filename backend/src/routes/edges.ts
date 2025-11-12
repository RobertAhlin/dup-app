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
       VALUES ($1, $2, $3, COALESCE($4::unlock_rule, 'all_tasks_complete'::unlock_rule), COALESCE($5::jsonb, '{}'::jsonb))
       ON CONFLICT (from_hub_id, to_hub_id)
       DO UPDATE SET rule = EXCLUDED.rule, rule_value = EXCLUDED.rule_value
       RETURNING id, course_id, from_hub_id, to_hub_id, rule_value`,
      [courseId, from_hub_id, to_hub_id, rule ?? 'all_tasks_complete', JSON.stringify(rule_value ?? {})]
    );
    const edge = result.rows[0];
    const color = edge.rule_value?.color ?? null;
    res.status(201).json({ edge: { id: edge.id, course_id: edge.course_id, from_hub_id: edge.from_hub_id, to_hub_id: edge.to_hub_id, color } });
  } catch (err) {
    console.error('Create edge error:', err);
    res.status(500).json({ error: 'Failed to create edge' });
  }
});

// Update edge color / rule
router.patch('/:id', verifyToken, async (req: AuthenticatedRequest, res) => {
  const edgeId = Number(req.params.id);
  const { color, rule, rule_value } = req.body as {
    color?: string | null; // convenience shallow color update
    rule?: string;
    rule_value?: Record<string, unknown>;
  };
  if (!Number.isInteger(edgeId)) {
    res.status(400).json({ error: 'Invalid edge id' });
    return;
  }
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    // Fetch existing to determine course for RBAC
    const existingRes = await pool.query('SELECT course_id, rule_value FROM hub_edge WHERE id = $1', [edgeId]);
    if (!existingRes.rows.length) {
      res.status(404).json({ error: 'Edge not found' });
      return;
    }
    const courseId = existingRes.rows[0].course_id as number;
    const allowed = await canEditCourse(user, courseId);
    if (!allowed) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    let newRuleValue = rule_value ?? existingRes.rows[0].rule_value ?? {};
    if (color !== undefined) {
      newRuleValue = { ...newRuleValue, color };
    }
    const result = await pool.query(
      `UPDATE hub_edge
       SET rule = COALESCE($2::unlock_rule, rule),
           rule_value = COALESCE($3::jsonb, rule_value)
       WHERE id = $1
       RETURNING id, course_id, from_hub_id, to_hub_id, rule_value`,
      [edgeId, rule ?? null, JSON.stringify(newRuleValue)]
    );
    const edge = result.rows[0];
    res.json({ edge: { id: edge.id, course_id: edge.course_id, from_hub_id: edge.from_hub_id, to_hub_id: edge.to_hub_id, color: edge.rule_value?.color ?? null } });
  } catch (err) {
    console.error('Patch edge error:', err);
    res.status(500).json({ error: 'Failed to update edge' });
  }
});

// Delete edge
router.delete('/:id', verifyToken, async (req: AuthenticatedRequest, res) => {
  const edgeId = Number(req.params.id);
  if (!Number.isInteger(edgeId)) {
    res.status(400).json({ error: 'Invalid edge id' });
    return;
  }
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const existingRes = await pool.query('SELECT course_id FROM hub_edge WHERE id = $1', [edgeId]);
    if (!existingRes.rows.length) {
      res.status(404).json({ error: 'Edge not found' });
      return;
    }
    const courseId = existingRes.rows[0].course_id as number;
    const allowed = await canEditCourse(user, courseId);
    if (!allowed) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    await pool.query('DELETE FROM hub_edge WHERE id = $1', [edgeId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete edge error:', err);
    res.status(500).json({ error: 'Failed to delete edge' });
  }
});

export default router;
