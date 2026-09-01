import mongoose from "mongoose";
const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb+srv://stackonofficial_db_user:5G1ExjXipDyG4Xma@ustadai.cq2zfu2.mongodb.net/ustad_ai";
const cached = global.mongooseCache ?? {
    conn: null,
    promise: null,
};
if (!global.mongooseCache) {
    global.mongooseCache = cached;
}
export async function connectDB() {
    if (cached.conn) {
        return cached.conn;
    }
    if (!cached.promise) {
        mongoose.set("strictQuery", true);
        cached.promise = mongoose.connect(MONGODB_URI).then((m) => m);
    }
    cached.conn = await cached.promise;
    return cached.conn;
}
export function isDbConnected() {
    return mongoose.connection.readyState === 1;
}
export async function disconnectDB() {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    cached.conn = null;
    cached.promise = null;
}
//# sourceMappingURL=mongodb.js.map