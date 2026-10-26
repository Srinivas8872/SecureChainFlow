import { Request, Response, NextFunction } from 'express';
import { Batch } from '../../models/Batch';
import { SupplyChainEvent } from '../../models/SupplyChainEvent';
import { Organization } from '../../models/Organization';
import { AuditLog } from '../../models/AuditLog';
import { AppError } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import { computeSha256 } from '../../utils/crypto';
import { env } from '../../config/env';
import {
  isValidTransition,
  isRoleAuthorizedForEvent,
  EVENT_TO_BATCH_STATUS_MAP
} from './eventStateMachine';
import { createEventSchema } from './eventValidation';

export async function recordEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
    }

    const { batchId } = req.params;
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return next(new AppError('Batch record not found.', 404, 'BATCH_NOT_FOUND'));
    }

    const validated = createEventSchema.parse(req.body);

    // 1. Idempotency Check
    if (validated.idempotencyKey) {
      const existing = await SupplyChainEvent.findOne({
        batchId: batch._id,
        idempotencyKey: validated.idempotencyKey
      })
        .populate('actorId', 'name email role')
        .populate('organizationId', 'name type');

      if (existing) {
        // Idempotent replay: return existing resource
        sendSuccess(res, existing.toJSON(), 200, {
          requestId: req.headers['x-request-id'] as string
        });
        return;
      }
    }

    // 2. Role Authorization Check
    if (!isRoleAuthorizedForEvent(req.user.role, validated.eventType)) {
      return next(
        new AppError(
          `Role '${req.user.role}' is not authorized to record '${validated.eventType}' events.`,
          403,
          'FORBIDDEN_EVENT_ROLE'
        )
      );
    }

    // 3. State Transition Validation
    if (!isValidTransition(batch.status, validated.eventType)) {
      return next(
        new AppError(
          `Invalid state transition: Cannot transition batch status from '${batch.status}' via '${validated.eventType}' event.`,
          400,
          'INVALID_STATE_TRANSITION'
        )
      );
    }

    const occurredAt = validated.occurredAt ? new Date(validated.occurredAt) : new Date();

    // 4. Compute Canonical SHA-256 Digest
    const canonicalEventPayload = {
      batchId: batch._id.toString(),
      batchCode: batch.batchCode,
      eventType: validated.eventType,
      actorId: req.user.id,
      organizationId: req.user.organizationId,
      location: validated.location || null,
      facility: validated.facility || null,
      temperature: validated.temperature !== undefined ? validated.temperature : null,
      humidity: validated.humidity !== undefined ? validated.humidity : null,
      notes: validated.notes || null,
      occurredAt: occurredAt.toISOString()
    };

    const payloadHash = computeSha256(canonicalEventPayload);
    const initialBlockchainStatus = env.FABRIC_USE_MOCK_GATEWAY ? 'LOCAL_DEMO' : 'PENDING';

    // 5. Create Event Record
    const event = await SupplyChainEvent.create({
      batchId: batch._id,
      eventType: validated.eventType,
      actorId: req.user.id,
      organizationId: req.user.organizationId,
      location: validated.location,
      facility: validated.facility,
      temperature: validated.temperature,
      humidity: validated.humidity,
      notes: validated.notes,
      payloadHash,
      blockchainStatus: initialBlockchainStatus,
      idempotencyKey: validated.idempotencyKey,
      occurredAt
    });

    // 6. Update Batch State & Custody Handover
    const newStatus = EVENT_TO_BATCH_STATUS_MAP[validated.eventType];
    batch.status = newStatus;

    if (validated.newCustodianOrgId) {
      const targetOrg = await Organization.findById(validated.newCustodianOrgId);
      if (targetOrg) {
        batch.currentCustodianId = targetOrg._id as any;
      }
    } else if (validated.eventType === 'RECEIVED') {
      // The receiving organization takes immediate custody
      batch.currentCustodianId = req.user.organizationId as any;
    }

    await batch.save();

    // 7. Audit Trail
    await AuditLog.create({
      actorId: req.user.id,
      actorEmail: req.user.email,
      action: 'SUPPLY_CHAIN_EVENT_RECORDED',
      resourceType: 'SUPPLY_CHAIN_EVENT',
      resourceId: event._id.toString(),
      outcome: 'SUCCESS',
      details: {
        batchId: batch._id.toString(),
        eventType: event.eventType,
        payloadHash,
        previousStatus: batch.status,
        newStatus
      },
      ipAddress: req.ip,
      requestId: req.headers['x-request-id'] as string
    });

    const populated = await SupplyChainEvent.findById(event._id)
      .populate('actorId', 'name email role')
      .populate('organizationId', 'name type');

    sendSuccess(res, populated?.toJSON(), 201);
  } catch (err) {
    next(err);
  }
}

export async function listEventsByBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { batchId } = req.params;

    const batch = await Batch.findById(batchId);
    if (!batch) {
      return next(new AppError('Batch record not found.', 404, 'BATCH_NOT_FOUND'));
    }

    const events = await SupplyChainEvent.find({ batchId: batch._id })
      .populate('actorId', 'name email role')
      .populate('organizationId', 'name type')
      .sort({ occurredAt: 1, createdAt: 1 });

    sendSuccess(res, events.map(e => e.toJSON()));
  } catch (err) {
    next(err);
  }
}
