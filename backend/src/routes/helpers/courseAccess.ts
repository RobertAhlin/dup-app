import pool from '../../db';

export interface AuthUser {
  id: number;
  role_id: number;
}

export async function getRoleName(roleId: number | null | undefined): Promise<string | null> {
  if (!roleId) return null;
  const res = await pool.query<{ name: string }>('SELECT name FROM roles WHERE id = $1', [roleId]);
  return res.rows[0]?.name ?? null;
}

export async function canViewCourse(user: AuthUser, courseId: number): Promise<boolean> {
  const roleName = await getRoleName(user.role_id);
  if (!roleName) return false;
  if (roleName === 'admin') return true;

  if (roleName === 'teacher') {
    const result = await pool.query(
      `SELECT 1 FROM course c
         LEFT JOIN course_teachers ct ON ct.course_id = c.id AND ct.user_id = $2
       WHERE c.id = $1 AND (c.created_by = $2 OR ct.user_id = $2)
       LIMIT 1`,
      [courseId, user.id]
    );
    return result.rows.length > 0;
  }

  if (roleName === 'student') {
    const result = await pool.query(
      `SELECT 1 FROM course_enrollments ce
       JOIN course c ON c.id = ce.course_id
       WHERE ce.course_id = $1 AND ce.user_id = $2 AND c.is_locked = FALSE
       LIMIT 1`,
      [courseId, user.id]
    );
    return result.rows.length > 0;
  }

  return false;
}

export async function canEditCourse(user: AuthUser, courseId: number): Promise<boolean> {
  const roleName = await getRoleName(user.role_id);
  if (!roleName) return false;
  if (roleName === 'admin') return true;

  if (roleName === 'teacher') {
    const result = await pool.query(
      `SELECT 1 FROM course c
         LEFT JOIN course_teachers ct ON ct.course_id = c.id AND ct.user_id = $2
       WHERE c.id = $1 AND (c.created_by = $2 OR (ct.user_id = $2 AND ct.is_owner = TRUE))
       LIMIT 1`,
      [courseId, user.id]
    );
    return result.rows.length > 0;
  }

  return false;
}
