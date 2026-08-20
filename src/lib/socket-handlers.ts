import type { Server } from "socket.io";
import mongoose from "mongoose";
import { haversineDistanceKm } from "./geo";

const ARRIVAL_THRESHOLD_KM = 0.1; // 100 meters

export function registerSocketHandlers(io: Server): void {
  io.on("connection", (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    socket.on("join-job", (data: { jobId: string; role: string; workerId?: string }) => {
      const room = `job:${data.jobId}`;
      socket.join(room);
      socket.data = { jobId: data.jobId, role: data.role, workerId: data.workerId };
      console.log(`[socket] ${socket.id} joined room ${room} as ${data.role}`);
    });

    socket.on("leave-job", (data: { jobId: string }) => {
      const room = `job:${data.jobId}`;
      socket.leave(room);
      console.log(`[socket] ${socket.id} left room ${room}`);
    });

    socket.on(
      "worker-location",
      async (data: { jobId: string; lat: number; lng: number }) => {
        try {
          const { jobId, lat, lng } = data;

          // Fetch job to get destination
          const Job = mongoose.model("Job");
          const job = await Job.findOne({ _id: jobId }).lean() as Record<string, unknown> | null;
          if (!job) return;

          const location = job.location as Record<string, unknown> | undefined;
          const destCoords = location?.coordinates as number[] | undefined;
          if (!destCoords || destCoords.length !== 2) return;

          const [destLng, destLat] = destCoords;
          const distanceKm = haversineDistanceKm(lat, lng, destLat, destLng);
          const distanceMeters = Math.round(distanceKm * 1000);

          // Estimate ETA assuming 30 km/h average speed in urban areas
          const etaMinutes = Math.max(1, Math.round((distanceKm / 30) * 60));

          // Broadcast location to the job room
          const room = `job:${jobId}`;
          io.to(room).emit("location-update", {
            jobId,
            lat,
            lng,
            distanceKm: Math.round(distanceKm * 100) / 100,
            distanceMeters,
            etaMinutes,
            timestamp: new Date().toISOString(),
          });

          // Auto-arrival detection: if within 100m and job is EN_ROUTE
          if (
            distanceKm <= ARRIVAL_THRESHOLD_KM &&
            job.status === "EN_ROUTE"
          ) {
            const workerId = socket.data?.workerId;
            if (workerId) {
              // Transition job to ARRIVED
              await Job.findOneAndUpdate(
                { _id: jobId, status: "EN_ROUTE" },
                { $set: { status: "ARRIVED" } }
              );

              // Record job event
              const JobEvent = mongoose.model("JobEvent");
              await JobEvent.create({
                job_id: jobId,
                from_state: "EN_ROUTE",
                to_state: "ARRIVED",
                actor_id: workerId,
                actor_type: "system",
                metadata: { reason: "geofence-arrival", distance_meters: distanceMeters },
              });

              // Record system message
              const Message = mongoose.model("Message");
              await Message.create({
                job_id: jobId,
                sender_id: "system",
                sender_type: "system",
                content: "Worker has arrived at the location",
              });

              // Notify the room
              io.to(room).emit("worker-arrived", {
                jobId,
                distanceMeters,
                timestamp: new Date().toISOString(),
              });

              console.log(
                `[socket] auto-arrival triggered for job ${jobId} at ${distanceMeters}m`
              );
            }
          }
        } catch (err) {
          console.error("[socket] worker-location error:", err);
        }
      }
    );

    socket.on("disconnect", () => {
      console.log(`[socket] disconnected: ${socket.id}`);
    });
  });
}
