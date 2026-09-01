import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
export declare function getIO(): SocketIOServer | null;
export declare function initIO(server: HTTPServer): SocketIOServer;
export declare function setIO(instance: SocketIOServer): void;
//# sourceMappingURL=socket.d.ts.map