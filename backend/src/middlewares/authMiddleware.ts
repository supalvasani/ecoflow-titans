import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { userId: string; role: string };
}

const JWT_SECRET = process.env.JWT_SECRET || 'synchroshift-secret-key-development-2026';

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ error: "Access denied" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

/**
 * Role-based authorization middleware
 * Checks if the authenticated user's role is in the required roles list.
 */
export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const currentRole = req.user.role;
    const allowed = roles.includes(currentRole);

    if (!allowed) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of the following roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Require Merchandiser or Admin
 */
export const requireMerchandiserOrAdmin = () => {
  return requireRole('MERCHANDISER', 'ADMIN');
};


/**
 * Require Category Approver or Admin
 */
export const requireApproverOrAdmin = () => {
  return requireRole('CATEGORY_APPROVER', 'ADMIN');
};


/**
 * Require Admin role only
 */
export const requireAdmin = () => {
  return requireRole('ADMIN');
};