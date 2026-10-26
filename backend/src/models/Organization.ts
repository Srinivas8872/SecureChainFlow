import mongoose, { Document, Schema, Model } from 'mongoose';

export type OrganizationType = 
  | 'SUPPLIER' 
  | 'MANUFACTURER' 
  | 'LOGISTICS' 
  | 'WAREHOUSING' 
  | 'RETAIL' 
  | 'AUDIT' 
  | 'ADMIN';

export type OrganizationStatus = 'VERIFIED' | 'PENDING' | 'REJECTED';

export interface IOrganization extends Document {
  name: string;
  type: OrganizationType;
  status: OrganizationStatus;
  facilities: string[];
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
      index: true
    },
    type: {
      type: String,
      required: [true, 'Organization type is required'],
      enum: {
        values: ['SUPPLIER', 'MANUFACTURER', 'LOGISTICS', 'WAREHOUSING', 'RETAIL', 'AUDIT', 'ADMIN'],
        message: '{VALUE} is not a valid organization type'
      },
      index: true
    },
    status: {
      type: String,
      required: true,
      enum: ['VERIFIED', 'PENDING', 'REJECTED'],
      default: 'VERIFIED',
      index: true
    },
    facilities: {
      type: [String],
      default: []
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    contactPhone: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
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

export const Organization: Model<IOrganization> = 
  mongoose.models.Organization || mongoose.model<IOrganization>('Organization', organizationSchema);
