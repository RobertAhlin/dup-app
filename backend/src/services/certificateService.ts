// backend/src/services/certificateService.ts

import pool from '../db';

export interface Certificate {
  id: number;
  user_id: number;
  course_id: number;
  issued_at: Date;
}

export interface CertificateWithCourse extends Certificate {
  course_title: string;
  course_icon?: string;
}

/**
 * Check if all required hubs in a course are completed by a user
 */
async function areAllRequiredHubsCompleted(userId: number, courseId: number): Promise<boolean> {
  const result = await pool.query<{ all_completed: boolean }>(
    `SELECT (
      COUNT(*) = COALESCE(SUM(CASE WHEN hus.state = 'completed' THEN 1 ELSE 0 END), 0)
    ) AS all_completed
    FROM hub h
    LEFT JOIN hub_user_state hus ON hus.hub_id = h.id AND hus.user_id = $1
    WHERE h.course_id = $2 AND h.is_required = TRUE`,
    [userId, courseId]
  );

  return result.rows[0]?.all_completed ?? false;
}

/**
 * Check if a course is fully completed for a user
 * A course is completed when all required hubs are completed
 */
async function isCourseCompleted(userId: number, courseId: number): Promise<boolean> {
  return areAllRequiredHubsCompleted(userId, courseId);
}

/**
 * Check if a certificate already exists for a user and course
 */
async function certificateExists(userId: number, courseId: number): Promise<Certificate | null> {
  const result = await pool.query<Certificate>(
    `SELECT id, user_id, course_id, issued_at
     FROM certificate
     WHERE user_id = $1 AND course_id = $2`,
    [userId, courseId]
  );

  return result.rows[0] ?? null;
}

/**
 * Create a new certificate for a user and course
 */
async function createCertificate(userId: number, courseId: number): Promise<Certificate> {
  const result = await pool.query<Certificate>(
    `INSERT INTO certificate (user_id, course_id, issued_at)
     VALUES ($1, $2, NOW())
     RETURNING id, user_id, course_id, issued_at`,
    [userId, courseId]
  );

  return result.rows[0];
}

/**
 * Main function: Check if course is completed and issue certificate if needed
 * Returns the certificate (existing or newly created) if the course is completed,
 * or null if the course is not yet completed
 */
export async function checkAndIssueCertificate(
  userId: number,
  courseId: number
): Promise<Certificate | null> {
  // Check if the course is fully completed
  const completed = await isCourseCompleted(userId, courseId);
  
  if (!completed) {
    return null;
  }

  // Check if certificate already exists
  const existing = await certificateExists(userId, courseId);
  if (existing) {
    return existing;
  }

  // Create and return new certificate
  const newCertificate = await createCertificate(userId, courseId);
  return newCertificate;
}

/**
 * Get all certificates for a user with course details
 */
export async function getUserCertificates(userId: number): Promise<CertificateWithCourse[]> {
  const result = await pool.query<CertificateWithCourse>(
    `SELECT 
      cert.id,
      cert.user_id,
      cert.course_id,
      cert.issued_at,
      c.title AS course_title,
      c.icon AS course_icon
     FROM certificate cert
     JOIN course c ON c.id = cert.course_id
     WHERE cert.user_id = $1
     ORDER BY cert.issued_at DESC`,
    [userId]
  );

  return result.rows;
}
