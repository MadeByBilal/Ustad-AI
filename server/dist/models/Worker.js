import mongoose, { Schema } from "mongoose";
export const WORKER_CATEGORIES = [
    "plumber",
    "electrician",
    "ac_technician",
    "carpenter",
];
export const VERIFICATION_LEVELS = [
    "identity_reviewed",
    "documents_verified",
];
const workerSchema = new Schema({
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
    location: {
        type: {
            type: String,
            enum: ["Point"],
        },
        coordinates: {
            type: [Number],
        },
    },
    location_updated_at: { type: Date, default: Date.now },
    service_area: {
        type: {
            type: String,
            enum: ["Polygon"],
        },
        coordinates: {
            type: [[[Number]]],
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
    average_rating: { type: Number, min: 0, max: 5, default: 4 },
    repeat_customers: { type: Number, min: 0, default: 0 },
    emergency_capabilities: { type: [String], default: [] },
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
});
workerSchema.index({ location: "2dsphere" });
workerSchema.index({ service_area: "2dsphere" });
workerSchema.index({
    category: 1,
    is_available: 1,
    is_online: 1,
    verified: 1,
    ustad_score: -1,
});
export const Worker = mongoose.models.Worker ??
    mongoose.model("Worker", workerSchema);
//# sourceMappingURL=Worker.js.map