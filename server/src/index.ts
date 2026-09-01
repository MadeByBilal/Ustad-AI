import express from "express";
import { createServer } from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./lib/mongodb.js";
import { initIO } from "./lib/socket.js";
import { registerSocketHandlers } from "./lib/socket-handlers.js";
import { authRoutes } from "./routes/auth/index.js";
import { jobRoutes } from "./routes/jobs/index.js";
import { workerRoutes } from "./routes/workers/index.js";
import { requestRoutes } from "./routes/requests/index.js";
import { aiRoutes } from "./routes/ai/index.js";
import { photoRoutes } from "./routes/photos/index.js";
import { routeRoutes } from "./routes/routes/index.js";
import { healthRoutes } from "./routes/health.js";

const PORT = Number(process.env.PORT ?? 5000);
const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:3001";

const app = express();
const server = createServer(app);

// Middleware
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));

// Connect to MongoDB
await connectDB();

// Initialize Socket.io
const io = initIO(server);
registerSocketHandlers(io);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/workers", workerRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/photos", photoRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api", healthRoutes);

// Health check
app.get("/api/health", async (_req, res) => {
  const { connectDB: connect, isDbConnected } = await import("./lib/mongodb.js");
  await connect();
  res.json({ ok: true, db: isDbConnected() ? "connected" : "connecting" });
});

server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[server] CORS origin: ${CLIENT_URL}`);
});

export { app, server };
