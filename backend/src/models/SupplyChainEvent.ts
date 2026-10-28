import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type EventType =
  | 'REGISTERED'
  | 'PROCESSED'
  | 'QUALITY_CHECKED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'STORED'
  | 'RETAILED'
  | 'RECALLED'
  | 'DELIVERED';

export type BlockchainStatus = 'PENDING' | 'COMMITTED' | 'FAILED' | 'LOCAL_DEMO';

export interface ISupplyChainEvent extends Document {
  batchId: Types.ObjectId;
  eventType: EventType;
  actorId: Types.ObjectId;
  organizationId: Types.ObjectId;
  location?: string;
  facility?: string;
  temperature?: number;
  humidity?: number;
  notes?: string;
  payloadHash: string;
  blockchainStatus: BlockchainStatus;
  txId?: string;
  idempotencyKey?: string;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const supplyChainEventSchema = new Schema<ISupplyChainEvent>(
  {
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'Batch',
      required: [true, 'Batch reference is required'],
      index: true
    },
    eventType: {
      type: String,
      required: [true, 'Event type is required'],
      enum: {
        values: [
          'REGISTERED',
          'PROCESSED',
          'QUALITY_CHECKED',
          'DISPATCHED',
          'IN_TRANSIT',
          'RECEIVED',
          'STORED',
          'RETAILED',
          'RECALLED',
          'DELIVERED'
        ],
        message: '{VALUE} is not a valid supply chain event type'
      },
      index: true
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Actor reference is required'],
      index: true
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization reference is required'],
      index: true
    },
    location: {
      type: String,
      trim: true,
      maxlength: [200, 'Location description cannot exceed 200 characters']
    },
    facility: {
      type: String,
      trim: true,
      maxlength: [100, 'Facility name cannot exceed 100 characters']
    },
    temperature: {
      type: Number
    },
    humidity: {
      type: Number,
      min: 0,
      max: 100
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters']
    },
    payloadHash: {
      type: String,
      required: [true, 'Canonical payload hash is mandatory'],
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
    idempotencyKey: {
      type: String,
      index: true,
      sparse: true
    },
    occurredAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        ret.id = ret._id?.toString();
        ret.batchId = ret.batchId?.toString();
        ret.actorId = ret.actorId?.toString();
        ret.organizationId = ret.organizationId?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound index to guarantee uniqueness of idempotencyKey per batch only when provided
supplyChainEventSchema.index(
  { batchId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);
supplyChainEventSchema.index({ batchId: 1, occurredAt: 1 });

export const SupplyChainEvent: Model<ISupplyChainEvent> =
  mongoose.models.SupplyChainEvent || mongoose.model<ISupplyChainEvent>('SupplyChainEvent', supplyChainEventSchema);
