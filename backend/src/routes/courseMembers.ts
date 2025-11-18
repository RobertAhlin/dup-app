import { Router } from 'express';
import pool from '../db';
import { verifyToken, AuthenticatedRequest } from '../middleware/verifyToken';
import { ensureAdmin } from '../middleware/roles';
import { emitActivityUpdate } from '../socket';

const router = Router();

// Get members for a course (with last login info)
router.get('/:courseId/members', verifyToken, async (req: AuthenticatedRequest, res) => {
  const { courseId } = req.params;
  const { role, search } = req.query;

  try {
    let query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        r.name as global_role,
        CASE 
          WHEN ct.user_id IS NOT NULL THEN 'teacher'
          WHEN ce.user_id IS NOT NULL THEN 'student'
          ELSE NULL
        END as role_in_course,
        COALESCE(ct.assigned_at, ce.enrolled_at) as joined_at,
        u.last_login_at,
        (
          (SELECT COUNT(*)::integer FROM task t JOIN hub h ON h.id = t.hub_id WHERE h.course_id = $1) +
          (SELECT COUNT(*)::integer FROM hub WHERE course_id = $1)
        ) AS total_tasks,
        (
          COALESCE((SELECT COUNT(*)::integer 
           FROM task_progress tp 
           JOIN task t ON t.id = tp.task_id 
           JOIN hub h ON h.id = t.hub_id 
           WHERE tp.user_id = u.id AND h.course_id = $1 AND tp.status = 'completed'), 0) +
          COALESCE((SELECT COUNT(*)::integer 
           FROM hub_user_state hus 
           JOIN hub h ON h.id = hus.hub_id 
           WHERE hus.user_id = u.id AND h.course_id = $1 AND hus.state = 'completed'), 0)
        ) AS completed_tasks
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      LEFT JOIN course_teachers ct ON ct.user_id = u.id AND ct.course_id = $1
      LEFT JOIN course_enrollments ce ON ce.user_id = u.id AND ce.course_id = $1
      WHERE (ct.user_id IS NOT NULL OR ce.user_id IS NOT NULL)
    `;

    const params: (string | number)[] = [parseInt(courseId)];
    let paramIndex = 2;

    // Filter by role in course
    if (role) {
      const roles = Array.isArray(role) ? role : [role];
      const roleConditions: string[] = [];
      
      if (roles.includes('teacher')) {
        roleConditions.push('ct.user_id IS NOT NULL');
      }
      if (roles.includes('student')) {
        roleConditions.push('ce.user_id IS NOT NULL');
      }
      
      if (roleConditions.length > 0) {
        query += ` AND (${roleConditions.join(' OR ')})`;
      }
    }

    // Search by name or email
    if (search && typeof search === 'string') {
      query += ` AND (LOWER(u.name) LIKE $${paramIndex} OR LOWER(u.email) LIKE $${paramIndex})`;
      params.push(`%${search.toLowerCase()}%`);
      paramIndex++;
    }

    query += ' ORDER BY u.name ASC';

    const result = await pool.query(query, params);
    res.json({ members: result.rows });
  } catch (err) {
    console.error('Get course members error:', err);
    res.status(500).json({ error: 'Failed to get course members' });
  }
});

// Add a user as member
router.post('/:courseId/members', verifyToken, ensureAdmin, async (req: AuthenticatedRequest, res) => {
  const { courseId } = req.params;
  const { userId, roleInCourse } = req.body as { userId: number; roleInCourse: 'teacher' | 'student' };

  if (!userId || !roleInCourse) {
    res.status(400).json({ error: 'userId and roleInCourse are required' });
    return;
  }

  if (roleInCourse !== 'teacher' && roleInCourse !== 'student') {
    res.status(400).json({ error: 'roleInCourse must be either "teacher" or "student"' });
    return;
  }

  try {
    // Check if user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if course exists
    const courseCheck = await pool.query('SELECT id, title FROM course WHERE id = $1', [parseInt(courseId)]);
    if (courseCheck.rows.length === 0) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    // Check if user is already a member
    const existingTeacher = await pool.query(
      'SELECT 1 FROM course_teachers WHERE user_id = $1 AND course_id = $2',
      [userId, parseInt(courseId)]
    );
    const existingStudent = await pool.query(
      'SELECT 1 FROM course_enrollments WHERE user_id = $1 AND course_id = $2',
      [userId, parseInt(courseId)]
    );

    if (existingTeacher.rows.length > 0 || existingStudent.rows.length > 0) {
      res.status(409).json({ error: 'User is already a member of this course' });
      return;
    }

    // Add user to course
    if (roleInCourse === 'teacher') {
      await pool.query(
        'INSERT INTO course_teachers (user_id, course_id, is_owner) VALUES ($1, $2, FALSE)',
        [userId, parseInt(courseId)]
      );
    } else {
      await pool.query(
        'INSERT INTO course_enrollments (user_id, course_id) VALUES ($1, $2)',
        [userId, parseInt(courseId)]
      );
    }

    // Emit activity update for real-time notifications
    try {
      const activityResult = await pool.query(
        `SELECT 
          'user_enrolled' as type,
          $1 as "adminId",
          u.name as "userName",
          $2 as "roleInCourse",
          c.title as "courseTitle",
          NOW() as timestamp
         FROM users u
         JOIN course c ON c.id = $3
         WHERE u.id = $4`,
        [req.user?.id, roleInCourse, parseInt(courseId), userId]
      );
      if (activityResult.rows.length > 0) {
        emitActivityUpdate(activityResult.rows[0]);
      }
    } catch (socketErr) {
      console.error('Socket emission error:', socketErr);
      // Don't fail the request if socket fails
    }

    res.status(201).json({ message: 'User added to course successfully' });
  } catch (err) {
    console.error('Add course member error:', err);
    res.status(500).json({ error: 'Failed to add user to course' });
  }
});

// Remove a member
router.delete('/:courseId/members/:userId', verifyToken, ensureAdmin, async (req: AuthenticatedRequest, res) => {
  const { courseId, userId } = req.params;

  try {
    // Get user and course info before deletion for activity log
    const infoResult = await pool.query(
      `SELECT u.name as "userName", c.title as "courseTitle",
        CASE 
          WHEN ct.user_id IS NOT NULL THEN 'teacher'
          WHEN ce.user_id IS NOT NULL THEN 'student'
          ELSE NULL
        END as "roleInCourse"
       FROM users u
       JOIN course c ON c.id = $1
       LEFT JOIN course_teachers ct ON ct.user_id = $2 AND ct.course_id = $1
       LEFT JOIN course_enrollments ce ON ce.user_id = $2 AND ce.course_id = $1
       WHERE u.id = $2`,
      [parseInt(courseId), parseInt(userId)]
    );

    if (infoResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found in course' });
      return;
    }

    // Remove from both tables (one will succeed, one will do nothing)
    const teacherResult = await pool.query(
      'DELETE FROM course_teachers WHERE user_id = $1 AND course_id = $2',
      [parseInt(userId), parseInt(courseId)]
    );
    const studentResult = await pool.query(
      'DELETE FROM course_enrollments WHERE user_id = $1 AND course_id = $2',
      [parseInt(userId), parseInt(courseId)]
    );

    if (teacherResult.rowCount === 0 && studentResult.rowCount === 0) {
      res.status(404).json({ error: 'User not found in course' });
      return;
    }

    // Emit activity update for real-time notifications
    try {
      const activityData = {
        type: 'user_unenrolled',
        adminId: req.user?.id,
        userName: infoResult.rows[0].userName,
        roleInCourse: infoResult.rows[0].roleInCourse,
        courseTitle: infoResult.rows[0].courseTitle,
        timestamp: new Date()
      };
      emitActivityUpdate(activityData);
    } catch (socketErr) {
      console.error('Socket emission error:', socketErr);
      // Don't fail the request if socket fails
    }

    res.json({ message: 'User removed from course successfully' });
  } catch (err) {
    console.error('Remove course member error:', err);
    res.status(500).json({ error: 'Failed to remove user from course' });
  }
});

// Get users available to add (not already in the course)
router.get('/users/for-course', verifyToken, ensureAdmin, async (req: AuthenticatedRequest, res) => {
  const { excludeCourseId, role, search } = req.query;

  if (!excludeCourseId) {
    res.status(400).json({ error: 'excludeCourseId is required' });
    return;
  }

  try {
    let query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        r.name as global_role
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.id NOT IN (
        SELECT user_id FROM course_teachers WHERE course_id = $1
        UNION
        SELECT user_id FROM course_enrollments WHERE course_id = $1
      )
    `;

    const params: any[] = [parseInt(excludeCourseId as string)];
    let paramIndex = 2;

    // Filter by global role
    if (role) {
      const roles = Array.isArray(role) ? role : [role];
      query += ` AND LOWER(r.name) = ANY($${paramIndex}::text[])`;
      params.push(roles.map(r => r.toString().toLowerCase()));
      paramIndex++;
    }

    // Search by name or email
    if (search && typeof search === 'string') {
      query += ` AND (LOWER(u.name) LIKE $${paramIndex} OR LOWER(u.email) LIKE $${paramIndex})`;
      params.push(`%${search.toLowerCase()}%`);
      paramIndex++;
    }

    query += ' ORDER BY u.name ASC LIMIT 50';

    const result = await pool.query(query, params);
    res.json({ users: result.rows });
  } catch (err) {
    console.error('Get users for course error:', err);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

export default router;
