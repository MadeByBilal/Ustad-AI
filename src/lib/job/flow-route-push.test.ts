import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/models", () => ({
  Job: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
  JobEvent: { create: vi.fn() },
  Message: { create: vi.fn() },
  Worker: { findOne: vi.fn() },
  Offer: { findOne: vi.fn() },
  SYSTEM_SENDER_ID: "system",
}));
vi.mock("@/lib/matching", () => ({ searchEligibleWorkers: vi.fn() }));
vi.mock("./analyze", () => ({ analyzeJobInput: vi.fn() }));
vi.mock("./offers", () => ({
  validateCustomerOffer: vi.fn(),
  validateWorkerCounter: vi.fn(),
}));
vi.mock("./route-precompute", () => ({ computeAndStoreRoute: vi.fn() }));
vi.mock("@/lib/socket", () => ({ getIO: vi.fn() }));

import { Job, JobEvent, Message, Worker } from "@/models";
import { getIO } from "@/lib/socket";
import { computeAndStoreRoute } from "./route-precompute";
import { workerUpdateJobStatus } from "./flow";

const route = {
  polyline: [
    [33, 73],
    [33.6, 73.1],
  ] as [number, number][],
  distanceMeters: 1200,
  durationSeconds: 181,
};

const acceptedJob = {
  _id: "job-1",
  status: "ACCEPTED",
  understanding: { urgency: "normal" },
  location: { coordinates: [73.1, 33.6] },
  matching: { selected_worker_id: "worker-1" },
  completion: {},
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(Job.findOne).mockResolvedValue(acceptedJob as never);
  vi.mocked(Job.findOneAndUpdate).mockResolvedValue({
    ...acceptedJob,
    status: "EN_ROUTE",
  } as never);
  vi.mocked(JobEvent.create).mockResolvedValue({} as never);
  vi.mocked(Message.create).mockResolvedValue({} as never);
  vi.mocked(Worker.findOne).mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({ location: { coordinates: [73, 33] } }),
    }),
  } as never);
  vi.mocked(computeAndStoreRoute).mockResolvedValue(route);
});

describe("workerUpdateJobStatus route delivery", () => {
  it("pushes the precomputed route to connected tracking clients", async () => {
    const emit = vi.fn();
    vi.mocked(getIO).mockReturnValue({
      to: vi.fn(() => ({ emit })),
    } as never);

    await workerUpdateJobStatus("job-1", "worker-1", "EN_ROUTE");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(computeAndStoreRoute).toHaveBeenCalledWith(
      "job-1",
      33,
      73,
      33.6,
      73.1,
    );
    expect(emit).toHaveBeenCalledWith("route-computed", {
      jobId: "job-1",
      ...route,
    });
  });
});
