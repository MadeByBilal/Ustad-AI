import mongoose, { Schema } from "mongoose";
const uploadSchema = new Schema({
    owner_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    mime: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
    created_at: { type: Date, default: Date.now },
});
export const Upload = mongoose.models.Upload ??
    mongoose.model("Upload", uploadSchema);
//# sourceMappingURL=Upload.js.map