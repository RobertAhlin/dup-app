import { Router } from 'express';
import pool from '../db';
import { verifyToken, AuthenticatedRequest } from '../middleware/verifyToken';
import { getRoleName, AuthUser } from './helpers/courseAccess';

const router = Router();

// Helper to check quiz access
async function checkQuizAccess(userId: number, quizId: number, roleName: string | null): Promise<boolean> {
  if (roleName === 'admin') return true;
  
  const result = await pool.query(
    `SELECT 1 FROM quiz q
     JOIN course_teachers ct ON ct.course_id = q.course_id
     WHERE q.id = $1 AND ct.user_id = $2`,
    [quizId, userId]
  );
  return result.rows.length > 0;
}

// Add question to quiz
router.post('/:quizId/questions', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { quizId } = req.params;
    const { questionText, orderIndex } = req.body;
    const roleName = await getRoleName(user.role_id);

    if (!await checkQuizAccess(user.id, parseInt(quizId), roleName)) {
      res.status(403).json({ error: 'No access to this quiz' });
      return;
    }

    if (!questionText) {
      res.status(400).json({ error: 'questionText is required' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO quiz_question (quiz_id, question_text, order_index)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [quizId, questionText, orderIndex || 0]
    );

    res.status(201).json({ question: result.rows[0] });
  } catch (err) {
    console.error('Add question error:', err);
    res.status(500).json({ error: 'Failed to add question' });
  }
});

// Update question
router.put('/:questionId', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { questionId } = req.params;
    const { questionText, orderIndex } = req.body;
    const roleName = await getRoleName(user.role_id);

    // Get quiz_id from question
    const questionResult = await pool.query(
      'SELECT quiz_id FROM quiz_question WHERE id = $1',
      [questionId]
    );

    if (questionResult.rows.length === 0) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    if (!await checkQuizAccess(user.id, questionResult.rows[0].quiz_id, roleName)) {
      res.status(403).json({ error: 'No access to this quiz' });
      return;
    }

    const result = await pool.query(
      `UPDATE quiz_question
       SET question_text = COALESCE($1, question_text),
           order_index = COALESCE($2, order_index)
       WHERE id = $3
       RETURNING *`,
      [questionText, orderIndex, questionId]
    );

    res.json({ question: result.rows[0] });
  } catch (err) {
    console.error('Update question error:', err);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// Delete question
router.delete('/:questionId', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { questionId } = req.params;
    const roleName = await getRoleName(user.role_id);

    // Get quiz_id from question
    const questionResult = await pool.query(
      'SELECT quiz_id FROM quiz_question WHERE id = $1',
      [questionId]
    );

    if (questionResult.rows.length === 0) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    if (!await checkQuizAccess(user.id, questionResult.rows[0].quiz_id, roleName)) {
      res.status(403).json({ error: 'No access to this quiz' });
      return;
    }

    await pool.query('DELETE FROM quiz_question WHERE id = $1', [questionId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete question error:', err);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// Add answer to question
router.post('/:questionId/answers', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { questionId } = req.params;
    const { answerText, isCorrect, orderIndex } = req.body;
    const roleName = await getRoleName(user.role_id);

    // Get quiz_id from question
    const questionResult = await pool.query(
      'SELECT quiz_id FROM quiz_question WHERE id = $1',
      [questionId]
    );

    if (questionResult.rows.length === 0) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    if (!await checkQuizAccess(user.id, questionResult.rows[0].quiz_id, roleName)) {
      res.status(403).json({ error: 'No access to this quiz' });
      return;
    }

    if (!answerText) {
      res.status(400).json({ error: 'answerText is required' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO quiz_answer (question_id, answer_text, is_correct, order_index)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [questionId, answerText, isCorrect || false, orderIndex || 0]
    );

    res.status(201).json({ answer: result.rows[0] });
  } catch (err) {
    console.error('Add answer error:', err);
    res.status(500).json({ error: 'Failed to add answer' });
  }
});

// Update answer
router.put('/answers/:answerId', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { answerId } = req.params;
    const { answerText, isCorrect, orderIndex } = req.body;
    const roleName = await getRoleName(user.role_id);

    // Get quiz_id from answer
    const answerResult = await pool.query(
      `SELECT qq.quiz_id
       FROM quiz_answer qa
       JOIN quiz_question qq ON qq.id = qa.question_id
       WHERE qa.id = $1`,
      [answerId]
    );

    if (answerResult.rows.length === 0) {
      res.status(404).json({ error: 'Answer not found' });
      return;
    }

    if (!await checkQuizAccess(user.id, answerResult.rows[0].quiz_id, roleName)) {
      res.status(403).json({ error: 'No access to this quiz' });
      return;
    }

    const result = await pool.query(
      `UPDATE quiz_answer
       SET answer_text = COALESCE($1, answer_text),
           is_correct = COALESCE($2, is_correct),
           order_index = COALESCE($3, order_index)
       WHERE id = $4
       RETURNING *`,
      [answerText, isCorrect, orderIndex, answerId]
    );

    res.json({ answer: result.rows[0] });
  } catch (err) {
    console.error('Update answer error:', err);
    res.status(500).json({ error: 'Failed to update answer' });
  }
});

// Delete answer
router.delete('/answers/:answerId', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { answerId } = req.params;
    const roleName = await getRoleName(user.role_id);

    // Get quiz_id from answer
    const answerResult = await pool.query(
      `SELECT qq.quiz_id
       FROM quiz_answer qa
       JOIN quiz_question qq ON qq.id = qa.question_id
       WHERE qa.id = $1`,
      [answerId]
    );

    if (answerResult.rows.length === 0) {
      res.status(404).json({ error: 'Answer not found' });
      return;
    }

    if (!await checkQuizAccess(user.id, answerResult.rows[0].quiz_id, roleName)) {
      res.status(403).json({ error: 'No access to this quiz' });
      return;
    }

    await pool.query('DELETE FROM quiz_answer WHERE id = $1', [answerId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete answer error:', err);
    res.status(500).json({ error: 'Failed to delete answer' });
  }
});

export default router;
