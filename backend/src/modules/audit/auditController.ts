import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../../models/AuditLog';
import { sendSuccess } from '../../utils/response';

export async function listAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const action = req.query.action as string;
    const outcome = req.query.outcome as string;
    const search = req.query.search as string;

    const filter: Record<string, any> = {};
    if (action) filter.action = action;
    if (outcome) filter.outcome = outcome;
    if (search) {
      filter.$or = [
        { action: { $regex: search, $options: 'i' } },
        { actorEmail: { $regex: search, $options: 'i' } },
        { resourceType: { $regex: search, $options: 'i' } },
        { resourceId: { $regex: search, $options: 'i' } },
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('actorId', 'name email role')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    sendSuccess(res, {
      logs: logs.map(l => ({
        id: l._id.toString(),
        action: l.action,
        resourceType: l.resourceType,
        resourceId: l.resourceId,
        outcome: l.outcome,
        actor: l.actorId ? { name: (l.actorId as any).name, email: (l.actorId as any).email, role: (l.actorId as any).role } : { email: l.actorEmail },
        details: l.details,
        ipAddress: l.ipAddress,
        userAgent: l.userAgent,
        createdAt: l.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      }
    });
  } catch (err) {
    next(err);
  }
}
