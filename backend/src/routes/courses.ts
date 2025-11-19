import { Router } from 'express';
import pool from '../db';
import { verifyToken, AuthenticatedRequest } from '../middleware/verifyToken';
import { ensureAdmin } from '../middleware/roles';
import { getRoleName, canViewCourse, AuthUser } from './helpers/courseAccess';

const router = Router();

// Create
router.post('/', verifyToken, ensureAdmin, async (req: AuthenticatedRequest, res) => {
  const { title, description, icon } = req.body as { title?: string; description?: string; icon?: string };
  if (!title) {
    res.status(400).json({ error: 'title is required' });
    return;
  }
  try {
    const created_by = req.user?.id ?? null;
    const result = await pool.query(
      `INSERT INTO course (title, description, created_by, icon)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, description, created_by, icon, created_at`,
      [title, description ?? null, created_by, icon ?? null]
    );
    const inserted = result.rows[0];
    // fetch creator name
    const ures = inserted.created_by ? await pool.query('SELECT name FROM users WHERE id = $1', [inserted.created_by]) : { rows: [{ name: null }] };
    res.status(201).json({ course: { ...inserted, creator_name: ures.rows[0]?.name ?? null } });
  } catch (err) {
    console.error('Create course error:', err);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// Read all with RBAC filtering
// admin: all courses
// teacher: courses they own (created_by = user.id OR course_teachers.is_owner)
// student: courses they are enrolled in (course_enrollments)
router.get('/', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const roleName = await getRoleName(user.role_id);
    if (!roleName) {
      res.status(403).json({ error: 'Role not found' });
      return;
    }

    let rows: any[] = [];
    if (roleName === 'admin') {
      const result = await pool.query(
        `SELECT c.id, c.title, c.description, c.created_at, c.created_by, c.icon,
                u.name AS creator_name
         FROM course c
         LEFT JOIN users u ON u.id = c.created_by
         ORDER BY c.created_at DESC`
      );
      rows = result.rows;
    } else if (roleName === 'teacher') {
      const result = await pool.query(
        `SELECT DISTINCT c.id, c.title, c.description, c.created_at, c.created_by, c.icon,
                u.name AS creator_name
         FROM course c
         LEFT JOIN users u ON u.id = c.created_by
         LEFT JOIN course_teachers ct ON ct.course_id = c.id AND ct.user_id = $1 AND ct.is_owner = TRUE
         WHERE c.created_by = $1 OR ct.user_id = $1
         ORDER BY c.created_at DESC`,
        [user.id]
      );
      rows = result.rows;
    } else if (roleName === 'student') {
      const result = await pool.query(
        `SELECT c.id, c.title, c.description, c.created_at, c.created_by, c.icon,
                u.name AS creator_name
         FROM course c
         JOIN course_enrollments ce ON ce.course_id = c.id AND ce.user_id = $1
         LEFT JOIN users u ON u.id = c.created_by
         ORDER BY c.created_at DESC`,
        [user.id]
      );
      rows = result.rows;
    } else {
      // Unknown role -> no courses
      rows = [];
    }

    res.json({ courses: rows });
  } catch (err) {
    console.error('List courses error:', err);
    res.status(500).json({ error: 'Failed to list courses' });
  }
});

// Dashboard: Get user's enrolled courses with progress summary
router.get('/dashboard/progress', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const roleName = await getRoleName(user.role_id);
    if (roleName !== 'student') {
      // Only students have enrollment-based progress view
      res.json({ courses: [] });
      return;
    }

    // Get enrolled courses with progress
    const result = await pool.query(
      `SELECT 
         c.id, 
         c.title, 
         c.icon,
         (SELECT COUNT(*) FROM task t JOIN hub h ON h.id = t.hub_id WHERE h.course_id = c.id) AS total_tasks,
         (SELECT COUNT(*) FROM hub WHERE course_id = c.id) AS total_hubs,
         (SELECT COUNT(*) FROM task_progress tp JOIN task t ON t.id = tp.task_id JOIN hub h ON h.id = t.hub_id 
          WHERE tp.user_id = $1 AND h.course_id = c.id AND tp.status = 'completed') AS completed_tasks,
         (SELECT COUNT(*) FROM hub_user_state hus JOIN hub h ON h.id = hus.hub_id 
          WHERE hus.user_id = $1 AND h.course_id = c.id AND hus.state = 'completed') AS completed_hubs
       FROM course c
       JOIN course_enrollments ce ON ce.course_id = c.id AND ce.user_id = $1
       ORDER BY c.created_at DESC`,
      [user.id]
    );

    const courses = result.rows.map(row => {
      const totalItems = Number(row.total_tasks) + Number(row.total_hubs);
      const completedItems = Number(row.completed_tasks) + Number(row.completed_hubs);
      const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      
      return {
        id: row.id,
        title: row.title,
        icon: row.icon,
        progress: {
          totalTasks: Number(row.total_tasks),
          totalHubs: Number(row.total_hubs),
          completedTasks: Number(row.completed_tasks),
          completedHubs: Number(row.completed_hubs),
          totalItems,
          completedItems,
          percentage,
        },
      };
    });

    res.json({ courses });
  } catch (err) {
    console.error('Get dashboard progress error:', err);
    res.status(500).json({ error: 'Failed to load dashboard progress' });
  }
});

// Teacher dashboard: average completion rate per course
router.get('/dashboard/teacher-stats', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const roleName = await getRoleName(user.role_id);
    if (roleName !== 'teacher' && roleName !== 'admin') {
      res.json({ courses: [] });
      return;
    }

    // Get courses where user is a teacher, or all courses if admin
    const isAdmin = roleName === 'admin';
    const result = await pool.query(
      `WITH course_stats AS (
        SELECT 
          c.id,
          c.title,
          c.icon,
          COUNT(DISTINCT ce.user_id) AS total_students,
          (SELECT COUNT(*) FROM task t JOIN hub h ON h.id = t.hub_id WHERE h.course_id = c.id) AS total_tasks,
          (SELECT COUNT(*) FROM hub WHERE course_id = c.id) AS total_hubs,
          COALESCE(
            (SELECT COUNT(*) 
             FROM task_progress tp 
             JOIN task t ON t.id = tp.task_id 
             JOIN hub h ON h.id = t.hub_id 
             JOIN course_enrollments ce2 ON ce2.user_id = tp.user_id AND ce2.course_id = c.id
             WHERE h.course_id = c.id AND tp.status = 'completed'), 0
          ) AS total_completed_tasks,
          COALESCE(
            (SELECT COUNT(*) 
             FROM hub_user_state hus 
             JOIN hub h ON h.id = hus.hub_id 
             JOIN course_enrollments ce2 ON ce2.user_id = hus.user_id AND ce2.course_id = c.id
             WHERE h.course_id = c.id AND hus.state = 'completed'), 0
          ) AS total_completed_hubs
        FROM course c
        ${isAdmin ? '' : 'JOIN course_teachers ct ON ct.course_id = c.id AND ct.user_id = $1'}
        LEFT JOIN course_enrollments ce ON ce.course_id = c.id
        GROUP BY c.id, c.title, c.icon
      )
      SELECT 
        id,
        title,
        icon,
        total_students,
        total_tasks,
        total_hubs,
        total_completed_tasks,
        total_completed_hubs,
        (total_tasks + total_hubs) AS total_items,
        (total_completed_tasks + total_completed_hubs) AS total_completed_items
      FROM course_stats
      ORDER BY title`,
      isAdmin ? [] : [user.id]
    );

    const courses = result.rows.map(row => {
      const totalItems = Number(row.total_items);
      const totalCompletedItems = Number(row.total_completed_items);
      const totalStudents = Number(row.total_students);
      
      // Calculate average completion percentage across all students
      const averagePercentage = totalStudents > 0 && totalItems > 0
        ? Math.round((totalCompletedItems / (totalItems * totalStudents)) * 100)
        : 0;
      
      return {
        id: row.id,
        title: row.title,
        icon: row.icon,
        stats: {
          totalStudents,
          totalTasks: Number(row.total_tasks),
          totalHubs: Number(row.total_hubs),
          totalItems,
          totalCompletedItems,
          averagePercentage,
        },
      };
    });

    res.json({ courses });
  } catch (err) {
    console.error('Get teacher dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to load teacher dashboard stats' });
  }
});

// Activity log for dashboard
router.get('/dashboard/activity', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const roleName = await getRoleName(user.role_id);
    const limit = Number(req.query.limit) || 20;

    if (roleName === 'teacher' || roleName === 'admin') {
      // Get activity from all courses the teacher is assigned to, or all courses for admin
      const isAdmin = roleName === 'admin';
      const result = await pool.query(
        `SELECT 
          'task' AS activity_type,
          u.name AS user_name,
          t.title AS item_title,
          c.title AS course_title,
          tp.completed_at AS timestamp
         FROM task_progress tp
         JOIN users u ON u.id = tp.user_id
         JOIN task t ON t.id = tp.task_id
         JOIN hub h ON h.id = t.hub_id
         JOIN course c ON c.id = h.course_id
         ${isAdmin ? '' : 'JOIN course_teachers ct ON ct.course_id = c.id AND ct.user_id = $1'}
         WHERE tp.status = 'completed' AND tp.completed_at IS NOT NULL
         
         UNION ALL
         
         SELECT 
          'hub' AS activity_type,
          u.name AS user_name,
          h.title AS item_title,
          c.title AS course_title,
          hus.completed_at AS timestamp
         FROM hub_user_state hus
         JOIN users u ON u.id = hus.user_id
         JOIN hub h ON h.id = hus.hub_id
         JOIN course c ON c.id = h.course_id
         ${isAdmin ? '' : 'JOIN course_teachers ct ON ct.course_id = c.id AND ct.user_id = $1'}
         WHERE hus.state = 'completed' AND hus.completed_at IS NOT NULL
         
         ORDER BY timestamp DESC
         LIMIT ${isAdmin ? '$1' : '$2'}`,
        isAdmin ? [limit] : [user.id, limit]
      );

      const activities = result.rows.map(row => ({
        type: row.activity_type,
        userName: row.user_name,
        itemTitle: row.item_title,
        courseTitle: row.course_title,
        timestamp: row.timestamp,
      }));

      res.json({ activities });
    } else {
      // Student view: activity from enrolled courses
      const result = await pool.query(
        `SELECT 
          'task' AS activity_type,
          u.name AS user_name,
          t.title AS item_title,
          c.title AS course_title,
          tp.completed_at AS timestamp
         FROM task_progress tp
         JOIN users u ON u.id = tp.user_id
         JOIN task t ON t.id = tp.task_id
         JOIN hub h ON h.id = t.hub_id
         JOIN course c ON c.id = h.course_id
         JOIN course_enrollments ce ON ce.course_id = c.id AND ce.user_id = $1
         WHERE tp.status = 'completed' AND tp.completed_at IS NOT NULL
         
         UNION ALL
         
         SELECT 
          'hub' AS activity_type,
          u.name AS user_name,
          h.title AS item_title,
          c.title AS course_title,
          hus.completed_at AS timestamp
         FROM hub_user_state hus
         JOIN users u ON u.id = hus.user_id
         JOIN hub h ON h.id = hus.hub_id
         JOIN course c ON c.id = h.course_id
         JOIN course_enrollments ce ON ce.course_id = c.id AND ce.user_id = $1
         WHERE hus.state = 'completed' AND hus.completed_at IS NOT NULL
         
         ORDER BY timestamp DESC
         LIMIT $2`,
        [user.id, limit]
      );

      const activities = result.rows.map(row => ({
        type: row.activity_type,
        userName: row.user_name,
        itemTitle: row.item_title,
        courseTitle: row.course_title,
        timestamp: row.timestamp,
      }));

      res.json({ activities });
    }
  } catch (err) {
    console.error('Get dashboard activity error:', err);
    res.status(500).json({ error: 'Failed to load activity log' });
  }
});


router.get('/:id/graph', verifyToken, async (req: AuthenticatedRequest, res) => {
  const courseId = Number(req.params.id);
  if (!Number.isInteger(courseId)) {
    res.status(400).json({ error: 'Invalid course id' });
    return;
  }

  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const allowed = await canViewCourse(user, courseId);
    if (!allowed) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const [hubsRes, tasksRes, edgesRes] = await Promise.all([
      pool.query(
        `SELECT id, course_id, title, x, y, color, radius, is_start
         FROM hub
         WHERE course_id = $1
         ORDER BY id`,
        [courseId]
      ),
      pool.query(
        `SELECT t.id, t.hub_id, t.title, t.task_kind, t.x, t.y
         FROM task t
         JOIN hub h ON h.id = t.hub_id
         WHERE h.course_id = $1
         ORDER BY t.id`,
        [courseId]
      ),
      pool.query(
        `SELECT id, course_id, from_hub_id, to_hub_id,
                (rule_value->>'color') AS color
         FROM hub_edge
         WHERE course_id = $1
         ORDER BY id`,
        [courseId]
      ),
    ]);

    res.json({
      graph: {
        hubs: hubsRes.rows,
        tasks: tasksRes.rows,
        edges: edgesRes.rows,
      },
    });
  } catch (err) {
    console.error('Get course graph error:', err);
    res.status(500).json({ error: 'Failed to load course graph' });
  }
});

// Per-user progress for a course (tasks + hubs)
router.get('/:id/progress', verifyToken, async (req: AuthenticatedRequest, res) => {
  const courseId = Number(req.params.id)
  if (!Number.isInteger(courseId)) {
    res.status(400).json({ error: 'Invalid course id' })
    return
  }
  try {
    const user = req.user as AuthUser | undefined
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }
    const allowed = await canViewCourse(user, courseId)
    if (!allowed) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    const [taskProgRes, hubProgRes, totalsRes] = await Promise.all([
      pool.query(
        `SELECT tp.task_id, tp.status
           FROM task_progress tp
           JOIN task t ON t.id = tp.task_id
           JOIN hub h  ON h.id = t.hub_id
          WHERE tp.user_id = $1 AND h.course_id = $2`,
        [user.id, courseId]
      ),
      pool.query(
        `SELECT hus.hub_id, hus.state
           FROM hub_user_state hus
           JOIN hub h ON h.id = hus.hub_id
          WHERE hus.user_id = $1 AND h.course_id = $2`,
        [user.id, courseId]
      ),
      pool.query(
        `SELECT 
           (SELECT COUNT(*) FROM task t JOIN hub h ON h.id = t.hub_id WHERE h.course_id = $2) AS total_tasks,
           (SELECT COUNT(*) FROM hub WHERE course_id = $2) AS total_hubs,
           (SELECT COUNT(*) FROM task_progress tp JOIN task t ON t.id = tp.task_id JOIN hub h ON h.id = t.hub_id 
            WHERE tp.user_id = $1 AND h.course_id = $2 AND tp.status = 'completed') AS completed_tasks,
           (SELECT COUNT(*) FROM hub_user_state hus JOIN hub h ON h.id = hus.hub_id 
            WHERE hus.user_id = $1 AND h.course_id = $2 AND hus.state = 'completed') AS completed_hubs`,
        [user.id, courseId]
      )
    ])

    const totals = totalsRes.rows[0]
    const totalItems = Number(totals.total_tasks) + Number(totals.total_hubs)
    const completedItems = Number(totals.completed_tasks) + Number(totals.completed_hubs)
    const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

    res.json({
      taskProgress: taskProgRes.rows,
      hubProgress: hubProgRes.rows,
      summary: {
        totalTasks: Number(totals.total_tasks),
        totalHubs: Number(totals.total_hubs),
        completedTasks: Number(totals.completed_tasks),
        completedHubs: Number(totals.completed_hubs),
        totalItems,
        completedItems,
        percentage,
      },
    })
  } catch (err) {
    console.error('Get course progress error:', err)
    res.status(500).json({ error: 'Failed to load progress' })
  }
})

// Read one with RBAC visibility enforcement
router.get('/:id', verifyToken, async (req: AuthenticatedRequest, res) => {
  const courseId = Number(req.params.id);
  if (!Number.isInteger(courseId)) {
    res.status(400).json({ error: 'Invalid course id' });
    return;
  }
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const allowed = await canViewCourse(user, courseId);
    if (!allowed) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Always fetch course basic data
    const courseRes = await pool.query(
      `SELECT c.id, c.title, c.description, c.created_at, c.created_by, c.icon,
              u.name AS creator_name
       FROM course c
       LEFT JOIN users u ON u.id = c.created_by
       WHERE c.id = $1`,
      [courseId]
    );
    if (!courseRes.rows.length) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }
    const course = courseRes.rows[0];

    res.json({ course });
  } catch (err) {
    console.error('Get course error:', err);
    res.status(500).json({ error: 'Failed to get course' });
  }
});

// Update
router.put('/:id', verifyToken, ensureAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, description, icon } = req.body as { title?: string; description?: string | null; icon?: string | null };
  try {
    const result = await pool.query(
      `UPDATE course
       SET title = COALESCE($1, title),
           description = $2,
           icon = COALESCE($3, icon)
       WHERE id = $4
       RETURNING id, title, description, created_at, created_by, icon`,
      [title ?? null, description ?? null, icon ?? null, id]
    );
    if (!result.rows.length) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }
    res.json({ course: result.rows[0] });
  } catch (err) {
    console.error('Update course error:', err);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// Admin stats endpoint
router.get('/dashboard/admin-stats', verifyToken, ensureAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    // Get total users (teachers and students)
    const usersResult = await pool.query(
      `SELECT 
        COUNT(CASE WHEN r.name = 'teacher' THEN 1 END) AS total_teachers,
        COUNT(CASE WHEN r.name = 'student' THEN 1 END) AS total_students,
        COUNT(*) AS total_users
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE r.name IN ('teacher', 'student')`
    );

    // Get total courses
    const coursesResult = await pool.query('SELECT COUNT(*) AS total_courses FROM course');

    // Get logins in last week
    const weekAgoResult = await pool.query(
      `SELECT COUNT(*) AS logins_last_week
       FROM users
       WHERE last_login_at >= NOW() - INTERVAL '7 days'`
    );

    // Get active sessions (users logged in within last 30 minutes)
    const activeSessionsResult = await pool.query(
      `SELECT COUNT(*) AS active_sessions
       FROM users
       WHERE last_login_at >= NOW() - INTERVAL '30 minutes'`
    );

    res.json({
      stats: {
        totalTeachers: parseInt(usersResult.rows[0].total_teachers || '0'),
        totalStudents: parseInt(usersResult.rows[0].total_students || '0'),
        totalUsers: parseInt(usersResult.rows[0].total_users || '0'),
        totalCourses: parseInt(coursesResult.rows[0].total_courses || '0'),
        loginsLastWeek: parseInt(weekAgoResult.rows[0].logins_last_week || '0'),
        activeSessions: parseInt(activeSessionsResult.rows[0].active_sessions || '0'),
      }
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// Delete
router.delete('/:id', verifyToken, ensureAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM course WHERE id = $1 RETURNING id`, [id]);
    if (!result.rows.length) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Delete course error:', err);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

export default router;
