import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initIO } from "./src/lib/socket";
import { registerSocketHandlers } from "./src/lib/socket-handlers";
import { disconnectDB } from "./src/lib/mongodb";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3001", 10);

let shuttingDown = false;

process.on("unhandledRejection", (reason) => {
  console.error("[server] unhandledRejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[server] uncaughtException:", err);
  process.exit(1);
});

process.on("exit", (code) => {
  console.log(`[server] process exited with code ${code}`);
});

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const connections = new Set<import("net").Socket>();

    const server = createServer(async (req, res) => {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    });

    server.on("connection", (conn) => {
      connections.add(conn);
      conn.on("close", () => connections.delete(conn));
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error(
          `[server] port ${port} is already in use. Set PORT env or stop the other process.`
        );
      } else {
        console.error("[server] server error:", err);
      }
      process.exit(1);
    });

    const io = initIO(server);
    registerSocketHandlers(io);

    async function shutdown(signal: string) {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`\n[server] ${signal} received, shutting down...`);

      // Stop accepting new connections
      server.close(() => {
        console.log("[server] server closed.");
      });

      // Destroy all existing connections so server.close() callback fires
      for (const conn of connections) {
        conn.destroy();
      }
      connections.clear();

      // Close Socket.IO
      io.close();

      // Disconnect MongoDB
      await disconnectDB();

      console.log("[server] all clean, exiting.");
      process.exit(0);

      // Force exit after 5s if something stalls
      setTimeout(() => {
        console.error("[server] forced exit after timeout");
        process.exit(1);
      }, 5000);
    }

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    server.listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Socket.io ready on /api/socketio`);
    });
  })
  .catch((err) => {
    console.error("[server] app.prepare() failed:", err);
    process.exit(1);
  });
