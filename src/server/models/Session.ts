import mongoose, { Schema, type InferSchemaType } from "mongoose";

const sessionSchema = new Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["customer", "worker", "admin"],
      required: true,
    },
    fingerprint: { type: String, default: "" },
    expires_at: { type: Date, required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

sessionSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export type SessionDoc = InferSchemaType<typeof sessionSchema>;

export const Session =
  (mongoose.models.Session as mongoose.Model<SessionDoc>) ??
  mongoose.model<SessionDoc>("Session", sessionSchema);
