import mongoose, { type InferSchemaType } from "mongoose";
export declare const SENDER_TYPES: readonly ["customer", "worker", "system"];
export type MessageSenderType = (typeof SENDER_TYPES)[number];
/** Reserved sender id for lifecycle/system messages (never a real user). */
export declare const SYSTEM_SENDER_ID = "system";
declare const messageSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: {
        createdAt: string;
        updatedAt: false;
    };
}, {
    [x: string]: NativeDate;
    job_id: mongoose.Types.ObjectId;
    sender_id: any;
    sender_type: "customer" | "worker" | "system";
    content: string;
    media_ids: string[];
    location?: {
        lat?: number | null | undefined;
        lng?: number | null | undefined;
    } | null | undefined;
}, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    [x: string]: NativeDate;
    job_id: mongoose.Types.ObjectId;
    sender_id: any;
    sender_type: "customer" | "worker" | "system";
    content: string;
    media_ids: string[];
    location?: {
        lat?: number | null | undefined;
        lng?: number | null | undefined;
    } | null | undefined;
}>, {}, mongoose.MergeType<mongoose.DefaultSchemaOptions, {
    timestamps: {
        createdAt: string;
        updatedAt: false;
    };
}>> & mongoose.FlatRecord<{
    [x: string]: NativeDate;
    job_id: mongoose.Types.ObjectId;
    sender_id: any;
    sender_type: "customer" | "worker" | "system";
    content: string;
    media_ids: string[];
    location?: {
        lat?: number | null | undefined;
        lng?: number | null | undefined;
    } | null | undefined;
}> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
export type MessageDoc = InferSchemaType<typeof messageSchema>;
export declare const Message: mongoose.Model<{
    [x: string]: NativeDate;
    job_id: mongoose.Types.ObjectId;
    sender_id: any;
    sender_type: "customer" | "worker" | "system";
    content: string;
    media_ids: string[];
    location?: {
        lat?: number | null | undefined;
        lng?: number | null | undefined;
    } | null | undefined;
}, {}, {}, {}, mongoose.Document<unknown, {}, {
    [x: string]: NativeDate;
    job_id: mongoose.Types.ObjectId;
    sender_id: any;
    sender_type: "customer" | "worker" | "system";
    content: string;
    media_ids: string[];
    location?: {
        lat?: number | null | undefined;
        lng?: number | null | undefined;
    } | null | undefined;
}, {}, {}> & {
    [x: string]: NativeDate;
    job_id: mongoose.Types.ObjectId;
    sender_id: any;
    sender_type: "customer" | "worker" | "system";
    content: string;
    media_ids: string[];
    location?: {
        lat?: number | null | undefined;
        lng?: number | null | undefined;
    } | null | undefined;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, any>;
export {};
//# sourceMappingURL=Message.d.ts.map