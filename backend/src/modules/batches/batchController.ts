import { Request, Response, NextFunction } from 'express';
import QRCode from 'qrcode';
import { Batch } from '../../models/Batch';
import { Product } from '../../models/Product';
import { AuditLog } from '../../models/AuditLog';
import { AppError } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import { computeSha256 } from '../../utils/crypto';
import { env } from '../../config/env';
import { createBatchSchema, queryBatchesSchema } from './batchValidation';

export async function createBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
    }

    const validated = createBatchSchema.parse(req.body);

    // Verify product exists
    const product = await Product.findById(validated.productId);
    if (!product) {
      return next(new AppError('Referenced product does not exist.', 404, 'PRODUCT_NOT_FOUND'));
    }

    // Check for duplicate batchCode
    const existing = await Batch.findOne({ batchCode: validated.batchCode });
    if (existing) {
      return next(new AppError(`Batch code '${validated.batchCode}' is already registered.`, 409, 'DUPLICATE_BATCH_CODE'));
    }

    // Compute canonical SHA-256 payload digest for data integrity notarization
    const canonicalPayload = {
      batchCode: validated.batchCode,
      productId: validated.productId,
      organizationId: req.user.organizationId,
      source: validated.source,
      quantity: validated.quantity,
      unit: validated.unit,
      manufactureDate: new Date(validated.manufactureDate).toISOString(),
      expiryDate: validated.expiryDate ? new Date(validated.expiryDate).toISOString() : null
    };

    const payloadHash = computeSha256(canonicalPayload);

    // Determine initial blockchain status
    const initialBlockchainStatus = env.FABRIC_USE_MOCK_GATEWAY ? 'LOCAL_DEMO' : 'PENDING';

    const batch = await Batch.create({
      batchCode: validated.batchCode,
      productId: validated.productId,
      organizationId: req.user.organizationId,
      currentCustodianId: req.user.organizationId,
      source: validated.source,
      quantity: validated.quantity,
      unit: validated.unit,
      status: 'REGISTERED',
      manufactureDate: new Date(validated.manufactureDate),
      expiryDate: validated.expiryDate ? new Date(validated.expiryDate) : undefined,
      blockchainStatus: initialBlockchainStatus,
      payloadHash,
      metadata: validated.metadata || {},
      createdBy: req.user.id
    });

    const populated = await Batch.findById(batch._id)
      .populate('productId', 'name category sku')
      .populate('organizationId', 'name type')
      .populate('currentCustodianId', 'name type');

    await AuditLog.create({
      actorId: req.user.id,
      actorEmail: req.user.email,
      action: 'BATCH_REGISTERED',
      resourceType: 'BATCH',
      resourceId: batch._id.toString(),
      outcome: 'SUCCESS',
      details: {
        batchCode: batch.batchCode,
        payloadHash,
        quantity: batch.quantity,
        unit: batch.unit
      },
      ipAddress: req.ip,
      requestId: req.headers['x-request-id'] as string
    });

    sendSuccess(res, populated?.toJSON(), 201);
  } catch (err) {
    next(err);
  }
}

export async function listBatches(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = queryBatchesSchema.parse(req.query);
    const filter: any = {};

    if (query.status) {
      filter.status = query.status;
    }

    if (query.productId) {
      filter.productId = query.productId;
    }

    if (query.organizationId) {
      filter.$or = [
        { organizationId: query.organizationId },
        { currentCustodianId: query.organizationId }
      ];
    }

    if (query.search) {
      filter.$or = [
        { batchCode: { $regex: query.search, $options: 'i' } },
        { source: { $regex: query.search, $options: 'i' } }
      ];
    }

    const page = Math.max(1, query.page);
    const limit = Math.min(100, Math.max(1, query.limit));
    const skip = (page - 1) * limit;

    const [batches, total] = await Promise.all([
      Batch.find(filter)
        .populate('productId', 'name category sku')
        .populate('organizationId', 'name type')
        .populate('currentCustodianId', 'name type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Batch.countDocuments(filter)
    ]);

    sendSuccess(res, batches.map(b => b.toJSON()), 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    next(err);
  }
}

export async function getBatchById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate('productId', 'name category sku description')
      .populate('organizationId', 'name type facilities contactEmail')
      .populate('currentCustodianId', 'name type facilities contactEmail');

    if (!batch) {
      return next(new AppError('Batch record not found.', 404, 'NOT_FOUND'));
    }

    // Generate QR verification data URL for client preview
    const verificationUrl = `${env.FRONTEND_ORIGIN}/qr/${batch.verificationToken}`;
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 256,
      color: {
        dark: '#0284c7',
        light: '#ffffff'
      }
    });

    const responseData = {
      ...batch.toJSON(),
      verificationUrl,
      qrDataUrl
    };

    sendSuccess(res, responseData);
  } catch (err) {
    next(err);
  }
}
