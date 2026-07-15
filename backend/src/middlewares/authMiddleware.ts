import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { userId: string; role: string };
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    'FATAL: JWT_SECRET environment variable is not set. ' +
    'The server cannot start without a secret key for signing tokens.'
  );
}

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
 * Checks if authenticated user has one of the required roles
 */
export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of the following roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Shorthand: Require ENGINEERING_USER or ADMIN role
 */
export const requireEngineerOrAdmin = () => {
  return requireRole('ENGINEERING_USER', 'ADMIN');
};

/**
 * Shorthand: Require APPROVER or ADMIN role
 */
export const requireApprover = () => {
  return requireRole('APPROVER', 'ADMIN');
};

/**
 * Shorthand: Require ADMIN role only
 */
export const requireAdmin = () => {
  return requireRole('ADMIN');
};