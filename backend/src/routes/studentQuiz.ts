import { Router } from 'express';
import pool from '../db';
import { verifyToken, AuthenticatedRequest } from '../middleware/verifyToken';
import { AuthUser } from './helpers/courseAccess';

const router = Router();

// Helper function to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Start quiz for a hub
router.post('/hubs/:hubId/quiz/start', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { hubId } = req.params;

    // Get hub with quiz
    const hubResult = await pool.query(
      `SELECT h.id, h.course_id, h.quiz_id, q.questions_per_attempt
       FROM hub h
       LEFT JOIN quiz q ON q.id = h.quiz_id
       WHERE h.id = $1`,
      [hubId]
    );

    if (hubResult.rows.length === 0) {
      res.status(404).json({ error: 'Hub not found' });
      return;
    }

    const hub = hubResult.rows[0];

    if (!hub.quiz_id) {
      res.status(400).json({ error: 'This hub does not have a quiz' });
      return;
    }

    // Check if student is enrolled
    const enrollmentCheck = await pool.query(
      'SELECT 1 FROM course_enrollments WHERE user_id = $1 AND course_id = $2',
      [user.id, hub.course_id]
    );

    if (enrollmentCheck.rows.length === 0) {
      res.status(403).json({ error: 'Not enrolled in this course' });
      return;
    }

    // Check if all required tasks are completed
    const tasksResult = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE t.is_required = TRUE) AS required_count,
        COUNT(*) FILTER (WHERE t.is_required = TRUE AND tp.status = 'completed') AS completed_count
       FROM task t
       LEFT JOIN task_progress tp ON tp.task_id = t.id AND tp.user_id = $1
       WHERE t.hub_id = $2`,
      [user.id, hubId]
    );

    const { required_count, completed_count } = tasksResult.rows[0];
    
    if (parseInt(required_count) > parseInt(completed_count || '0')) {
      res.status(400).json({ 
        error: 'All required tasks must be completed before starting the quiz',
        requiredTasks: parseInt(required_count),
        completedTasks: parseInt(completed_count || '0')
      });
      return;
    }

    // Get all questions for this quiz with their answers
    const questionsResult = await pool.query(
      `SELECT 
        qq.id,
        qq.question_text,
        json_agg(
          json_build_object(
            'id', qa.id,
            'answer_text', qa.answer_text
          ) ORDER BY qa.order_index
        ) AS answers
       FROM quiz_question qq
       JOIN quiz_answer qa ON qa.question_id = qq.id
       WHERE qq.quiz_id = $1
       GROUP BY qq.id`,
      [hub.quiz_id]
    );

    if (questionsResult.rows.length < hub.questions_per_attempt) {
      res.status(400).json({ 
        error: `Quiz needs at least ${hub.questions_per_attempt} questions. Currently has ${questionsResult.rows.length}` 
      });
      return;
    }

    // Shuffle questions and pick the required number
    const shuffledQuestions = shuffleArray(questionsResult.rows);
    const selectedQuestions = shuffledQuestions.slice(0, hub.questions_per_attempt);

    // Shuffle answers for each question
    const questionsWithShuffledAnswers = selectedQuestions.map(q => ({
      id: q.id,
      question_text: q.question_text,
      answers: shuffleArray(q.answers)
    }));

    // Create quiz attempt
    const attemptResult = await pool.query(
      `INSERT INTO quiz_attempt (quiz_id, user_id, hub_id, questions_shown)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        hub.quiz_id,
        user.id,
        hubId,
        JSON.stringify(selectedQuestions.map(q => q.id))
      ]
    );

    res.json({
      attemptId: attemptResult.rows[0].id,
      quizId: hub.quiz_id,
      hubId: parseInt(hubId),
      questions: questionsWithShuffledAnswers
    });
  } catch (err) {
    console.error('Start quiz error:', err);
    res.status(500).json({ error: 'Failed to start quiz' });
  }
});

// Submit quiz attempt
router.post('/quizzes/:quizId/submit', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { quizId } = req.params;
    const { hubId, attemptId, answers } = req.body;

    if (!hubId || !attemptId || !answers) {
      res.status(400).json({ error: 'hubId, attemptId, and answers are required' });
      return;
    }

    // Get attempt
    const attemptResult = await pool.query(
      `SELECT questions_shown FROM quiz_attempt 
       WHERE id = $1 AND user_id = $2 AND quiz_id = $3 AND submitted_at IS NULL`,
      [attemptId, user.id, quizId]
    );

    if (attemptResult.rows.length === 0) {
      res.status(404).json({ error: 'Quiz attempt not found or already submitted' });
      return;
    }

    const questionIds = attemptResult.rows[0].questions_shown;

    // Get correct answers for all questions in this attempt
    const correctAnswersResult = await pool.query(
      `SELECT 
        qa.question_id,
        array_agg(qa.id ORDER BY qa.id) AS correct_answer_ids
       FROM quiz_answer qa
       WHERE qa.question_id = ANY($1::int[]) AND qa.is_correct = TRUE
       GROUP BY qa.question_id`,
      [questionIds]
    );

    const correctAnswersMap = new Map(
      correctAnswersResult.rows.map(row => [
        row.question_id,
        row.correct_answer_ids.map((id: any) => parseInt(id))
      ])
    );

    // Validate each answer
    let allCorrect = true;
    let correctCount = 0;

    for (const answer of answers) {
      const correctIds = correctAnswersMap.get(answer.questionId) || [];
      const submittedIds = answer.selectedAnswerIds.sort();
      const correctIdsSorted = correctIds.sort();

      const isCorrect = 
        submittedIds.length === correctIdsSorted.length &&
        submittedIds.every((id: number, index: number) => id === correctIdsSorted[index]);

      if (isCorrect) {
        correctCount++;
      } else {
        allCorrect = false;
      }
    }

    const passed = allCorrect && correctCount === questionIds.length;

    // Update attempt
    await pool.query(
      `UPDATE quiz_attempt
       SET submitted_at = NOW(),
           answers_submitted = $1,
           passed = $2,
           score = $3
       WHERE id = $4`,
      [JSON.stringify(answers), passed, correctCount, attemptId]
    );

    // If passed, mark hub as completed
    if (passed) {
      await pool.query(
        `INSERT INTO hub_user_state (hub_id, user_id, state, completed_at)
         VALUES ($1, $2, 'completed', NOW())
         ON CONFLICT (hub_id, user_id)
         DO UPDATE SET state = 'completed', completed_at = NOW()`,
        [hubId, user.id]
      );

      // Unlock dependent hubs
      await pool.query(
        `INSERT INTO hub_user_state (hub_id, user_id, state)
         SELECT he.to_hub_id, $1, 'unlocked'
         FROM hub_edge he
         WHERE he.from_hub_id = $2
         ON CONFLICT (hub_id, user_id) DO NOTHING`,
        [user.id, hubId]
      );
    }

    res.json({
      passed,
      score: correctCount,
      total: questionIds.length
    });
  } catch (err) {
    console.error('Submit quiz error:', err);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

export default router;
