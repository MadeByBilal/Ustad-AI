import mongoose, { Schema } from "mongoose";
export const SENDER_TYPES = ["customer", "worker", "system"];
/** Reserved sender id for lifecycle/system messages (never a real user). */
export const SYSTEM_SENDER_ID = "system";
const messageSchema = new Schema({
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
}, {
    timestamps: { createdAt: "created_at", updatedAt: false },
});
messageSchema.index({ job_id: 1, created_at: 1 });
export const Message = mongoose.models.Message ??
    mongoose.model("Message", messageSchema);
//# sourceMappingURL=Message.js.map