import { Router, Request, Response } from 'express';
import { verifyToken } from '../middleware/verifyToken';

const router = Router();

router.get('/protected', verifyToken, (req: Request, res: Response) => {
  res.json({ message: '🔐 Access granted to protected route!', user: (req as any).user });
});

export default router;
