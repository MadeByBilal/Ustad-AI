import mongoose, { type InferSchemaType } from "mongoose";
declare const reviewSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: {
        createdAt: string;
        updatedAt: false;
    };
}, {
    [x: string]: NativeDate;
    text: string;
    job_id: mongoose.Types.ObjectId;
    customer_id: mongoose.Types.ObjectId;
    worker_id: mongoose.Types.ObjectId;
    rating: number;
    tags: string[];
}, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    [x: string]: NativeDate;
    text: string;
    job_id: mongoose.Types.ObjectId;
    customer_id: mongoose.Types.ObjectId;
    worker_id: mongoose.Types.ObjectId;
    rating: number;
    tags: string[];
}>, {}, mongoose.MergeType<mongoose.DefaultSchemaOptions, {
    timestamps: {
        createdAt: string;
        updatedAt: false;
    };
}>> & mongoose.FlatRecord<{
    [x: string]: NativeDate;
    text: string;
    job_id: mongoose.Types.ObjectId;
    customer_id: mongoose.Types.ObjectId;
    worker_id: mongoose.Types.ObjectId;
    rating: number;
    tags: string[];
}> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
export type ReviewDoc = InferSchemaType<typeof reviewSchema>;
export declare const Review: mongoose.Model<{
    [x: string]: NativeDate;
    text: string;
    job_id: mongoose.Types.ObjectId;
    customer_id: mongoose.Types.ObjectId;
    worker_id: mongoose.Types.ObjectId;
    rating: number;
    tags: string[];
}, {}, {}, {}, mongoose.Document<unknown, {}, {
    [x: string]: NativeDate;
    text: string;
    job_id: mongoose.Types.ObjectId;
    customer_id: mongoose.Types.ObjectId;
    worker_id: mongoose.Types.ObjectId;
    rating: number;
    tags: string[];
}, {}, {}> & {
    [x: string]: NativeDate;
    text: string;
    job_id: mongoose.Types.ObjectId;
    customer_id: mongoose.Types.ObjectId;
    worker_id: mongoose.Types.ObjectId;
    rating: number;
    tags: string[];
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, any>;
export {};
//# sourceMappingURL=Review.d.ts.map