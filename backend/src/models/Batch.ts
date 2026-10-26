import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type BatchStatus =
  | 'REGISTERED'
  | 'IN_PROCESSING'
  | 'QUALITY_APPROVED'
  | 'IN_TRANSIT'
  | 'STORED'
  | 'AVAILABLE_FOR_SALE'
  | 'DELIVERED'
  | 'RECALLED';

export type BlockchainStatus = 'PENDING' | 'COMMITTED' | 'FAILED' | 'LOCAL_DEMO';

export interface IBatch extends Document {
  batchCode: string;
  productId: Types.ObjectId;
  organizationId: Types.ObjectId;
  currentCustodianId: Types.ObjectId;
  source: string;
  quantity: number;
  unit: string;
  status: BatchStatus;
  manufactureDate: Date;
  expiryDate?: Date;
  verificationToken: string;
  blockchainStatus: BlockchainStatus;
  txId?: string;
  payloadHash?: string;
  metadata?: Record<string, any>;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const batchSchema = new Schema<IBatch>(
  {
    batchCode: {
      type: String,
      required: [true, 'Batch code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      minlength: [3, 'Batch code must be at least 3 characters'],
      maxlength: [50, 'Batch code cannot exceed 50 characters'],
      index: true
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
      index: true
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Originating organization is required'],
      index: true
    },
    currentCustodianId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Current custodian organization is required'],
      index: true
    },
    source: {
      type: String,
      required: [true, 'Source location/origin is required'],
      trim: true,
      maxlength: [200, 'Source cannot exceed 200 characters']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.01, 'Quantity must be greater than zero']
    },
    unit: {
      type: String,
      required: [true, 'Unit of measurement is required'],
      trim: true,
      uppercase: true,
      default: 'UNITS'
    },
    status: {
      type: String,
      required: true,
      enum: [
        'REGISTERED',
        'IN_PROCESSING',
        'QUALITY_APPROVED',
        'IN_TRANSIT',
        'STORED',
        'AVAILABLE_FOR_SALE',
        'DELIVERED',
        'RECALLED'
      ],
      default: 'REGISTERED',
      index: true
    },
    manufactureDate: {
      type: Date,
      required: [true, 'Manufacture date is required'],
      default: Date.now
    },
    expiryDate: {
      type: Date,
      validate: {
        validator: function (this: IBatch, value?: Date) {
          if (!value) return true;
          return value >= this.manufactureDate;
        },
        message: 'Expiry date must be on or after the manufacture date'
      }
    },
    verificationToken: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv4(),
      index: true
    },
    blockchainStatus: {
      type: String,
      enum: ['PENDING', 'COMMITTED', 'FAILED', 'LOCAL_DEMO'],
      default: 'PENDING',
      index: true
    },
    txId: {
      type: String,
      trim: true
    },
    payloadHash: {
      type: String,
      trim: true
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        ret.id = ret._id?.toString();
        ret.productId = ret.productId?.toString();
        ret.organizationId = ret.organizationId?.toString();
        ret.currentCustodianId = ret.currentCustodianId?.toString();
        ret.createdBy = ret.createdBy?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

batchSchema.index({ batchCode: 'text', source: 'text' });

export const Batch: Model<IBatch> = 
  mongoose.models.Batch || mongoose.model<IBatch>('Batch', batchSchema);
