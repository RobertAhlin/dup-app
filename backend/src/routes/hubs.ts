import { Router } from 'express';
import pool from '../db';
import { verifyToken, AuthenticatedRequest } from '../middleware/verifyToken';
import { canEditCourse, canViewCourse, AuthUser } from './helpers/courseAccess';
import { emitActivityUpdate } from '../socket';

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

    // If this is the first hub for the course, mark it as the starting hub
    const { rows: countRows } = await pool.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM hub WHERE course_id = $1`,
      [courseId]
    );
    const isStart = (countRows[0]?.c ?? 0) === 0;

    const result = await pool.query(
      `INSERT INTO hub (course_id, title, x, y, color, radius, is_start)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, course_id, title, x, y, color, radius, is_start`,
      [courseId, title, x ?? 0, y ?? 0, color ?? '#3498db', radius ?? 100, isStart]
    );

    // Emit Socket.IO event for hub creation
    try {
      const activityResult = await pool.query(
        `SELECT 
          'hub_created' as type,
          u.name as "userName",
          h.title as "itemTitle",
          c.title as "courseTitle",
          NOW() as timestamp
        FROM hub h
        JOIN course c ON c.id = h.course_id
        JOIN users u ON u.id = $1
        WHERE h.id = $2`,
        [user.id, result.rows[0].id]
      );

      if (activityResult.rows[0]) {
        emitActivityUpdate(activityResult.rows[0]);
      }
    } catch (socketErr) {
      console.error('Socket.IO emit error:', socketErr);
      // Don't fail the request if socket emission fails
    }

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

  const { title, x, y, color, radius, is_start } = req.body as {
    title?: string;
    x?: number | null;
    y?: number | null;
    color?: string | null;
    radius?: number | null;
    is_start?: boolean | null;
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

    // If marking this hub as start, clear is_start from others in same course
    if (is_start === true) {
      await pool.query(`UPDATE hub SET is_start = FALSE WHERE course_id = $1 AND id <> $2`, [courseId, hubId])
    }

    const result = await pool.query(
      `UPDATE hub
         SET title = COALESCE($1, title),
             x = COALESCE($2, x),
             y = COALESCE($3, y),
             color = COALESCE($4, color),
             radius = COALESCE($5, radius),
             is_start = COALESCE($6, is_start)
       WHERE id = $7
       RETURNING id, course_id, title, x, y, color, radius, is_start`,
      [
        title ?? null,
        x ?? null,
        y ?? null,
        color ?? null,
        radius ?? null,
        is_start === undefined ? null : is_start,
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

    // Emit Socket.IO event if hub was completed
    if (done) {
      try {
        const activityResult = await pool.query(
          `SELECT 
            'hub' as type,
            u.name as "userName",
            h.title as "itemTitle",
            c.title as "courseTitle",
            NOW() as timestamp
          FROM hub h
          JOIN users u ON u.id = $1
          JOIN course c ON c.id = h.course_id
          WHERE h.id = $2`,
          [user.id, hubId]
        );

        if (activityResult.rows[0]) {
          emitActivityUpdate(activityResult.rows[0]);
        }
      } catch (socketErr) {
        console.error('Socket.IO emit error:', socketErr);
        // Don't fail the request if socket emission fails
      }
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Update hub progress error:', err)
    res.status(500).json({ error: 'Failed to update hub progress' })
  }
})

// Content endpoints for hub payload (WYSIWYG, embeds, quiz)
router.get('/:id/content', verifyToken, async (req: AuthenticatedRequest, res) => {
  const hubId = Number(req.params.id)
  if (!Number.isInteger(hubId)) {
    res.status(400).json({ error: 'Invalid hub id' })
    return
  }
  try {
    const user = req.user as AuthUser | undefined
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }
    const { rows: hubRows } = await pool.query<{ course_id: number }>(
      `SELECT course_id FROM hub WHERE id = $1`,
      [hubId]
    )
    const courseId = hubRows[0]?.course_id
    if (!courseId) {
      res.status(404).json({ error: 'Hub not found' })
      return
    }
    const canView = await canViewCourse(user, courseId)
    if (!canView) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    const { rows } = await pool.query<{ payload: any }>(
      `SELECT payload FROM hub WHERE id = $1`,
      [hubId]
    )
    res.json({ payload: rows[0]?.payload ?? {} })
  } catch (err) {
    console.error('Get hub content error:', err)
    res.status(500).json({ error: 'Failed to load hub content' })
  }
})

router.patch('/:id/content', verifyToken, async (req: AuthenticatedRequest, res) => {
  const hubId = Number(req.params.id)
  if (!Number.isInteger(hubId)) {
    res.status(400).json({ error: 'Invalid hub id' })
    return
  }
  try {
    const user = req.user as AuthUser | undefined
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }
    const { rows: hubRows } = await pool.query<{ course_id: number }>(
      `SELECT course_id FROM hub WHERE id = $1`,
      [hubId]
    )
    const courseId = hubRows[0]?.course_id
    if (!courseId) {
      res.status(404).json({ error: 'Hub not found' })
      return
    }
    const allowed = await canEditCourse(user, courseId)
    if (!allowed) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    // Validate and sanitize incoming payload shape
    const { html, youtubeUrls, imageUrls, quiz } = req.body as {
      html?: string
      youtubeUrls?: string[]
      imageUrls?: string[]
      quiz?: any
    }
    const newPayload = {
      html: typeof html === 'string' ? html : '',
      youtubeUrls: Array.isArray(youtubeUrls) ? youtubeUrls.filter(u => typeof u === 'string') : [],
      imageUrls: Array.isArray(imageUrls) ? imageUrls.filter(u => typeof u === 'string') : [],
      quiz: Array.isArray(quiz) ? quiz : (quiz ?? [])
    }
    const { rows } = await pool.query<{ id: number; payload: any }>(
      `UPDATE hub SET payload = $1::jsonb WHERE id = $2 RETURNING id, payload`,
      [JSON.stringify(newPayload), hubId]
    )
    res.json({ hub: rows[0] })
  } catch (err) {
    console.error('Update hub content error:', err)
    res.status(500).json({ error: 'Failed to update hub content' })
  }
})
