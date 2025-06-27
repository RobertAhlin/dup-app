import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './verifyToken';

export function allowRoles(...allowedRoles: number[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user || !allowedRoles.includes(user.role_id)) {
      res.status(403).json({ error: 'Access denied: insufficient permissions' });
      return;
    }

    next();
  };
}
