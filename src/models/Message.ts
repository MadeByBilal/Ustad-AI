import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const SENDER_TYPES = ["customer", "worker", "system"] as const;
export type MessageSenderType = (typeof SENDER_TYPES)[number];

/** Reserved sender id for lifecycle/system messages (never a real user). */
export const SYSTEM_SENDER_ID = "system";

const messageSchema = new Schema(
  {
    job_id: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    sender_id: {
      type: Schema.Types.Mixed,
      required: true,
    },
    sender_type: {
      type: String,
      enum: SENDER_TYPES,
      required: true,
    },
    content: { type: String, default: "" },
    media_ids: { type: [String], default: [] },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  },
);

messageSchema.index({ job_id: 1, created_at: 1 });

export type MessageDoc = InferSchemaType<typeof messageSchema>;

export const Message =
  (mongoose.models.Message as mongoose.Model<MessageDoc>) ??
  mongoose.model<MessageDoc>("Message", messageSchema);
