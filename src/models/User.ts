import mongoose from "mongoose";

export const ROLE_SLUGS = ["admin", "editor", "viewer"] as const;
export type RoleSlug = (typeof ROLE_SLUGS)[number];

export interface UserDoc extends mongoose.Document {
  email?: string;
  phone?: string;
  name?: string;
  image?: string;
  password?: string;
  role: RoleSlug;
  isActive: boolean;
  emailVerified?: Date;
  verificationToken?: string;
  verificationTokenExpires?: Date;
  lastLogin?: Date;
  /** Nhân vật (linh vật) người dùng chọn, slug trong lib/mascots hoặc "none". */
  mascot?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<UserDoc>(
  {
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: { type: String, unique: true, sparse: true, trim: true },
    name: { type: String },
    image: { type: String },
    password: { type: String, select: false },
    role: { type: String, enum: ROLE_SLUGS, required: true, default: "viewer", index: true },
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Date },
    verificationToken: { type: String, index: true },
    verificationTokenExpires: { type: Date },
    lastLogin: { type: Date },
    mascot: { type: String },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model<UserDoc>("User", userSchema);
