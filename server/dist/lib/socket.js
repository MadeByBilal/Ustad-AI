import { Server as SocketIOServer } from "socket.io";
let io = null;
export function getIO() {
    return io;
}
function isAllowedOrigin(req) {
    const allowed = process.env.CLIENT_URL ?? "http://localhost:3001";
    const origin = req.headers.origin;
    if (!origin)
        return false;
    try {
        return new URL(origin).origin === new URL(allowed).origin;
    }
    catch {
        return false;
    }
}
export function initIO(server) {
    if (io)
        return io;
    io = new SocketIOServer(server, {
        path: "/api/socketio",
        cors: {
            origin: process.env.CLIENT_URL ?? "http://localhost:3001",
            credentials: true,
            methods: ["GET", "POST"],
        },
        allowRequest: (req, callback) => {
            if (!isAllowedOrigin(req)) {
                callback(null, false);
                return;
            }
            callback(null, true);
        },
        transports: ["websocket", "polling"],
    });
    return io;
}
export function setIO(instance) {
    io = instance;
}
//# sourceMappingURL=socket.js.map