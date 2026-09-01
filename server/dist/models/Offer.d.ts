import mongoose, { type InferSchemaType } from "mongoose";
export declare const OFFER_TYPES: readonly ["accept", "counter_offer", "decline", "customer_offer"];
export declare const OFFER_STATUSES: readonly ["pending", "accepted", "selected", "declined", "expired"];
declare const offerSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}, {
    [x: string]: NativeDate;
    message: string;
    type: "customer_offer" | "accept" | "counter_offer" | "decline";
    status: "pending" | "accepted" | "selected" | "declined" | "expired";
    job_id: mongoose.Types.ObjectId;
    worker_id: mongoose.Types.ObjectId;
    offered_price: number;
    counter_price?: number | null | undefined;
    expires_at?: NativeDate | null | undefined;
}, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    [x: string]: NativeDate;
    message: string;
    type: "customer_offer" | "accept" | "counter_offer" | "decline";
    status: "pending" | "accepted" | "selected" | "declined" | "expired";
    job_id: mongoose.Types.ObjectId;
    worker_id: mongoose.Types.ObjectId;
    offered_price: number;
    counter_price?: number | null | undefined;
    expires_at?: NativeDate | null | undefined;
}>, {}, mongoose.MergeType<mongoose.DefaultSchemaOptions, {
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}>> & mongoose.FlatRecord<{
    [x: string]: NativeDate;
    message: string;
    type: "customer_offer" | "accept" | "counter_offer" | "decline";
    status: "pending" | "accepted" | "selected" | "declined" | "expired";
    job_id: mongoose.Types.ObjectId;
    worker_id: mongoose.Types.ObjectId;
    offered_price: number;
    counter_price?: number | null | undefined;
    expires_at?: NativeDate | null | undefined;
}> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
export type OfferDoc = InferSchemaType<typeof offerSchema>;
export declare const Offer: mongoose.Model<{
    [x: string]: NativeDate;
    message: string;
    type: "customer_offer" | "accept" | "counter_offer" | "decline";
    status: "pending" | "accepted" | "selected" | "declined" | "expired";
    job_id: mongoose.Types.ObjectId;
    worker_id: mongoose.Types.ObjectId;
    offered_price: number;
    counter_price?: number | null | undefined;
    expires_at?: NativeDate | null | undefined;
}, {}, {}, {}, mongoose.Document<unknown, {}, {
    [x: string]: NativeDate;
    message: string;
    type: "customer_offer" | "accept" | "counter_offer" | "decline";
    status: "pending" | "accepted" | "selected" | "declined" | "expired";
    job_id: mongoose.Types.ObjectId;
    worker_id: mongoose.Types.ObjectId;
    offered_price: number;
    counter_price?: number | null | undefined;
    expires_at?: NativeDate | null | undefined;
}, {}, {}> & {
    [x: string]: NativeDate;
    message: string;
    type: "customer_offer" | "accept" | "counter_offer" | "decline";
    status: "pending" | "accepted" | "selected" | "declined" | "expired";
    job_id: mongoose.Types.ObjectId;
    worker_id: mongoose.Types.ObjectId;
    offered_price: number;
    counter_price?: number | null | undefined;
    expires_at?: NativeDate | null | undefined;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, any>;
export {};
//# sourceMappingURL=Offer.d.ts.map