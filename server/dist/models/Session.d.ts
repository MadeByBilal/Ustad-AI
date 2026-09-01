import mongoose, { type InferSchemaType } from "mongoose";
declare const sessionSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}, {
    [x: string]: NativeDate;
    role: "customer" | "worker" | "admin";
    user_id: mongoose.Types.ObjectId;
    expires_at: NativeDate;
    token: string;
    fingerprint: string;
}, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    [x: string]: NativeDate;
    role: "customer" | "worker" | "admin";
    user_id: mongoose.Types.ObjectId;
    expires_at: NativeDate;
    token: string;
    fingerprint: string;
}>, {}, mongoose.MergeType<mongoose.DefaultSchemaOptions, {
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}>> & mongoose.FlatRecord<{
    [x: string]: NativeDate;
    role: "customer" | "worker" | "admin";
    user_id: mongoose.Types.ObjectId;
    expires_at: NativeDate;
    token: string;
    fingerprint: string;
}> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
export type SessionDoc = InferSchemaType<typeof sessionSchema>;
export declare const Session: mongoose.Model<{
    [x: string]: NativeDate;
    role: "customer" | "worker" | "admin";
    user_id: mongoose.Types.ObjectId;
    expires_at: NativeDate;
    token: string;
    fingerprint: string;
}, {}, {}, {}, mongoose.Document<unknown, {}, {
    [x: string]: NativeDate;
    role: "customer" | "worker" | "admin";
    user_id: mongoose.Types.ObjectId;
    expires_at: NativeDate;
    token: string;
    fingerprint: string;
}, {}, {}> & {
    [x: string]: NativeDate;
    role: "customer" | "worker" | "admin";
    user_id: mongoose.Types.ObjectId;
    expires_at: NativeDate;
    token: string;
    fingerprint: string;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, any>;
export {};
//# sourceMappingURL=Session.d.ts.map