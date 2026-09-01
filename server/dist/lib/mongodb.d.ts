import mongoose from "mongoose";
interface MongooseCache {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}
declare global {
    var mongooseCache: MongooseCache | undefined;
}
export declare function connectDB(): Promise<typeof mongoose>;
export declare function isDbConnected(): boolean;
export declare function disconnectDB(): Promise<void>;
export {};
//# sourceMappingURL=mongodb.d.ts.map