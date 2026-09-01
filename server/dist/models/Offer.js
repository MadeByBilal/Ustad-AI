import mongoose, { Schema } from "mongoose";
export const OFFER_TYPES = [
    "accept",
    "counter_offer",
    "decline",
    "customer_offer",
];
export const OFFER_STATUSES = [
    "pending",
    "accepted",
    "selected",
    "declined",
    "expired",
];
const offerSchema = new Schema({
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
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
});
offerSchema.index({ job_id: 1, worker_id: 1 }, { unique: true });
offerSchema.index({ worker_id: 1, status: 1, created_at: -1 });
export const Offer = mongoose.models.Offer ??
    mongoose.model("Offer", offerSchema);
//# sourceMappingURL=Offer.js.map