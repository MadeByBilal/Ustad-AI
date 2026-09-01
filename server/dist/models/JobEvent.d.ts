import mongoose, { type InferSchemaType } from "mongoose";
export declare const ACTOR_TYPES: readonly ["customer", "worker", "system"];
declare const jobEventSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: {
        createdAt: string;
        updatedAt: false;
    };
}, {
    [x: string]: NativeDate;
    job_id: mongoose.Types.ObjectId;
    from_state: string;
    to_state: string;
    actor_id: string;
    actor_type: "system" | "customer" | "worker";
    metadata: any;
}, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    [x: string]: NativeDate;
    job_id: mongoose.Types.ObjectId;
    from_state: string;
    to_state: string;
    actor_id: string;
    actor_type: "system" | "customer" | "worker";
    metadata: any;
}>, {}, mongoose.MergeType<mongoose.DefaultSchemaOptions, {
    timestamps: {
        createdAt: string;
        updatedAt: false;
    };
}>> & mongoose.FlatRecord<{
    [x: string]: NativeDate;
    job_id: mongoose.Types.ObjectId;
    from_state: string;
    to_state: string;
    actor_id: string;
    actor_type: "system" | "customer" | "worker";
    metadata: any;
}> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
export type JobEventDoc = InferSchemaType<typeof jobEventSchema>;
export declare const JobEvent: mongoose.Model<{
    [x: string]: NativeDate;
    job_id: mongoose.Types.ObjectId;
    from_state: string;
    to_state: string;
    actor_id: string;
    actor_type: "system" | "customer" | "worker";
    metadata: any;
}, {}, {}, {}, mongoose.Document<unknown, {}, {
    [x: string]: NativeDate;
    job_id: mongoose.Types.ObjectId;
    from_state: string;
    to_state: string;
    actor_id: string;
    actor_type: "system" | "customer" | "worker";
    metadata: any;
}, {}, {}> & {
    [x: string]: NativeDate;
    job_id: mongoose.Types.ObjectId;
    from_state: string;
    to_state: string;
    actor_id: string;
    actor_type: "system" | "customer" | "worker";
    metadata: any;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, any>;
export {};
//# sourceMappingURL=JobEvent.d.ts.map