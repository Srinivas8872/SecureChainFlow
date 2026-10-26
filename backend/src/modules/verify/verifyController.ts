import { Request, Response, NextFunction } from 'express';
import { Batch } from '../../models/Batch';
import { SupplyChainEvent } from '../../models/SupplyChainEvent';
import { Product } from '../../models/Product';
import { AppError } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import { computeSha256 } from '../../utils/crypto';

/**
 * Public QR Verification endpoint.
 * No authentication required — safe for consumer-facing scanning.
 * Returns the full public genealogy of a batch keyed by its verificationToken.
 *
 * GET /api/v1/verify/:token
 */
export async function verifyBatchByToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { token } = req.params;

    if (!token || token.trim().length === 0) {
      return next(new AppError('Verification token is required.', 400, 'BAD_REQUEST'));
    }

    // Fetch batch with populated references
    const batch = await Batch.findOne({ verificationToken: token.trim() })
      .populate('productId', 'name category description sku')
      .populate('organizationId', 'name')
      .populate('currentCustodianId', 'name')
      .populate('createdBy', 'name')
      .lean();

    if (!batch) {
      return next(
        new AppError(
          'No batch found for the provided verification token. The QR code may be invalid or tampered.',
          404,
          'BATCH_NOT_FOUND'
        )
      );
    }

    // Fetch the ordered event chain for this batch
    const events = await SupplyChainEvent.find({ batchId: batch._id })
      .sort({ occurredAt: 1 })
      .populate('actorId', 'name role')
      .populate('organizationId', 'name')
      .lean();

    // Compute on-the-fly ledger confirmation status
    const verifiedPayloadHashes = events
      .filter((e) => e.payloadHash)
      .map((e) => ({
        eventType: e.eventType,
        occurredAt: e.occurredAt,
        payloadHash: e.payloadHash,
        recomputedHash: computeSha256({
          batchId: batch._id.toString(),
          eventType: e.eventType,
          occurredAt: e.occurredAt?.toISOString?.() ?? e.occurredAt,
          location: e.location,
          temperature: e.temperature,
          humidity: e.humidity,
        }),
        blockchainStatus: e.blockchainStatus,
        txId: e.txId ?? null,
      }));

    const integrityScore =
      verifiedPayloadHashes.length === 0
        ? 100
        : Math.round(
            (verifiedPayloadHashes.filter((h) => h.payloadHash === h.recomputedHash).length /
              verifiedPayloadHashes.length) *
              100
          );

    // Build clean public genealogy response — omit internal IDs
    const product = batch.productId as any;
    const org = batch.organizationId as any;
    const custodian = batch.currentCustodianId as any;

    const publicGenealogy = {
      verificationToken: batch.verificationToken,
      batchCode: batch.batchCode,
      status: batch.status,
      blockchainStatus: batch.blockchainStatus,
      txId: batch.txId ?? null,
      payloadHash: batch.payloadHash ?? null,
      source: batch.source,
      quantity: batch.quantity,
      unit: batch.unit,
      manufactureDate: batch.manufactureDate,
      expiryDate: batch.expiryDate ?? null,
      product: product
        ? {
            name: product.name,
            category: product.category,
            description: product.description ?? null,
            sku: product.sku ?? null,
          }
        : null,
      originOrganization: org ? { name: org.name } : null,
      currentCustodian: custodian ? { name: custodian.name } : null,
      eventChain: events.map((e) => {
        const actor = e.actorId as any;
        const eventOrg = e.organizationId as any;
        return {
          eventType: e.eventType,
          occurredAt: e.occurredAt,
          location: e.location ?? null,
          facility: e.facility ?? null,
          temperature: e.temperature ?? null,
          humidity: e.humidity ?? null,
          notes: e.notes ?? null,
          payloadHash: e.payloadHash,
          blockchainStatus: e.blockchainStatus,
          txId: e.txId ?? null,
          recordedBy: actor ? { name: actor.name, role: actor.role } : null,
          organization: eventOrg ? { name: eventOrg.name } : null,
        };
      }),
      integrity: {
        score: integrityScore,
        verified: integrityScore === 100,
        totalEvents: events.length,
        hashMatches: verifiedPayloadHashes.filter((h) => h.payloadHash === h.recomputedHash)
          .length,
        hashMismatches: verifiedPayloadHashes.filter((h) => h.payloadHash !== h.recomputedHash)
          .length,
      },
      verifiedAt: new Date().toISOString(),
    };

    sendSuccess(res, publicGenealogy);
  } catch (error) {
    next(error);
  }
}
