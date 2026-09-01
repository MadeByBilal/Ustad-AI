import { Server as SocketIOServer } from "socket.io";
let io = null;
export function getIO() {
    return io;
}
export function initIO(server) {
    if (io)
        return io;
    io = new SocketIOServer(server, {
        path: "/api/socketio",
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
        transports: ["websocket", "polling"],
    });
    return io;
}
export function setIO(instance) {
    io = instance;
}
//# sourceMappingURL=socket.js.map