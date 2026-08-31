import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initIO } from "./lib/socket";
import { registerSocketHandlers } from "./lib/socket-handlers";
import { disconnectDB } from "./lib/mongodb";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3001", 10);

let shuttingDown = false;

function logFatal(label: string, err: unknown): void {
  const stack = err instanceof Error ? (err.stack ?? err.message) : String(err);
  process.stderr.write(`\n[server] ${label}:\n${stack}\n`);
}

process.on("unhandledRejection", (reason) => {
  logFatal("unhandledRejection", reason);
});

process.on("uncaughtException", (err) => {
  logFatal("uncaughtException", err);
});

process.on("SIGHUP", () => {
  process.stderr.write(
    "\n[server] received SIGHUP, ignoring (detached terminal)\n",
  );
});

for (const stream of [process.stdout, process.stderr]) {
  stream.on("error", (err: NodeJS.ErrnoException) => {
    if (err?.code !== "EPIPE") logFatal("stream error", err);
  });
}

process.on("exit", (code) => {
  process.stderr.write(`\n[server] process exited with code ${code}\n`);
});

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const connections = new Set<import("net").Socket>();

    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url!, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        logFatal("request handler error", err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end("Internal Server Error");
        }
      }
    });

    server.on("connection", (conn) => {
      connections.add(conn);
      conn.on("close", () => connections.delete(conn));
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error(
          `[server] port ${port} is already in use. Set PORT env or stop the other process.`,
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

      server.close(() => {
        console.log("[server] server closed.");
      });

      for (const conn of Array.from(connections)) {
        conn.destroy();
      }
      connections.clear();

      io.close();

      await disconnectDB();

      console.log("[server] all clean, exiting.");
      process.exit(0);

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
