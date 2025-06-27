import { Router, Request, Response } from 'express';
import { verifyToken } from '../middleware/verifyToken';
import { allowRoles } from '../middleware/roles';

const router = Router();

// Example: test route to verify token
router.get('/protected', verifyToken, (req: Request, res: Response) => {
  res.json({ message: '🔐 Access granted to protected route!', user: (req as any).user });
});

// Example: admin-only route
router.get('/admin', verifyToken, allowRoles(1), (req: Request, res: Response) => {
  res.json({ message: '✅ Admin access granted', user: (req as any).user });
});
export default router;
