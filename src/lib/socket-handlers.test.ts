import mongoose from "mongoose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerSocketHandlers } from "./socket-handlers";

const route = {
  polyline: [
    [33, 73],
    [33.6, 73.1],
  ],
  distance_meters: 1200,
  duration_seconds: 181,
};

type TestSocket = {
  id: string;
  data: Record<string, unknown>;
  join: ReturnType<typeof vi.fn>;
  leave: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
};

function createSocket(): TestSocket {
  return {
    id: "socket-1",
    data: {},
    join: vi.fn(),
    leave: vi.fn(),
    emit: vi.fn(),
    on: vi.fn(),
  };
}

function createIo() {
  return {
    on: vi.fn(),
    to: vi.fn(() => ({ emit: vi.fn() })),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("registerSocketHandlers", () => {
  it("sends an existing route to a client as soon as it joins a job", async () => {
    const io = createIo();
    const socket = createSocket();
    const jobModel = {
      findOne: vi.fn(() => ({
        select: vi.fn(() => ({
          lean: vi.fn().mockResolvedValue({ route }),
        })),
      })),
    };
    vi.spyOn(mongoose, "model").mockReturnValue(jobModel as never);

    registerSocketHandlers(io as never);
    const connectionHandler = io.on.mock.calls[0][1] as (
      client: TestSocket,
    ) => void;
    connectionHandler(socket);

    const joinCall = socket.on.mock.calls.find(
      (call: unknown[]) => call[0] === "join-job",
    );
    const joinHandler = joinCall?.[1] as (data: {
      jobId: string;
      role: string;
    }) => Promise<void>;

    await joinHandler({ jobId: "job-1", role: "customer" });

    expect(socket.join).toHaveBeenCalledWith("job:job-1");
    expect(socket.emit).toHaveBeenCalledWith("route-computed", {
      jobId: "job-1",
      polyline: route.polyline,
      distanceMeters: 1200,
      durationSeconds: 181,
    });
  });
});
