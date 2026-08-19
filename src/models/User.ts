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
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      match: /^03\d{9}$/,
    },
    language: {
      type: String,
      enum: ["ur", "en"],
      default: "ur",
    },
    otp_hash: { type: String, select: false },
    otp_expires_at: { type: Date, select: false },
    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
      },
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

userSchema.index({ phone: 1 }, { unique: true });

export type UserDoc = InferSchemaType<typeof userSchema>;

export const User =
  (mongoose.models.User as mongoose.Model<UserDoc>) ??
  mongoose.model<UserDoc>("User", userSchema);