import { Request, Response, NextFunction } from 'express';
import { Batch } from '../../models/Batch';
import { SupplyChainEvent } from '../../models/SupplyChainEvent';
import { AppError } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import { computeSha256 } from '../../utils/crypto';

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
    const { batchId } = req.body as { batchId?: string };

    if (!batchId) {
      return next(new AppError('batchId is required in request body.', 400, 'BAD_REQUEST'));
    }

    const batch = await Batch.findById(batchId)
      .populate('productId', 'name category')
      .lean();

    if (!batch) {
      return next(new AppError('Batch not found.', 404, 'BATCH_NOT_FOUND'));
    }

    const events = await SupplyChainEvent.find({ batchId }).sort({ occurredAt: 1 }).lean();

    // Recompute integrity mismatches for the AI payload
    const hashMismatches = events.filter(
      (e) =>
        e.payloadHash &&
        e.payloadHash !==
        computeSha256({
          batchId: batchId,
          eventType: e.eventType,
          occurredAt: e.occurredAt?.toISOString?.() ?? e.occurredAt,
          location: e.location,
          temperature: e.temperature,
          humidity: e.humidity,
        })
    ).length;

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
    const [totalBatches, totalEvents, statusCounts, eventTypeCounts, blockchainCounts] =
      await Promise.all([
        Batch.countDocuments(),
        SupplyChainEvent.countDocuments(),
        Batch.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        SupplyChainEvent.aggregate([
          { $group: { _id: '$eventType', count: { $sum: 1 } } },
        ]),
        Batch.aggregate([
          { $group: { _id: '$blockchainStatus', count: { $sum: 1 } } },
        ]),
      ]);

    const recalledBatches = statusCounts.find((s) => s._id === 'RECALLED')?.count ?? 0;
    const committedBatches = blockchainCounts.find((s) => s._id === 'COMMITTED')?.count ?? 0;

    sendSuccess(
      res,
      {
        totalBatches,
        totalEvents,
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
        generatedAt: new Date().toISOString(),
      }
    );
  } catch (error) {
    next(error);
  }
}
