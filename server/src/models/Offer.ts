import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const OFFER_TYPES = [
  "accept",
  "counter_offer",
  "decline",
  "customer_offer",
  "inspection_offer",
] as const;
export const OFFER_STATUSES = [
  "pending",
  "accepted",
  "selected",
  "declined",
  "expired",
] as const;

const offerSchema = new Schema(
  {
    job_id: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    worker_id: {
      type: Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
      index: true,
    },
    type: { type: String, enum: OFFER_TYPES, required: true },
    offered_price: { type: Number, required: true, min: 0 },
    counter_price: { type: Number, default: null, min: 0 },
    message: { type: String, default: "" },
    status: {
      type: String,
      enum: OFFER_STATUSES,
      default: "pending",
      index: true,
    },
    expires_at: { type: Date },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

offerSchema.index({ job_id: 1, worker_id: 1, type: 1 });
offerSchema.index({ worker_id: 1, status: 1, created_at: -1 });

export type OfferDoc = InferSchemaType<typeof offerSchema>;

export const Offer =
  (mongoose.models.Offer as mongoose.Model<OfferDoc>) ??
  mongoose.model<OfferDoc>("Offer", offerSchema);
