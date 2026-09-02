import mongoose, { Schema } from "mongoose";
export const JOB_STATUSES = [
    "DRAFT",
    "ANALYZING",
    "WAITING_FOR_CUSTOMER",
    "READY_TO_MATCH",
    "BROADCASTING",
    "WORKER_RESPONSES",
    "CUSTOMER_SELECTING",
    "ACCEPTED",
    "EN_ROUTE",
    "ARRIVED",
    "IN_PROGRESS",
    "AWAITING_CUSTOMER_CONFIRMATION",
    "COMPLETED",
    "CANCELLED",
    "EXPIRED",
    "DISPUTED",
];
export const INPUT_TYPES = ["voice", "text", "photo"];
export const URGENCY_LEVELS = [
    "normal",
    "potentially_urgent",
    "emergency",
];
export const PRICING_STATUSES = ["pending", "agreed", "disputed"];
const jobSchema = new Schema({
    customer_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    status: {
        type: String,
        enum: JOB_STATUSES,
        default: "DRAFT",
    },
    input: {
        type: {
            type: String,
            enum: INPUT_TYPES,
            required: true,
        },
        original_text: { type: String, default: "" },
        transcript: { type: String, default: "" },
        photo_ids: { type: [String], default: [] },
    },
    understanding: {
        category: { type: String, default: "" },
        subcategory: { type: String, default: "" },
        description: { type: String, default: "" },
        required_skills: { type: [String], default: [] },
        urgency: {
            type: String,
            enum: URGENCY_LEVELS,
            default: "normal",
        },
        safety_flags: { type: [String], default: [] },
        confidence: { type: Number, min: 0, max: 1, default: 0 },
        clarification_required: { type: Boolean, default: false },
        complexity: {
            type: String,
            enum: ["low", "medium", "high"],
            default: "medium",
        },
    },
    location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point",
        },
        coordinates: { type: [Number], default: undefined },
        address_label: { type: String, default: "" },
    },
    pricing: {
        estimate_min: { type: Number, default: 0 },
        estimate_max: { type: Number, default: 0 },
        inspection_fee: { type: Number, default: 0 },
        customer_offer: { type: Number, default: 0 },
        worker_counter_offer: { type: Number, default: null },
        final_price: { type: Number, default: null },
        currency: { type: String, default: "PKR" },
        status: {
            type: String,
            enum: PRICING_STATUSES,
            default: "pending",
        },
    },
    matching: {
        search_radius_km: { type: Number, default: 5 },
        broadcast_round: { type: Number, default: 0 },
        broadcast_id: { type: String, default: null },
        eligible_workers_count: { type: Number, default: 0 },
        acceptance_deadline: { type: Date },
        selection_deadline: { type: Date },
        accepted_worker_ids: {
            type: [Schema.Types.ObjectId],
            default: [],
        },
        selected_worker_id: {
            type: Schema.Types.ObjectId,
            ref: "Worker",
            default: null,
            index: true,
        },
    },
    completion: {
        before_photo_id: { type: String, default: null },
        after_photo_id: { type: String, default: null },
        note: { type: String, default: null },
        ai_work_confirmation: { type: String, default: null },
        customer_confirmed: { type: Boolean, default: false },
    },
    tracking: {
        customer_location: {
            type: {
                type: String,
                enum: ["Point"],
            },
            coordinates: { type: [Number] },
        },
        customer_location_updated_at: { type: Date, default: null },
    },
    route: {
        polyline: { type: [[Number]], default: null },
        distance_meters: { type: Number, default: null },
        duration_seconds: { type: Number, default: null },
        computed_at: { type: Date, default: null },
    },
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
});
jobSchema.index({ customer_id: 1, status: 1, created_at: -1 });
jobSchema.index({ status: 1, created_at: -1 });
export const Job = mongoose.models.Job ??
    mongoose.model("Job", jobSchema);
//# sourceMappingURL=Job.js.map