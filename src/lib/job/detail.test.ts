import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/mongodb", () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/matching", () => ({ searchEligibleWorkers: vi.fn() }));
vi.mock("@/models", () => {
  return {
    Job: { findOne: vi.fn() },
    Worker: { find: vi.fn() },
    Offer: { find: vi.fn() },
  };
});

import { Job, Offer, Worker } from "@/models";
import { FlowError } from "@/lib/job/flow";
import { getJobDetail } from "./detail";

const NOW = new Date("2026-01-01T10:00:00.000Z");

function jobDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    _id: "job1",
    customer_id: "cust1",
    status: "BROADCASTING",
    understanding: {
      category: "electrician",
      description: "Wiring kharab",
      required_skills: ["wiring"],
      urgency: "normal",
    },
    pricing: {
      estimate_min: 1000,
      estimate_max: 2500,
      customer_offer: 1500,
      worker_counter_offer: null,
      final_price: null,
      currency: "PKR",
      status: "pending",
    },
    location: { type: "Point", coordinates: [67.0011, 24.8607], address_label: "Karachi" },
    matching: {
      search_radius_km: 5,
      eligible_workers_count: 2,
      acceptance_deadline: new Date("2026-01-01T10:10:00.000Z"),
      selection_deadline: null,
      accepted_worker_ids: ["w1", "w2"],
      selected_worker_id: null,
    },
    created_at: NOW,
    ...overrides,
  };
}

function workerDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    _id: "w1",
    name: "Imran",
    category: "electrician",
    skills: ["wiring", "fault finding"],
    ustad_score: 80,
    completed_jobs: 50,
    average_rating: 4.5,
    verified: true,
    verification_level: "documents_verified",
    response_rate: 90,
    location: { type: "Point", coordinates: [67.0111, 24.8707] },
    ...overrides,
  };
}

function offerDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    _id: "o1",
    job_id: "job1",
    worker_id: "w1",
    type: "counter_offer",
    status: "pending",
    offered_price: 1500,
    counter_price: 1800,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getJobDetail", () => {
  it("returns 404 for a job the user cannot access", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(null);
    await expect(getJobDetail("job1", "stranger")).rejects.toThrow(FlowError);
    await expect(getJobDetail("job1", "stranger")).rejects.toMatchObject({
      code: "job_not_found",
      statusCode: 404,
    });
  });

  it("allows the customer who owns the job", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(jobDoc({ status: "WORKER_RESPONSES" }));
    vi.mocked(Worker.find).mockResolvedValue([]);
    vi.mocked(Offer.find).mockResolvedValue([]);

    const detail = await getJobDetail("job1", "cust1");
    expect(Job.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: "job1",
        $or: expect.arrayContaining([{ customer_id: "cust1" }]),
      })
    );
    expect(detail.job).toBeDefined();
  });

  it("allows a worker who responded to the job", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(jobDoc({ status: "WORKER_RESPONSES" }));
    vi.mocked(Worker.find).mockResolvedValue([]);
    vi.mocked(Offer.find).mockResolvedValue([]);

    await getJobDetail("job1", "w1");
    expect(Job.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.arrayContaining([{ "matching.accepted_worker_ids": "w1" }]),
      })
    );
  });

  it("allows a worker to view an open broadcast", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(jobDoc());
    vi.mocked(Worker.find).mockResolvedValue([]);
    vi.mocked(Offer.find).mockResolvedValue([]);

    await getJobDetail("job1", "any-worker");
    expect(Job.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.arrayContaining([{ status: "BROADCASTING" }]),
      })
    );
  });

  it("returns empty responders when nobody accepted yet", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(
      jobDoc({
        matching: {
          search_radius_km: 5,
          eligible_workers_count: 0,
          acceptance_deadline: new Date("2026-01-01T10:10:00.000Z"),
          selection_deadline: null,
          accepted_worker_ids: [],
          selected_worker_id: null,
        },
      })
    );
    const detail = await getJobDetail("job1", "cust1");
    expect(detail.responders).toEqual([]);
    expect(Worker.find).not.toHaveBeenCalled();
  });

  it("assembles responders with worker metadata and their pending offer", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(jobDoc({ status: "CUSTOMER_SELECTING" }));
    vi.mocked(Worker.find).mockResolvedValue([workerDoc(), workerDoc({ _id: "w2", name: "Ali" })]);
    vi.mocked(Offer.find).mockResolvedValue([offerDoc()]);

    const detail = await getJobDetail("job1", "cust1");
    expect(detail.responders).toHaveLength(2);
    expect(detail.responders[0]).toMatchObject({
      worker: {
        id: "w1",
        name: "Imran",
        verified: true,
        verification_level: "documents_verified",
        ustad_score: 80,
        average_rating: 4.5,
        completed_jobs: 50,
        response_rate: 90,
      },
      offer: { type: "counter_offer", status: "pending", offered_price: 1500, counter_price: 1800 },
    });
  });

  it("computes the distance from the job location to each worker", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(jobDoc({ status: "WORKER_RESPONSES" }));
    vi.mocked(Worker.find).mockResolvedValue([workerDoc()]);
    vi.mocked(Offer.find).mockResolvedValue([]);

    const detail = await getJobDetail("job1", "cust1");
    expect(detail.responders[0].distance_km).toBeGreaterThan(0);
  });

  it("passes null offer for emergency direct claims (no negotiation)", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(
      jobDoc({
        status: "ACCEPTED",
        matching: {
          search_radius_km: 5,
          eligible_workers_count: 2,
          acceptance_deadline: new Date("2026-01-01T10:04:00.000Z"),
          selection_deadline: new Date("2026-01-01T10:09:00.000Z"),
          accepted_worker_ids: ["w1"],
          selected_worker_id: "w1",
        },
      })
    );
    vi.mocked(Worker.find).mockResolvedValue([workerDoc()]);
    vi.mocked(Offer.find).mockResolvedValue([]);

    const detail = await getJobDetail("job1", "cust1");
    expect(detail.responders).toHaveLength(1);
    expect(detail.responders[0].offer).toBeNull();
  });
});
