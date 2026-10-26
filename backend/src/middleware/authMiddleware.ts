import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User, UserRole, IUser } from '../models/User';
import { Organization } from '../models/Organization';
import { AppError } from './errorHandler';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

interface JwtPayload {
  userId: string;
  role: UserRole;
  organizationId: string;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required. Missing or malformed Bearer token.', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    const user = await User.findById(decoded.userId).populate('organizationId', 'name status');
    if (!user) {
      return next(new AppError('User belonging to this token no longer exists.', 401, 'UNAUTHORIZED'));
    }

    if (user.status !== 'ACTIVE') {
      return next(new AppError(`Account is ${user.status.toLowerCase()}. Please contact an administrator.`, 403, 'ACCOUNT_INACTIVE'));
    }

    const org = user.organizationId as any;
    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: org?._id?.toString() || user.organizationId.toString(),
      organizationName: org?.name || 'Unknown Organization'
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Your session has expired. Please sign in again.', 401, 'TOKEN_EXPIRED'));
    }
    return next(new AppError('Invalid authentication token.', 401, 'INVALID_TOKEN'));
  }
}

/**
 * Role-Based Access Control Middleware
 * Requires the authenticated user to possess one of the allowed roles.
 */
export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access forbidden: Role '${req.user.role}' is not authorized to perform this operation. Allowed: [${allowedRoles.join(', ')}]`,
          403,
          'FORBIDDEN_ROLE'
        )
      );
    }

    next();
  };
}

/**
 * Enforces organization-level isolation.
 * Admin role is globally permitted; all other roles must match the target organization.
 */
export function requireOrganization(targetOrgIdGetter: (req: Request) => string | undefined) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
    }

    if (req.user.role === 'ADMIN') {
      return next(); // Admins have global cross-organization oversight
    }

    const targetOrgId = targetOrgIdGetter(req);
    if (!targetOrgId) {
      return next(new AppError('Target organization identifier could not be verified.', 400, 'BAD_REQUEST'));
    }

    if (req.user.organizationId !== targetOrgId) {
      return next(
        new AppError(
          'Cross-organization access violation: You are not authorized to view or mutate records belonging to another organization.',
          403,
          'FORBIDDEN_ORGANIZATION'
        )
      );
    }

    next();
  };
}
