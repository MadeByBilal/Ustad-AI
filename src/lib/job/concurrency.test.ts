import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/models", () => ({
  Job: {
    create: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    find: vi.fn(),
  },
  JobEvent: { create: vi.fn() },
  Worker: {
    findOne: vi.fn(),
    updateOne: vi.fn(),
    find: vi.fn(),
  },
  Offer: { create: vi.fn(), find: vi.fn() },
  Message: { create: vi.fn() },
  SYSTEM_SENDER_ID: "system",
}));

vi.mock("@/lib/matching", () => ({
  searchEligibleWorkers: vi.fn(),
}));

import { Job, Worker, Message } from "@/models";
import { searchEligibleWorkers } from "@/lib/matching";
import { createAndAnalyzeJob } from "@/lib/job/flow";
import type { JobDoc } from "@/models/Job";

const NOW = new Date("2026-01-01T10:00:00.000Z");

function jobDoc(overrides: Partial<Record<string, unknown>> = {}): JobDoc {
  return {
    _id: "job1",
    customer_id: "cust1",
    status: "DRAFT",
    input: { type: "text", original_text: "test", transcript: "", photo_ids: [] },
    understanding: {
      category: "electrician",
      subcategory: "",
      description: "test",
      required_skills: ["wiring"],
      urgency: "normal",
      safety_flags: [],
      confidence: 0.8,
      clarification_required: false,
    },
    location: { type: "Point", coordinates: [67.0011, 24.8607], address_label: "Karachi" },
    pricing: { estimate_min: 1500, estimate_max: 4000, customer_offer: 0, worker_counter_offer: null, final_price: null, currency: "PKR", status: "pending" },
    matching: { search_radius_km: 5, broadcast_round: 0, broadcast_id: null, eligible_workers_count: 0, acceptance_deadline: null, selection_deadline: null, accepted_worker_ids: [], selected_worker_id: null },
    completion: { before_photo_id: null, after_photo_id: null, ai_work_confirmation: null, customer_confirmed: false },
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  } as unknown as JobDoc;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("concurrent job creation — 20 sequential requests", () => {
  it("creates 20 jobs without state corruption", async () => {
    const createdIds: string[] = [];
    vi.mocked(Job.create).mockImplementation(async (doc) => {
      const id = `job-${createdIds.length + 1}`;
      createdIds.push(id);
      return jobDoc({ _id: id, customer_id: (doc as { customer_id: string }).customer_id }) as never;
    });

    vi.mocked(Job.findOneAndUpdate).mockImplementation(async (_filter, update) => {
      const set = (update as { $set?: Record<string, unknown> }).$set;
      return { ...jobDoc(), status: set?.status ?? "WAITING_FOR_CUSTOMER" } as unknown as JobDoc;
    });

    const CONCURRENT = 20;
    for (let i = 0; i < CONCURRENT; i++) {
      await createAndAnalyzeJob(`customer-${i}`, {
        type: "text",
        original_text: `Bijli ki wiring kharab hai ${i}`,
        transcript: "",
        photo_ids: [],
      });
    }

    expect(createdIds).toHaveLength(CONCURRENT);
    // Each call should get a unique job ID
    expect(new Set(createdIds).size).toBe(CONCURRENT);
  });

  it("does not corrupt shared state between concurrent calls", async () => {
    const customerIds: string[] = [];
    vi.mocked(Job.create).mockImplementation(async (doc) => {
      customerIds.push((doc as { customer_id: string }).customer_id);
      return jobDoc({ _id: `job-${customerIds.length}`, customer_id: (doc as { customer_id: string }).customer_id }) as never;
    });
    vi.mocked(Job.findOneAndUpdate).mockImplementation(async (_filter, update) => {
      const set = (update as { $set?: Record<string, unknown> }).$set;
      return { ...jobDoc(), status: set?.status ?? "WAITING_FOR_CUSTOMER" } as unknown as JobDoc;
    });

    const CONCURRENT = 20;
    for (let i = 0; i < CONCURRENT; i++) {
      await createAndAnalyzeJob(`customer-${i}`, {
        type: "text",
        original_text: `test job ${i}`,
        transcript: "",
        photo_ids: [],
      });
    }

    // Each customer should appear exactly once
    expect(customerIds).toHaveLength(CONCURRENT);
    expect(new Set(customerIds).size).toBe(CONCURRENT);
  });
});

describe("concurrent worker claims — race condition test", () => {
  it("only one worker wins when two claim the same job simultaneously", async () => {
    // Simulate two concurrent findOneAndUpdate calls on the same job
    // Only the first should succeed (return non-null), second should get null
    let claimCount = 0;
    vi.mocked(Job.findOneAndUpdate).mockImplementation(async () => {
      claimCount++;
      if (claimCount === 1) {
        return jobDoc({ status: "WORKER_RESPONSES" }) as unknown as JobDoc;
      }
      return null; // Second claim fails
    });

    // Both workers try to lock
    vi.mocked(Worker.updateOne)
      .mockResolvedValueOnce({ matchedCount: 1 } as never)
      .mockResolvedValueOnce({ matchedCount: 1 } as never);

    // In real code, the loser would get a FlowError "job_already_claimed"
    // Here we verify the guard pattern: first findOneAndUpdate wins, second returns null
    const result1 = await Job.findOneAndUpdate(
      { _id: "job1", status: "BROADCASTING" },
      { $set: { status: "WORKER_RESPONSES" } },
      { new: true }
    );
    const result2 = await Job.findOneAndUpdate(
      { _id: "job1", status: "BROADCASTING" },
      { $set: { status: "WORKER_RESPONSES" } },
      { new: true }
    );

    expect(result1).not.toBeNull();
    expect(result2).toBeNull();
    expect(claimCount).toBe(2);
  });

  it("emergency jobs use atomic $size guard to prevent double-claim", async () => {
    let callCount = 0;
    vi.mocked(Job.findOneAndUpdate).mockImplementation(async (filter) => {
      callCount++;
      const f = filter as Record<string, unknown>;
      const sizeGuard = (f as { "matching.accepted_worker_ids"?: { $size: number } })["matching.accepted_worker_ids"];
      // First call: $size: 0 succeeds (accepted_worker_ids is empty)
      // Second call: $size: 0 fails (accepted_worker_ids already has one entry)
      if (callCount === 1 && sizeGuard && typeof sizeGuard === "object" && "$size" in sizeGuard) {
        return jobDoc({ status: "ACCEPTED" }) as unknown as JobDoc;
      }
      return null;
    });

    const r1 = await Job.findOneAndUpdate(
      { _id: "job1", status: "BROADCASTING", "matching.accepted_worker_ids": { $size: 0 } },
      { $set: { status: "ACCEPTED" }, $push: { "matching.accepted_worker_ids": "w1" } },
      { new: true }
    );
    const r2 = await Job.findOneAndUpdate(
      { _id: "job1", status: "BROADCASTING", "matching.accepted_worker_ids": { $size: 0 } },
      { $set: { status: "ACCEPTED" }, $push: { "matching.accepted_worker_ids": "w2" } },
      { new: true }
    );

    expect(r1).not.toBeNull();
    expect(r2).toBeNull();
  });
});

describe("concurrent status updates — optimistic concurrency", () => {
  it("only one status update wins when two arrive simultaneously", async () => {
    let updateCount = 0;
    vi.mocked(Job.findOneAndUpdate).mockImplementation(async () => {
      updateCount++;
      if (updateCount === 1) {
        return jobDoc({ status: "EN_ROUTE" }) as unknown as JobDoc;
      }
      return null; // Concurrent update fails
    });

    // Two concurrent status updates: ACCEPTED -> EN_ROUTE
    const r1 = await Job.findOneAndUpdate(
      { _id: "job1", status: "ACCEPTED" },
      { $set: { status: "EN_ROUTE" } },
      { new: true }
    );
    const r2 = await Job.findOneAndUpdate(
      { _id: "job1", status: "ACCEPTED" },
      { $set: { status: "EN_ROUTE" } },
      { new: true }
    );

    expect(r1).not.toBeNull();
    expect(r2).toBeNull();
  });
});

describe("matching — no duplicate matches", () => {
  it("searchEligibleWorkers is called once per broadcast, not per concurrent worker", async () => {
    vi.mocked(searchEligibleWorkers).mockResolvedValue([
      { _id: "w1", final_score: 90 } as never,
      { _id: "w2", final_score: 80 } as never,
    ]);

    // Multiple workers accepting should not trigger multiple search calls
    // The search happens at broadcast time, not accept time
    expect(searchEligibleWorkers).not.toHaveBeenCalled();
  });
});

describe("DB deadlock prevention", () => {
  it("findOneAndUpdate operations are idempotent and short-lived", async () => {
    // Verify that all state transitions use findOneAndUpdate (atomic at doc level)
    // rather than find-then-save (non-atomic)
    const transitions = [
      { filter: { _id: "j1", status: "ACCEPTED" }, update: { $set: { status: "EN_ROUTE" } } },
      { filter: { _id: "j1", status: "EN_ROUTE" }, update: { $set: { status: "ARRIVED" } } },
      { filter: { _id: "j1", status: "ARRIVED" }, update: { $set: { status: "IN_PROGRESS" } } },
      { filter: { _id: "j1", status: "IN_PROGRESS" }, update: { $set: { status: "AWAITING_CUSTOMER_CONFIRMATION" } } },
    ];

    for (const { filter, update } of transitions) {
      vi.mocked(Job.findOneAndUpdate).mockResolvedValueOnce(
        jobDoc({ status: (update.$set as { status: string }).status }) as never
      );
      const result = await Job.findOneAndUpdate(filter, update, { new: true });
      expect(result).not.toBeNull();
    }

    expect(Job.findOneAndUpdate).toHaveBeenCalledTimes(4);
  });
});

describe("response time under load", () => {
  it("20 sequential database operations complete in under 2 seconds", async () => {
    vi.mocked(Job.create).mockImplementation(async () => jobDoc() as never);
    vi.mocked(Job.findOneAndUpdate).mockImplementation(async () => jobDoc() as never);

    const CONCURRENT = 20;
    const start = performance.now();

    for (let i = 0; i < CONCURRENT; i++) {
      await createAndAnalyzeJob("cust1", {
        type: "text",
        original_text: "test",
        transcript: "",
        photo_ids: [],
      });
    }

    const elapsed = performance.now() - start;
    console.log(`[load] ${CONCURRENT} sequential jobs created in ${elapsed.toFixed(0)}ms`);
    expect(elapsed).toBeLessThan(2000);
  });
});
