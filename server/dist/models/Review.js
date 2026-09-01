import mongoose, { Schema } from "mongoose";
const reviewSchema = new Schema({
    job_id: {
        type: Schema.Types.ObjectId,
        ref: "Job",
        required: true,
        unique: true,
        index: true,
    },
    customer_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    worker_id: {
        type: Schema.Types.ObjectId,
        ref: "Worker",
        required: true,
        index: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    tags: { type: [String], default: [] },
    text: { type: String, default: "" },
}, {
    timestamps: { createdAt: "created_at", updatedAt: false },
});
reviewSchema.index({ worker_id: 1, created_at: -1 });
export const Review = mongoose.models.Review ??
    mongoose.model("Review", reviewSchema);
//# sourceMappingURL=Review.js.map