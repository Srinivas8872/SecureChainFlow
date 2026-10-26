import { Request, Response, NextFunction } from 'express';
import { Product } from '../../models/Product';
import { AuditLog } from '../../models/AuditLog';
import { AppError } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import { createProductSchema, queryProductsSchema } from './productValidation';

export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
    }

    const validated = createProductSchema.parse(req.body);
    const ownerOrganizationId = req.user.role === 'ADMIN' && validated.ownerOrganizationId
      ? validated.ownerOrganizationId
      : req.user.organizationId;

    const product = await Product.create({
      name: validated.name,
      category: validated.category,
      description: validated.description,
      sku: validated.sku,
      ownerOrganizationId,
      createdBy: req.user.id
    });

    const populated = await Product.findById(product._id).populate('ownerOrganizationId', 'name type');

    await AuditLog.create({
      actorId: req.user.id,
      actorEmail: req.user.email,
      action: 'PRODUCT_CREATED',
      resourceType: 'PRODUCT',
      resourceId: product._id.toString(),
      outcome: 'SUCCESS',
      details: { name: product.name, category: product.category },
      ipAddress: req.ip,
      requestId: req.headers['x-request-id'] as string
    });

    sendSuccess(res, populated?.toJSON(), 201);
  } catch (err) {
    next(err);
  }
}

export async function listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = queryProductsSchema.parse(req.query);
    const filter: any = {};

    if (query.category) {
      filter.category = query.category;
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { category: { $regex: query.search, $options: 'i' } },
        { sku: { $regex: query.search, $options: 'i' } }
      ];
    }

    const page = Math.max(1, query.page);
    const limit = Math.min(100, Math.max(1, query.limit));
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('ownerOrganizationId', 'name type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filter)
    ]);

    sendSuccess(res, products.map(p => p.toJSON()), 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    next(err);
  }
}

export async function getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await Product.findById(req.params.id).populate('ownerOrganizationId', 'name type facilities');
    if (!product) {
      return next(new AppError('Product template not found.', 404, 'NOT_FOUND'));
    }

    sendSuccess(res, product.toJSON());
  } catch (err) {
    next(err);
  }
}
