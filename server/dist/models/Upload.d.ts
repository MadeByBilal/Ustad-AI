import mongoose, { type InferSchemaType } from "mongoose";
declare const uploadSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, {
    created_at: NativeDate;
    data: Buffer<ArrayBufferLike>;
    size: number;
    owner_id: mongoose.Types.ObjectId;
    mime: string;
}, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    created_at: NativeDate;
    data: Buffer<ArrayBufferLike>;
    size: number;
    owner_id: mongoose.Types.ObjectId;
    mime: string;
}>, {}, mongoose.DefaultSchemaOptions> & mongoose.FlatRecord<{
    created_at: NativeDate;
    data: Buffer<ArrayBufferLike>;
    size: number;
    owner_id: mongoose.Types.ObjectId;
    mime: string;
}> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
export type UploadDoc = InferSchemaType<typeof uploadSchema>;
export declare const Upload: mongoose.Model<{
    created_at: NativeDate;
    data: Buffer<ArrayBufferLike>;
    size: number;
    owner_id: mongoose.Types.ObjectId;
    mime: string;
}, {}, {}, {}, mongoose.Document<unknown, {}, {
    created_at: NativeDate;
    data: Buffer<ArrayBufferLike>;
    size: number;
    owner_id: mongoose.Types.ObjectId;
    mime: string;
}, {}, {}> & {
    created_at: NativeDate;
    data: Buffer<ArrayBufferLike>;
    size: number;
    owner_id: mongoose.Types.ObjectId;
    mime: string;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, any>;
export {};
//# sourceMappingURL=Upload.d.ts.map