// backend/src/routes/certificates.ts

import { Router } from 'express';
import { verifyToken, AuthenticatedRequest } from '../middleware/verifyToken';
import { getUserCertificates } from '../services/certificateService';
import pool from '../db';

const router = Router();

interface AuthUser {
  id: number;
  role_id: number;
  email: string;
}

/**
 * GET /api/certificates/my
 * Get all certificates for the current user
 */
router.get('/my', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const certificates = await getUserCertificates(user.id);

    // Transform to frontend-friendly format
    const response = certificates.map(cert => ({
      id: cert.id,
      courseId: cert.course_id,
      courseTitle: cert.course_title,
      courseIcon: cert.course_icon,
      issuedAt: cert.issued_at.toISOString(),
    }));

    res.json(response);
  } catch (err) {
    console.error('Get my certificates error:', err);
    res.status(500).json({ error: 'Failed to load certificates' });
  }
});

/**
 * GET /api/users/:userId/certificates
 * Get all certificates for a specific user (teacher/admin only)
 */
router.get('/users/:userId', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const targetUserId = Number(req.params.userId);
    if (!Number.isInteger(targetUserId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    // Check if current user is teacher or admin
    const roleRes = await pool.query<{ name: string }>(
      'SELECT name FROM roles WHERE id = $1',
      [user.role_id]
    );
    const roleName = roleRes.rows[0]?.name;

    if (roleName !== 'teacher' && roleName !== 'admin') {
      res.status(403).json({ error: 'Access denied: teacher or admin access required' });
      return;
    }

    // Get the target user's name for response
    const userRes = await pool.query<{ name: string }>(
      'SELECT name FROM users WHERE id = $1',
      [targetUserId]
    );
    
    if (!userRes.rows[0]) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userName = userRes.rows[0].name;
    const certificates = await getUserCertificates(targetUserId);

    // Transform to frontend-friendly format
    const response = {
      userId: targetUserId,
      userName,
      certificates: certificates.map(cert => ({
        id: cert.id,
        courseId: cert.course_id,
        courseTitle: cert.course_title,
        courseIcon: cert.course_icon,
        issuedAt: cert.issued_at.toISOString(),
      })),
    };

    res.json(response);
  } catch (err) {
    console.error('Get user certificates error:', err);
    res.status(500).json({ error: 'Failed to load certificates' });
  }
});

export default router;
