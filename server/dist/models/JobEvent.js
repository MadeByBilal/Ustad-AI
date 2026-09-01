import mongoose, { Schema } from "mongoose";
export const ACTOR_TYPES = ["customer", "worker", "system"];
const jobEventSchema = new Schema({
    job_id: {
        type: Schema.Types.ObjectId,
        ref: "Job",
        required: true,
    },
    from_state: { type: String, required: true },
    to_state: { type: String, required: true },
    actor_id: { type: String, required: true },
    actor_type: {
        type: String,
        enum: ACTOR_TYPES,
        required: true,
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
}, {
    timestamps: { createdAt: "created_at", updatedAt: false },
});
jobEventSchema.index({ job_id: 1, created_at: 1 });
export const JobEvent = mongoose.models.JobEvent ??
    mongoose.model("JobEvent", jobEventSchema);
//# sourceMappingURL=JobEvent.js.map