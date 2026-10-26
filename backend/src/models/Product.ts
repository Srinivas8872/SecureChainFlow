import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  category: string;
  description?: string;
  sku?: string;
  ownerOrganizationId: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Product name must be at least 2 characters long'],
      maxlength: [120, 'Product name cannot exceed 120 characters'],
      index: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true
    },
    ownerOrganizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Owner organization is required'],
      index: true
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
        ret.ownerOrganizationId = ret.ownerOrganizationId?.toString();
        ret.createdBy = ret.createdBy?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

productSchema.index({ name: 'text', category: 'text', description: 'text' });

export const Product: Model<IProduct> = 
  mongoose.models.Product || mongoose.model<IProduct>('Product', productSchema);
