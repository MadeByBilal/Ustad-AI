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

// Synchronous write so the message is never lost when the process exits
// immediately afterwards (a normal console.error to a pipe can drop the lines
function logFatal(label: string, err: unknown): void {
  const stack = err instanceof Error ? (err.stack ?? err.message) : String(err);
  process.stderr.write(`\n[server] ${label}:\n${stack}\n`);
}

// A stray rejection in a request/socket handler should NOT take down the
// whole dev server. Log it and keep serving instead of crashing silently.
process.on("unhandledRejection", (reason) => {
  logFatal("unhandledRejection", reason);
});

// uncaughtException leaves the process in unknown state, but for a dev server
// the better failure mode is "keep running and log loudly" rather than a
// silent death. We flush the full stack synchronously before deciding.
process.on("uncaughtException", (err) => {
  logFatal("uncaughtException", err);
});

// When run in a foreground terminal/pane, closing or detaching the terminal
// sends SIGHUP, whose default action terminates the process with no output.
// Ignore it so the server survives a disconnected terminal. (Use SIGTERM/
// SIGINT — e.g. Ctrl+C — for a clean shutdown.)
process.on("SIGHUP", () => {
  process.stderr.write(
    "\n[server] received SIGHUP, ignoring (detached terminal)\n",
  );
});

// If stdout/stderr is a pipe to a now-closed terminal, writes throw EPIPE.
// Swallow it so logging after a detach doesn't crash the server.
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
