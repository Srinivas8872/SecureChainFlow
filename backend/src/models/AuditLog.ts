import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IAuditLog extends Document {
  actorId?: Types.ObjectId;
  actorEmail?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    actorEmail: {
      type: String,
      trim: true
    },
    action: {
      type: String,
      required: true,
      index: true
    },
    resourceType: {
      type: String,
      required: true,
      index: true
    },
    resourceId: {
      type: String,
      index: true
    },
    outcome: {
      type: String,
      required: true,
      enum: ['SUCCESS', 'FAILURE', 'BLOCKED'],
      index: true
    },
    details: {
      type: Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String
    },
    userAgent: {
      type: String
    },
    requestId: {
      type: String,
      index: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: (_doc, ret: any) => {
        ret.id = ret._id?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

export const AuditLog: Model<IAuditLog> = 
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
