import { Router } from 'express';
import pool from '../db';
import { verifyToken, AuthenticatedRequest } from '../middleware/verifyToken';
import { canEditCourse, AuthUser } from './helpers/courseAccess';

const router = Router();

router.post('/', verifyToken, async (req: AuthenticatedRequest, res) => {
  const { hubId, title, task_kind, x, y } = req.body as {
    hubId?: number;
    title?: string;
    task_kind?: string;
    x?: number | null;
    y?: number | null;
  };

  if (!hubId || !title || !task_kind) {
    res.status(400).json({ error: 'hubId, title and task_kind are required' });
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

    const result = await pool.query(
      `INSERT INTO task (hub_id, title, task_kind, x, y)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, hub_id, title, task_kind, x, y`,
      [hubId, title, task_kind, x ?? 0, y ?? 0]
    );

    res.status(201).json({ task: result.rows[0] });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.patch('/:id', verifyToken, async (req: AuthenticatedRequest, res) => {
  const taskId = Number(req.params.id);
  if (!Number.isInteger(taskId)) {
    res.status(400).json({ error: 'Invalid task id' });
    return;
  }

  const { title, task_kind, x, y } = req.body as {
    title?: string;
    task_kind?: string;
    x?: number | null;
    y?: number | null;
  };

  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const taskRes = await pool.query<{ hub_id: number }>(
      `SELECT hub_id FROM task WHERE id = $1`,
      [taskId]
    );
    if (!taskRes.rows.length) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const hubId = taskRes.rows[0].hub_id;
    const hubRes = await pool.query<{ course_id: number }>(
      `SELECT course_id FROM hub WHERE id = $1`,
      [hubId]
    );
    const courseId = hubRes.rows[0]?.course_id;
    if (!courseId) {
      res.status(404).json({ error: 'Hub not found for task' });
      return;
    }

    const allowed = await canEditCourse(user, courseId);
    if (!allowed) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const result = await pool.query(
      `UPDATE task
         SET title = COALESCE($1, title),
             task_kind = COALESCE($2, task_kind),
             x = COALESCE($3, x),
             y = COALESCE($4, y)
       WHERE id = $5
       RETURNING id, hub_id, title, task_kind, x, y`,
      [title ?? null, task_kind ?? null, x ?? null, y ?? null, taskId]
    );

    res.json({ task: result.rows[0] });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

export default router;
