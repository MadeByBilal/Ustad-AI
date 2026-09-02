import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const USER_ROLES = ["customer", "worker", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

const userSchema = new Schema(
  {
    role: {
      type: String,
      enum: USER_ROLES,
      required: true,
      default: "customer",
    },
    name: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password_hash: { type: String, required: true, select: false },
    phone: {
      type: String,
      match: /^03\d{9}$/,
    },
    language: {
      type: String,
      enum: ["ur", "en"],
      default: "ur",
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
      },
    },
    stats: {
      average_rating: { type: Number, default: 5.0 },
      reviews_count: { type: Number, default: 0 },
      trust_score: { type: Number, default: 100 },
      cancellations: { type: Number, default: 0 },
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

userSchema.index({ email: 1 }, { unique: true });
// Sparse: legacy phone-OTP accounts keep their number; email-auth users
// simply have no phone, and many such users must be able to coexist.
userSchema.index({ phone: 1 }, { unique: true, sparse: true });

export type UserDoc = InferSchemaType<typeof userSchema>;

export const User =
  (mongoose.models.User as mongoose.Model<UserDoc>) ??
  mongoose.model<UserDoc>("User", userSchema);
