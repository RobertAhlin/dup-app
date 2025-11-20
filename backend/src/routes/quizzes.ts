import { Router } from 'express';
import pool from '../db';
import { verifyToken, AuthenticatedRequest } from '../middleware/verifyToken';
import { getRoleName, AuthUser } from './helpers/courseAccess';

const router = Router();

// Get all quizzes (with optional filters)
router.get('/', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { courseId, hubId, unassigned } = req.query;
    const roleName = await getRoleName(user.role_id);

    let query = `
      SELECT 
        q.id,
        q.course_id,
        q.hub_id,
        q.title,
        q.description,
        q.questions_per_attempt,
        q.created_at,
        q.updated_at,
        c.title AS course_title,
        h.title AS hub_title,
        COUNT(qq.id) AS question_count
      FROM quiz q
      JOIN course c ON c.id = q.course_id
      LEFT JOIN hub h ON h.id = q.hub_id
      LEFT JOIN quiz_question qq ON qq.quiz_id = q.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Role-based filtering
    if (roleName === 'teacher') {
      conditions.push(`EXISTS (
        SELECT 1 FROM course_teachers ct 
        WHERE ct.course_id = q.course_id AND ct.user_id = $${paramIndex}
      )`);
      params.push(user.id);
      paramIndex++;
    } else if (roleName === 'student') {
      res.status(403).json({ error: 'Students cannot access quiz builder' });
      return;
    }

    // Additional filters
    if (courseId) {
      conditions.push(`q.course_id = $${paramIndex}`);
      params.push(courseId);
      paramIndex++;
    }

    if (hubId) {
      conditions.push(`q.hub_id = $${paramIndex}`);
      params.push(hubId);
      paramIndex++;
    }

    if (unassigned === 'true') {
      conditions.push('q.hub_id IS NULL');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY q.id, c.title, h.title ORDER BY q.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get quizzes error:', err);
    res.status(500).json({ error: 'Failed to get quizzes' });
  }
});

// Create new quiz
router.post('/', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const roleName = await getRoleName(user.role_id);
    if (roleName !== 'admin' && roleName !== 'teacher') {
      res.status(403).json({ error: 'Only teachers and admins can create quizzes' });
      return;
    }

    const { courseId, hubId, title, description, questionsPerAttempt } = req.body;

    if (!courseId || !title) {
      res.status(400).json({ error: 'courseId and title are required' });
      return;
    }

    if (![3, 5].includes(questionsPerAttempt)) {
      res.status(400).json({ error: 'questionsPerAttempt must be 3 or 5' });
      return;
    }

    // Verify teacher has access to course
    if (roleName === 'teacher') {
      const accessCheck = await pool.query(
        'SELECT 1 FROM course_teachers WHERE user_id = $1 AND course_id = $2',
        [user.id, courseId]
      );
      if (accessCheck.rows.length === 0) {
        res.status(403).json({ error: 'No access to this course' });
        return;
      }
    }

    const result = await pool.query(
      `INSERT INTO quiz (course_id, hub_id, title, description, questions_per_attempt)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [courseId, hubId || null, title, description || null, questionsPerAttempt]
    );

    res.status(201).json({ quiz: result.rows[0] });
  } catch (err) {
    console.error('Create quiz error:', err);
    const error = err as { code?: string; constraint?: string };
    if (error.code === '23505') {
      res.status(400).json({ error: 'A quiz with this title already exists in this course' });
      return;
    }
    res.status(500).json({ error: 'Failed to create quiz' });
  }
});

// Get single quiz with questions and answers
router.get('/:id', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const roleName = await getRoleName(user.role_id);

    // Get quiz
    const quizResult = await pool.query(
      `SELECT q.*, c.title AS course_title, h.title AS hub_title
       FROM quiz q
       JOIN course c ON c.id = q.course_id
       LEFT JOIN hub h ON h.id = q.hub_id
       WHERE q.id = $1`,
      [id]
    );

    if (quizResult.rows.length === 0) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }

    const quiz = quizResult.rows[0];

    // Check access
    if (roleName === 'teacher') {
      const accessCheck = await pool.query(
        'SELECT 1 FROM course_teachers WHERE user_id = $1 AND course_id = $2',
        [user.id, quiz.course_id]
      );
      if (accessCheck.rows.length === 0) {
        res.status(403).json({ error: 'No access to this quiz' });
        return;
      }
    }

    // Get questions with answers
    const questionsResult = await pool.query(
      `SELECT 
        qq.id,
        qq.question_text,
        qq.order_index,
        json_agg(
          json_build_object(
            'id', qa.id,
            'answer_text', qa.answer_text,
            'is_correct', qa.is_correct,
            'order_index', qa.order_index
          ) ORDER BY qa.order_index
        ) AS answers
       FROM quiz_question qq
       LEFT JOIN quiz_answer qa ON qa.question_id = qq.id
       WHERE qq.quiz_id = $1
       GROUP BY qq.id
       ORDER BY qq.order_index`,
      [id]
    );

    res.json({
      quiz: {
        ...quiz,
        questions: questionsResult.rows
      }
    });
  } catch (err) {
    console.error('Get quiz error:', err);
    res.status(500).json({ error: 'Failed to get quiz' });
  }
});

// Update quiz
router.put('/:id', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const { title, description, questionsPerAttempt, hubId } = req.body;
    const roleName = await getRoleName(user.role_id);

    // Get quiz to check access
    const quizResult = await pool.query('SELECT course_id FROM quiz WHERE id = $1', [id]);
    if (quizResult.rows.length === 0) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }

    // Check access
    if (roleName === 'teacher') {
      const accessCheck = await pool.query(
        'SELECT 1 FROM course_teachers WHERE user_id = $1 AND course_id = $2',
        [user.id, quizResult.rows[0].course_id]
      );
      if (accessCheck.rows.length === 0) {
        res.status(403).json({ error: 'No access to this quiz' });
        return;
      }
    }

    if (questionsPerAttempt && ![3, 5].includes(questionsPerAttempt)) {
      res.status(400).json({ error: 'questionsPerAttempt must be 3 or 5' });
      return;
    }

    const result = await pool.query(
      `UPDATE quiz
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           questions_per_attempt = COALESCE($3, questions_per_attempt),
           hub_id = $4
       WHERE id = $5
       RETURNING *`,
      [title, description, questionsPerAttempt, hubId !== undefined ? hubId : undefined, id]
    );

    res.json({ quiz: result.rows[0] });
  } catch (err) {
    console.error('Update quiz error:', err);
    res.status(500).json({ error: 'Failed to update quiz' });
  }
});

// Delete quiz
router.delete('/:id', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const roleName = await getRoleName(user.role_id);

    // Get quiz to check access
    const quizResult = await pool.query('SELECT course_id FROM quiz WHERE id = $1', [id]);
    if (quizResult.rows.length === 0) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }

    // Check access
    if (roleName === 'teacher') {
      const accessCheck = await pool.query(
        'SELECT 1 FROM course_teachers WHERE user_id = $1 AND course_id = $2',
        [user.id, quizResult.rows[0].course_id]
      );
      if (accessCheck.rows.length === 0) {
        res.status(403).json({ error: 'No access to this quiz' });
        return;
      }
    }

    await pool.query('DELETE FROM quiz WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete quiz error:', err);
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

export default router;
