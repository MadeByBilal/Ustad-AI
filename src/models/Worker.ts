import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const WORKER_CATEGORIES = [
  "plumber",
  "electrician",
  "ac_technician",
  "carpenter",
] as const;
export type WorkerCategory = (typeof WORKER_CATEGORIES)[number];

export const VERIFICATION_LEVELS = [
  "identity_reviewed",
  "documents_verified",
] as const;
export type VerificationLevel = (typeof VERIFICATION_LEVELS)[number];

const workerSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: WORKER_CATEGORIES,
      required: true,
    },
    skills: { type: [String], default: [] },
    is_online: { type: Boolean, default: false },
    is_available: { type: Boolean, default: true },
    emergency_available: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    verification_level: {
      type: String,
      enum: VERIFICATION_LEVELS,
      default: "identity_reviewed",
    },
    suspended: { type: Boolean, default: false },
    // Optional at sign-up: a self-registered technician completes their
    // geo profile later (voice matching does not depend on it).
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: undefined,
      },
    },
    location_updated_at: { type: Date, default: Date.now },
    service_area: {
      type: {
        type: String,
        enum: ["Polygon"],
        default: "Polygon",
      },
      coordinates: {
        type: [[[Number]]],
        default: undefined,
      },
    },
    active_job_id: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      default: null,
    },
    ustad_score: { type: Number, min: 0, max: 100, default: 0 },
    completed_jobs: { type: Number, min: 0, default: 0 },
    confirmed_jobs: { type: Number, min: 0, default: 0 },
    response_rate: { type: Number, min: 0, max: 100, default: 100 },
    cancellation_rate: { type: Number, min: 0, max: 100, default: 0 },
    average_rating: { type: Number, min: 0, max: 5, default: 0 },
    repeat_customers: { type: Number, min: 0, default: 0 },
    emergency_capabilities: { type: [String], default: [] },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

workerSchema.index({ location: "2dsphere" });
workerSchema.index({ service_area: "2dsphere" });
workerSchema.index({
  category: 1,
  is_available: 1,
  is_online: 1,
  verified: 1,
  ustad_score: -1,
});

export type WorkerDoc = InferSchemaType<typeof workerSchema>;

export const Worker =
  (mongoose.models.Worker as mongoose.Model<WorkerDoc>) ??
  mongoose.model<WorkerDoc>("Worker", workerSchema);
