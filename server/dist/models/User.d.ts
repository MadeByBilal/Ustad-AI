import mongoose, { type InferSchemaType } from "mongoose";
export declare const USER_ROLES: readonly ["customer", "worker", "admin"];
export type UserRole = (typeof USER_ROLES)[number];
declare const userSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}, {
    [x: string]: NativeDate;
    role: "customer" | "worker" | "admin";
    email: string;
    password_hash: string;
    language: "ur" | "en";
    name?: string | null | undefined;
    phone?: string | null | undefined;
    location?: {
        coordinates: number[];
        type?: "Point" | null | undefined;
    } | null | undefined;
}, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    [x: string]: NativeDate;
    role: "customer" | "worker" | "admin";
    email: string;
    password_hash: string;
    language: "ur" | "en";
    name?: string | null | undefined;
    phone?: string | null | undefined;
    location?: {
        coordinates: number[];
        type?: "Point" | null | undefined;
    } | null | undefined;
}>, {}, mongoose.MergeType<mongoose.DefaultSchemaOptions, {
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
}>> & mongoose.FlatRecord<{
    [x: string]: NativeDate;
    role: "customer" | "worker" | "admin";
    email: string;
    password_hash: string;
    language: "ur" | "en";
    name?: string | null | undefined;
    phone?: string | null | undefined;
    location?: {
        coordinates: number[];
        type?: "Point" | null | undefined;
    } | null | undefined;
}> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
export type UserDoc = InferSchemaType<typeof userSchema>;
export declare const User: mongoose.Model<{
    [x: string]: NativeDate;
    role: "customer" | "worker" | "admin";
    email: string;
    password_hash: string;
    language: "ur" | "en";
    name?: string | null | undefined;
    phone?: string | null | undefined;
    location?: {
        coordinates: number[];
        type?: "Point" | null | undefined;
    } | null | undefined;
}, {}, {}, {}, mongoose.Document<unknown, {}, {
    [x: string]: NativeDate;
    role: "customer" | "worker" | "admin";
    email: string;
    password_hash: string;
    language: "ur" | "en";
    name?: string | null | undefined;
    phone?: string | null | undefined;
    location?: {
        coordinates: number[];
        type?: "Point" | null | undefined;
    } | null | undefined;
}, {}, {}> & {
    [x: string]: NativeDate;
    role: "customer" | "worker" | "admin";
    email: string;
    password_hash: string;
    language: "ur" | "en";
    name?: string | null | undefined;
    phone?: string | null | undefined;
    location?: {
        coordinates: number[];
        type?: "Point" | null | undefined;
    } | null | undefined;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, any>;
export {};
//# sourceMappingURL=User.d.ts.map