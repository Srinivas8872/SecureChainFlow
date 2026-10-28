import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';

export type UserRole =
  | 'SUPPLIER'
  | 'PROCESSOR'
  | 'TRANSPORTER'
  | 'WAREHOUSE'
  | 'RETAILER'
  | 'REGULATOR'
  | 'ADMIN'
  | 'CUSTOMER';

export type UserStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  organizationId: Types.ObjectId;
  status: UserStatus;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'User full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long']
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: {
        values: [
          'SUPPLIER',
          'PROCESSOR',
          'TRANSPORTER',
          'WAREHOUSE',
          'RETAILER',
          'REGULATOR',
          'ADMIN',
          'CUSTOMER'
        ],
        message: '{VALUE} is not a valid user role'
      },
      default: 'SUPPLIER',
      index: true
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'User must belong to an organization'],
      index: true
    },
    status: {
      type: String,
      required: true,
      enum: ['ACTIVE', 'PENDING', 'SUSPENDED'],
      default: 'ACTIVE',
      index: true
    },
    lastLoginAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        ret.id = ret._id?.toString();
        if (ret.organizationId && typeof ret.organizationId === 'object' && ret.organizationId.name) {
          ret.organizationName = ret.organizationId.name;
          ret.organizationId = ret.organizationId._id ? ret.organizationId._id.toString() : ret.organizationId.toString();
        } else if (ret.organizationId) {
          ret.organizationId = ret.organizationId.toString();
        }
        delete ret.passwordHash;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Pre-save hook to hash password if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  try {
    const salt = await bcrypt.genSalt(env.BCRYPT_ROUNDS);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (err: any) {
    next(err);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

export const User: Model<IUser> = 
  mongoose.models.User || mongoose.model<IUser>('User', userSchema);
