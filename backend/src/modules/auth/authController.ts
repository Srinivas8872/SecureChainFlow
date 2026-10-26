import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { User } from '../../models/User';
import { Organization, OrganizationType } from '../../models/Organization';
import { AuditLog } from '../../models/AuditLog';
import { AppError } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import { registerSchema, loginSchema } from './authValidation';

function generateToken(userId: string, role: string, organizationId: string): string {
  return jwt.sign(
    { userId, role, organizationId },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as any }
  );
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = registerSchema.parse(req.body);
    const requestId = (req.headers['x-request-id'] as string) || undefined;

    // Check if user already exists
    const existingUser = await User.findOne({ email: validated.email });
    if (existingUser) {
      await AuditLog.create({
        action: 'USER_REGISTER_FAILED',
        actorEmail: validated.email,
        resourceType: 'USER',
        outcome: 'FAILURE',
        details: { reason: 'EMAIL_ALREADY_IN_USE' },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId
      });
      return next(new AppError('An account with this email address already exists.', 409, 'EMAIL_EXISTS'));
    }

    // Resolve Organization
    let organizationId = validated.organizationId;
    if (!organizationId) {
      const orgName = validated.organizationName || `${validated.name}'s Organization`;
      let org = await Organization.findOne({ name: orgName });
      if (!org) {
        const orgType: OrganizationType = validated.organizationType || (
          validated.role === 'ADMIN' ? 'ADMIN' :
          validated.role === 'SUPPLIER' ? 'SUPPLIER' :
          validated.role === 'PROCESSOR' ? 'MANUFACTURER' :
          validated.role === 'TRANSPORTER' ? 'LOGISTICS' :
          validated.role === 'WAREHOUSE' ? 'WAREHOUSING' :
          validated.role === 'RETAILER' ? 'RETAIL' : 'SUPPLIER'
        );

        org = await Organization.create({
          name: orgName,
          type: orgType,
          status: 'VERIFIED',
          facilities: ['Primary Facility']
        });
      }
      organizationId = org._id.toString();
    }

    // Create User (password will be hashed by pre-save hook)
    const user = await User.create({
      name: validated.name,
      email: validated.email,
      passwordHash: validated.password,
      role: validated.role,
      organizationId,
      status: 'ACTIVE'
    });

    const populatedUser = await User.findById(user._id).populate('organizationId', 'name type status');
    const token = generateToken(user._id.toString(), user.role, organizationId);

    await AuditLog.create({
      actorId: user._id,
      actorEmail: user.email,
      action: 'USER_REGISTERED',
      resourceType: 'USER',
      resourceId: user._id.toString(),
      outcome: 'SUCCESS',
      details: { role: user.role, organizationId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId
    });

    sendSuccess(
      res,
      {
        token,
        user: populatedUser?.toJSON()
      },
      201
    );
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = loginSchema.parse(req.body);
    const requestId = (req.headers['x-request-id'] as string) || undefined;

    const user = await User.findOne({ email: validated.email }).populate('organizationId', 'name type status');
    if (!user) {
      await AuditLog.create({
        action: 'USER_LOGIN_FAILED',
        actorEmail: validated.email,
        resourceType: 'USER',
        outcome: 'FAILURE',
        details: { reason: 'USER_NOT_FOUND' },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId
      });
      return next(new AppError('Invalid email or password credentials.', 401, 'INVALID_CREDENTIALS'));
    }

    if (user.status !== 'ACTIVE') {
      await AuditLog.create({
        actorId: user._id,
        actorEmail: user.email,
        action: 'USER_LOGIN_BLOCKED',
        resourceType: 'USER',
        resourceId: user._id.toString(),
        outcome: 'BLOCKED',
        details: { status: user.status },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId
      });
      return next(new AppError(`Account is currently ${user.status.toLowerCase()}. Access denied.`, 403, 'ACCOUNT_INACTIVE'));
    }

    const isMatch = await user.comparePassword(validated.password);
    if (!isMatch) {
      await AuditLog.create({
        actorId: user._id,
        actorEmail: user.email,
        action: 'USER_LOGIN_FAILED',
        resourceType: 'USER',
        resourceId: user._id.toString(),
        outcome: 'FAILURE',
        details: { reason: 'PASSWORD_MISMATCH' },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId
      });
      return next(new AppError('Invalid email or password credentials.', 401, 'INVALID_CREDENTIALS'));
    }

    user.lastLoginAt = new Date();
    await user.save();

    const orgId = (user.organizationId as any)?._id?.toString() || user.organizationId.toString();
    const token = generateToken(user._id.toString(), user.role, orgId);

    await AuditLog.create({
      actorId: user._id,
      actorEmail: user.email,
      action: 'USER_LOGGED_IN',
      resourceType: 'USER',
      resourceId: user._id.toString(),
      outcome: 'SUCCESS',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId
    });

    sendSuccess(res, {
      token,
      user: user.toJSON()
    });
  } catch (err) {
    next(err);
  }
}

export async function getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
    }

    const user = await User.findById(req.user.id).populate('organizationId', 'name type status facilities');
    if (!user) {
      return next(new AppError('User not found.', 404, 'NOT_FOUND'));
    }

    sendSuccess(res, {
      user: user.toJSON()
    });
  } catch (err) {
    next(err);
  }
}

export async function getOrganizations(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgs = await Organization.find({ status: 'VERIFIED' }).select('name type facilities');
    sendSuccess(res, orgs);
  } catch (err) {
    next(err);
  }
}
