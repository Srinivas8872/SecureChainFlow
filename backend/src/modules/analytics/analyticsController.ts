import { Request, Response, NextFunction } from 'express';
import { Batch } from '../../models/Batch';
import { Product } from '../../models/Product';
import { SupplyChainEvent } from '../../models/SupplyChainEvent';
import { AuditLog } from '../../models/AuditLog';
import { AppError } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import { computeSha256, computeEventPayloadHash } from '../../utils/crypto';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://localhost:8000';
const AI_TIMEOUT_MS = 5000;

/**
 * Calls the FastAPI AI service to compute a risk score for a batch.
 * Falls back to a heuristic score if the service is unavailable.
 */
async function callAiRiskScore(payload: Record<string, any>): Promise<{
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  anomalies: string[];
  source: 'ai_service' | 'heuristic_fallback';
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    const response = await fetch(`${AI_SERVICE_URL}/api/v1/risk-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`AI service returned HTTP ${response.status}`);
    }

    const data = (await response.json()) as {
      risk_score: number;
      risk_level: string;
      anomalies: string[];
    };

    return {
      riskScore: data.risk_score,
      riskLevel: data.risk_level as any,
      anomalies: data.anomalies ?? [],
      source: 'ai_service',
    };
  } catch {
    // Graceful heuristic fallback when AI service is unavailable
    return computeHeuristicRisk(payload);
  }
}

/**
 * Heuristic fallback risk computation based on event chain signals.
 */
function computeHeuristicRisk(payload: Record<string, any>): {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  anomalies: string[];
  source: 'heuristic_fallback';
} {
  const anomalies: string[] = [];
  let score = 0;

  const events: any[] = payload.events ?? [];
  const batch = payload.batch ?? {};

  // Recalled batch
  if (batch.status === 'RECALLED') {
    score += 80;
    anomalies.push('Batch has been recalled');
  }

  // Expired batch
  if (batch.expiryDate && new Date(batch.expiryDate) < new Date()) {
    score += 50;
    anomalies.push('Batch has passed expiry date');
  }

  // Blockchain hash integrity failures
  if (payload.hashMismatches > 0) {
    score += payload.hashMismatches * 30;
    anomalies.push(`${payload.hashMismatches} payload hash mismatch(es) detected`);
  }

  // Temperature excursions
  const tempEvents = events.filter(
    (e) => e.temperature != null && (e.temperature > 8 || e.temperature < -2)
  );
  if (tempEvents.length > 0) {
    score += tempEvents.length * 15;
    anomalies.push(`${tempEvents.length} temperature excursion(s) detected`);
  }

  // Humidity excursions
  const humEvents = events.filter((e) => e.humidity != null && e.humidity > 85);
  if (humEvents.length > 0) {
    score += humEvents.length * 10;
    anomalies.push(`${humEvents.length} high humidity reading(s) detected`);
  }

  // No events at all
  if (events.length === 0) {
    score += 20;
    anomalies.push('No supply chain events recorded');
  }

  // Long gap between events (>72h between consecutive events)
  for (let i = 1; i < events.length; i++) {
    const prev = new Date(events[i - 1].occurredAt).getTime();
    const curr = new Date(events[i].occurredAt).getTime();
    const gapHours = (curr - prev) / 3600000;
    if (gapHours > 72) {
      score += 10;
      anomalies.push(`${Math.round(gapHours)}h gap between consecutive events`);
      break;
    }
  }

  const clampedScore = Math.min(100, score);

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (clampedScore >= 80) riskLevel = 'CRITICAL';
  else if (clampedScore >= 50) riskLevel = 'HIGH';
  else if (clampedScore >= 20) riskLevel = 'MEDIUM';

  return { riskScore: clampedScore, riskLevel, anomalies, source: 'heuristic_fallback' };
}

/**
 * POST /api/v1/analytics/risk
 * Computes AI-powered anomaly risk score for a batch.
 * Requires authentication.
 */
export async function getBatchRiskScore(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const batchId = ((req.body?.batchId || req.query?.batchId) as string | undefined)?.trim();

    if (!batchId) {
      return next(new AppError('batchId is required in request body or query parameter.', 400, 'BAD_REQUEST'));
    }

    const batch = await Batch.findById(batchId)
      .populate('productId', 'name category')
      .lean();

    if (!batch) {
      return next(new AppError('Batch not found.', 404, 'BATCH_NOT_FOUND'));
    }

    const events = await SupplyChainEvent.find({ batchId }).sort({ occurredAt: 1 }).lean();

    // Recompute integrity mismatches for the AI payload
    const hashMismatches = events.filter((e) => {
      if (!e.payloadHash) return false;

      const actor = e.actorId as any;
      const org = e.organizationId as any;
      const actorIdStr = actor?._id?.toString?.() ?? (typeof actor === 'string' ? actor : null);
      const orgIdStr = org?._id?.toString?.() ?? (typeof org === 'string' ? org : null);

      let recomputedHash = computeEventPayloadHash({
        batchId: batch._id.toString(),
        batchCode: batch.batchCode,
        eventType: e.eventType,
        actorId: actorIdStr,
        organizationId: orgIdStr,
        location: e.location ?? null,
        facility: e.facility ?? null,
        temperature: e.temperature,
        humidity: e.humidity,
        notes: e.notes ?? null,
        occurredAt: e.occurredAt,
      });

      if (recomputedHash !== e.payloadHash) {
        const legacyHash = computeSha256({
          batchId: batchId,
          eventType: e.eventType,
          occurredAt: e.occurredAt?.toISOString?.() ?? e.occurredAt,
          location: e.location,
          temperature: e.temperature,
          humidity: e.humidity,
        });
        if (legacyHash === e.payloadHash) {
          recomputedHash = legacyHash;
        }
      }

      return recomputedHash !== e.payloadHash;
    }).length;

    const aiPayload = {
      batch: {
        batchCode: batch.batchCode,
        status: batch.status,
        blockchainStatus: batch.blockchainStatus,
        manufactureDate: batch.manufactureDate,
        expiryDate: batch.expiryDate ?? null,
        quantity: batch.quantity,
        unit: batch.unit,
      },
      events: events.map((e) => ({
        eventType: e.eventType,
        occurredAt: e.occurredAt,
        temperature: e.temperature ?? null,
        humidity: e.humidity ?? null,
        blockchainStatus: e.blockchainStatus,
        location: e.location ?? null,
      })),
      hashMismatches,
      totalEvents: events.length,
    };

    const riskResult = await callAiRiskScore(aiPayload);

    sendSuccess(res, {
      batchId,
      batchCode: batch.batchCode,
      ...riskResult,
      analysedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/analytics/summary
 * Returns platform-wide KPIs for the dashboard.
 * Requires authentication.
 */
export async function getAnalyticsSummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const [
      totalBatches,
      totalEvents,
      totalProducts,
      statusCounts,
      eventTypeCounts,
      blockchainCounts,
      recentEventsRaw,
    ] = await Promise.all([
      Batch.countDocuments(),
      SupplyChainEvent.countDocuments(),
      Product.countDocuments(),
      Batch.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      SupplyChainEvent.aggregate([
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
      ]),
      Batch.aggregate([
        { $group: { _id: '$blockchainStatus', count: { $sum: 1 } } },
      ]),
      SupplyChainEvent.find()
        .sort({ occurredAt: -1 })
        .limit(6)
        .populate('batchId', 'batchCode')
        .populate('actorId', 'name role')
        .populate('organizationId', 'name')
        .lean(),
    ]);

    const recalledBatches = statusCounts.find((s) => s._id === 'RECALLED')?.count ?? 0;
    const committedBatches = blockchainCounts.find((s) => s._id === 'COMMITTED')?.count ?? 0;

    const recentEvents = recentEventsRaw.map((e: any) => ({
      id: e._id.toString(),
      batchCode: e.batchId?.batchCode ?? 'Unknown Batch',
      eventType: e.eventType,
      location: e.location ?? null,
      facility: e.facility ?? null,
      temperature: e.temperature ?? null,
      humidity: e.humidity ?? null,
      blockchainStatus: e.blockchainStatus,
      occurredAt: e.occurredAt,
      recordedBy: e.actorId ? { name: e.actorId.name, role: e.actorId.role } : null,
      organization: e.organizationId ? { name: e.organizationId.name } : null,
    }));

    sendSuccess(
      res,
      {
        totalBatches,
        totalEvents,
        totalProducts,
        recalledBatches,
        committedBatches,
        blockchainCommitRate:
          totalBatches > 0 ? Math.round((committedBatches / totalBatches) * 100) : 0,
        statusBreakdown: statusCounts.reduce(
          (acc, s) => ({ ...acc, [s._id]: s.count }),
          {} as Record<string, number>
        ),
        eventTypeBreakdown: eventTypeCounts.reduce(
          (acc, s) => ({ ...acc, [s._id]: s.count }),
          {} as Record<string, number>
        ),
        blockchainBreakdown: blockchainCounts.reduce(
          (acc, s) => ({ ...acc, [s._id]: s.count }),
          {} as Record<string, number>
        ),
        recentEvents,
        generatedAt: new Date().toISOString(),
      }
    );
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/analytics/export
 * Exports safe, sanitized supply-chain batch or event data in CSV format.
 * Strictly adheres to privacy boundaries and role authentication.
 */
export async function exportAnalyticsData(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const type = (req.query.type as string) || 'batches';

    if (type === 'events') {
      const events = await SupplyChainEvent.find()
        .sort({ occurredAt: -1 })
        .limit(1000)
        .populate('batchId', 'batchCode')
        .populate('organizationId', 'name')
        .lean();

      const headers = [
        'Batch Code',
        'Event Type',
        'Occurred At',
        'Organization',
        'Location',
        'Facility',
        'Temperature',
        'Humidity',
        'Blockchain Status',
        'Payload Hash'
      ];

      const rows = events.map((e: any) => [
        e.batchId?.batchCode ?? 'N/A',
        e.eventType,
        e.occurredAt ? new Date(e.occurredAt).toISOString() : '',
        `"${(e.organizationId?.name ?? 'N/A').replace(/"/g, '""')}"`,
        `"${(e.location ?? '').replace(/"/g, '""')}"`,
        `"${(e.facility ?? '').replace(/"/g, '""')}"`,
        e.temperature ?? '',
        e.humidity ?? '',
        e.blockchainStatus,
        e.payloadHash
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      await AuditLog.create({
        actorId: (req as any).user?.userId,
        action: 'EXPORT_ANALYTICS',
        resourceType: 'EVENT',
        resourceId: 'events_export',
        outcome: 'SUCCESS',
        details: { exportType: 'events', count: rows.length },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      }).catch(() => {});

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="supply_chain_events_${Date.now()}.csv"`
      );
      res.status(200).send(csvContent);
      return;
    }

    // Default: batches export
    const batches = await Batch.find()
      .sort({ createdAt: -1 })
      .limit(1000)
      .populate('productId', 'name category sku')
      .populate('organizationId', 'name')
      .populate('currentCustodianId', 'name')
      .lean();

    const headers = [
      'Batch Code',
      'Product Name',
      'Category',
      'Quantity',
      'Unit',
      'Status',
      'Blockchain Status',
      'Manufacture Date',
      'Expiry Date',
      'Origin Organization',
      'Current Custodian'
    ];

    const rows = batches.map((b: any) => [
      b.batchCode,
      `"${(b.productId?.name ?? '').replace(/"/g, '""')}"`,
      b.productId?.category ?? '',
      b.quantity,
      b.unit,
      b.status,
      b.blockchainStatus,
      b.manufactureDate ? new Date(b.manufactureDate).toISOString().split('T')[0] : '',
      b.expiryDate ? new Date(b.expiryDate).toISOString().split('T')[0] : '',
      `"${(b.organizationId?.name ?? '').replace(/"/g, '""')}"`,
      `"${(b.currentCustodianId?.name ?? '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    await AuditLog.create({
      actorId: (req as any).user?.userId,
      action: 'EXPORT_ANALYTICS',
      resourceType: 'BATCH',
      resourceId: 'batches_export',
      outcome: 'SUCCESS',
      details: { exportType: 'batches', count: rows.length },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    }).catch(() => {});

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="supply_chain_batches_${Date.now()}.csv"`
    );
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
}
