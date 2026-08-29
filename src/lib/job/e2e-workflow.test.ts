import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * End-to-end workflow test: simulates the complete real user journey
 * from job posting through completion, including the emergency path.
 *
 * This tests the business logic layer (flow.ts) which is what the API
 * routes delegate to. Each step mirrors what a real API call triggers.
 */

vi.mock("@/models", () => ({
  Job: {
    create: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    find: vi.fn(),
    updateOne: vi.fn(),
    updateMany: vi.fn(),
  },
  JobEvent: { create: vi.fn() },
  Worker: {
    findOne: vi.fn(),
    updateOne: vi.fn(),
    updateMany: vi.fn(),
    find: vi.fn(),
  },
  Offer: {
    create: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    updateOne: vi.fn(),
    updateMany: vi.fn(),
  },
  Message: { create: vi.fn() },
  Review: { create: vi.fn(), find: vi.fn() },
  Upload: { findById: vi.fn() },
  Session: { findOne: vi.fn(), deleteOne: vi.fn() },
  User: { findOne: vi.fn(), create: vi.fn() },
  SYSTEM_SENDER_ID: "system",
}));

vi.mock("@/lib/matching", () => ({
  searchEligibleWorkers: vi.fn(),
  getWorkerResults: vi.fn(),
  getWorkerOptions: vi.fn(),
}));

import { Job, JobEvent, Worker, Offer, Message } from "@/models";
import { searchEligibleWorkers } from "@/lib/matching";
import {
  createAndAnalyzeJob,
  confirmJobDetails,
  submitOfferAndBroadcast,
  workerAcceptJob,
  customerSelectWorker,
  customerRejectWorker,
  workerUpdateJobStatus,
  workerAttachPhoto,
  workerCancelJob,
  customerCancelJob,
  markExpired,
  type JobInputPayload,
} from "@/lib/job/flow";
import type { JobDoc } from "@/models/Job";

const NOW = new Date("2026-01-01T10:00:00.000Z");
const CUSTOMER_ID = "customer-1";
const WORKER_ID = "worker-1";

function jobDoc(overrides: Partial<Record<string, unknown>> = {}): JobDoc {
  return {
    _id: "job-1",
    customer_id: CUSTOMER_ID,
    status: "DRAFT",
    input: { type: "text", original_text: "", transcript: "", photo_ids: [] },
    understanding: {
      category: "electrician",
      subcategory: "",
      description: "",
      required_skills: ["wiring", "fault finding"],
      urgency: "normal",
      safety_flags: [],
      confidence: 0.85,
      clarification_required: false,
    },
    location: {
      type: "Point",
      coordinates: [67.0011, 24.8607],
      address_label: "Karachi",
    },
    pricing: {
      estimate_min: 1500,
      estimate_max: 4000,
      customer_offer: 0,
      worker_counter_offer: null,
      final_price: null,
      currency: "PKR",
      status: "pending",
    },
    matching: {
      search_radius_km: 5,
      broadcast_round: 0,
      broadcast_id: null,
      eligible_workers_count: 0,
      acceptance_deadline: null,
      selection_deadline: null,
      accepted_worker_ids: [],
      selected_worker_id: null,
    },
    completion: {
      before_photo_id: null,
      after_photo_id: null,
      ai_work_confirmation: null,
      customer_confirmed: false,
    },
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  } as unknown as JobDoc;
}

function mockFindOneAndUpdate(base: JobDoc): void {
  const mock = Job.findOneAndUpdate as unknown as {
    mockImplementation: (
      fn: (filter: unknown, update: unknown) => Promise<unknown>,
    ) => void;
  };
  mock.mockImplementation(async (_filter, update) => {
    const clone = structuredClone(base);
    const set = (update as { $set?: Record<string, unknown> }).$set;
    if (set) {
      for (const [path, value] of Object.entries(set)) {
        const parts = path.split(".");
        let target: Record<string, unknown> = clone as Record<string, unknown>;
        for (let i = 0; i < parts.length - 1; i++) {
          target = target[parts[i]] as Record<string, unknown>;
        }
        target[parts[parts.length - 1]] = value;
      }
    }
    const push = (update as { $push?: Record<string, unknown> }).$push;
    if (push) {
      for (const [path, value] of Object.entries(push)) {
        const parts = path.split(".");
        let target: Record<string, unknown> = clone as Record<string, unknown>;
        for (let i = 0; i < parts.length - 1; i++) {
          target = target[parts[i]] as Record<string, unknown>;
        }
        const arr = target[parts[parts.length - 1]];
        if (Array.isArray(arr)) {
          arr.push(value);
        } else {
          target[parts[parts.length - 1]] = [value];
        }
      }
    }
    return clone;
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.mocked(Job.create).mockReset();
  vi.mocked(Job.findOne).mockReset();
  vi.mocked(Job.findOneAndUpdate).mockReset();
  vi.mocked(Job.find).mockReset();
  vi.mocked(JobEvent.create).mockReset();
  vi.mocked(Worker.findOne).mockReset();
  vi.mocked(Worker.findOne).mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
  } as never);
  vi.mocked(Worker.updateOne).mockReset();
  vi.mocked(Worker.updateMany).mockReset();
  vi.mocked(Offer.findOne).mockReset();
  vi.mocked(Offer.updateOne).mockReset();
  vi.mocked(Offer.updateMany).mockReset();
  vi.mocked(Message.create).mockReset();
  vi.mocked(searchEligibleWorkers).mockResolvedValue([
    { _id: WORKER_ID, final_score: 92 } as never,
    { _id: "worker-2", final_score: 85 } as never,
  ]);
});

const NORMAL_INPUT: JobInputPayload = {
  type: "text",
  original_text:
    "Mere ghar mein bijli ki wiring mein short circuit ho raha hai, achanak light band ho gayi",
  transcript: "",
  photo_ids: [],
};

const EMERGENCY_INPUT: JobInputPayload = {
  type: "voice",
  original_text:
    "Chingari nikal rahi hai switchboard se, bijli ka shock lag raha hai!",
  transcript: "Sparks coming from switchboard, electric shock risk!",
  photo_ids: [],
  urgency_hint: "emergency",
};

// ═══════════════════════════════════════════════════════════════════
// NORMAL JOB JOURNEY: post -> confirm -> broadcast -> accept -> status -> complete
// ═══════════════════════════════════════════════════════════════════

describe("E2E: normal job lifecycle", () => {
  it("full journey: create -> confirm -> broadcast -> worker accept -> status updates -> customer confirm", async () => {
    // ── Step 1: Customer posts a job (voice input → keyword analysis) ──
    vi.mocked(Job.create).mockResolvedValue(jobDoc() as never);
    mockFindOneAndUpdate(jobDoc());

    const created = await createAndAnalyzeJob(CUSTOMER_ID, NORMAL_INPUT);

    expect(created.status).toBe("WAITING_FOR_CUSTOMER");
    // Verify urgency was detected from the input text
    const createdArgs = vi.mocked(Job.create).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    const understanding = createdArgs.understanding as Record<string, unknown>;
    expect(understanding.urgency).toBe("emergency"); // short circuit + shock keywords
    expect(understanding.safety_flags as string[]).toContain("short circuit");
    expect(understanding.confidence as number).toBeGreaterThan(0.7);

    // ── Step 2: Customer confirms the job details ──
    vi.mocked(Job.findOne).mockResolvedValue({
      ...created,
      status: "WAITING_FOR_CUSTOMER",
    } as never);
    mockFindOneAndUpdate({
      ...created,
      status: "WAITING_FOR_CUSTOMER",
    } as JobDoc);

    const confirmed = await confirmJobDetails("job-1", CUSTOMER_ID);
    expect(confirmed.status).toBe("READY_TO_MATCH");
    expect(JobEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        from_state: "WAITING_FOR_CUSTOMER",
        to_state: "READY_TO_MATCH",
      }),
    );

    // ── Step 3: Customer broadcasts with an offer ──
    vi.mocked(Job.findOne).mockResolvedValue({
      ...confirmed,
      status: "READY_TO_MATCH",
    } as never);
    mockFindOneAndUpdate({ ...confirmed, status: "READY_TO_MATCH" } as JobDoc);

    const broadcast = await submitOfferAndBroadcast(
      "job-1",
      CUSTOMER_ID,
      2500,
      NOW,
    );
    expect(broadcast.job.status).toBe("BROADCASTING");
    expect(broadcast.eligible_workers_count).toBe(2);
    expect(broadcast.job.pricing!.customer_offer).toBe(2500);
    expect(broadcast.job.matching!.acceptance_deadline).toBeDefined();

    // ── Step 4: Worker accepts the job ──
    vi.mocked(Job.findOne).mockResolvedValue({
      ...broadcast.job,
      status: "BROADCASTING",
    } as never);
    mockFindOneAndUpdate({
      ...broadcast.job,
      status: "BROADCASTING",
    } as JobDoc);
    vi.mocked(Worker.updateOne).mockResolvedValue({ matchedCount: 1 } as never);

    const accepted = await workerAcceptJob("job-1", WORKER_ID, NOW);
    expect(accepted.status).toBe("WORKER_RESPONSES");
    expect(accepted.matching!.accepted_worker_ids).toContain(WORKER_ID);
    expect(Worker.updateOne).toHaveBeenCalledWith(
      { _id: WORKER_ID, active_job_id: null },
      expect.objectContaining({
        $set: expect.objectContaining({ active_job_id: "job-1" }),
      }),
    );

    // ── Step 5: Customer selects this worker ──
    vi.mocked(Job.findOne).mockResolvedValue({
      ...accepted,
      status: "WORKER_RESPONSES",
    } as never);
    mockFindOneAndUpdate({ ...accepted, status: "WORKER_RESPONSES" } as JobDoc);
    vi.mocked(Worker.updateOne).mockResolvedValue({ matchedCount: 1 } as never);
    vi.mocked(Worker.updateMany).mockResolvedValue({
      modifiedCount: 1,
    } as never);
    vi.mocked(Offer.findOne).mockResolvedValue({
      type: "accept",
      offered_price: 2500,
      status: "pending",
    } as never);

    const selected = await customerSelectWorker(
      "job-1",
      CUSTOMER_ID,
      WORKER_ID,
      NOW,
    );
    expect(selected.status).toBe("ACCEPTED");
    expect(selected.matching!.selected_worker_id).toBe(WORKER_ID);
    expect(selected.pricing!.final_price).toBe(2500);
    expect(selected.pricing!.status).toBe("agreed");

    // ── Step 6: Worker en route ──
    vi.mocked(Job.findOne).mockResolvedValue({
      ...selected,
      status: "ACCEPTED",
    } as never);
    mockFindOneAndUpdate({ ...selected, status: "ACCEPTED" } as JobDoc);

    const enRoute = await workerUpdateJobStatus("job-1", WORKER_ID, "EN_ROUTE");
    expect(enRoute.status).toBe("EN_ROUTE");
    expect(Message.create).toHaveBeenCalledWith(
      expect.objectContaining({ content: "On the way" }),
    );

    // ── Step 7: Worker arrives ──
    vi.mocked(Job.findOne).mockResolvedValue({
      ...enRoute,
      status: "EN_ROUTE",
    } as never);
    mockFindOneAndUpdate({ ...enRoute, status: "EN_ROUTE" } as JobDoc);

    const arrived = await workerUpdateJobStatus("job-1", WORKER_ID, "ARRIVED");
    expect(arrived.status).toBe("ARRIVED");

    // ── Step 8: Worker attaches before photo and starts work ──
    vi.mocked(Job.findOne).mockResolvedValue({
      ...arrived,
      status: "ARRIVED",
    } as never);
    mockFindOneAndUpdate({ ...arrived, status: "ARRIVED" } as JobDoc);

    const withBefore = await workerAttachPhoto("job-1", WORKER_ID, {
      type: "before",
      photo_id: "photo-before-1",
    });
    expect(withBefore.completion?.before_photo_id).toBe("photo-before-1");

    vi.mocked(Job.findOne).mockResolvedValue({
      ...withBefore,
      status: "ARRIVED",
    } as never);
    mockFindOneAndUpdate({ ...withBefore, status: "ARRIVED" } as JobDoc);

    const inProgress = await workerUpdateJobStatus(
      "job-1",
      WORKER_ID,
      "IN_PROGRESS",
    );
    expect(inProgress.status).toBe("IN_PROGRESS");

    // ── Step 9: Worker attaches after photo and marks complete ──
    vi.mocked(Job.findOne).mockResolvedValue({
      ...inProgress,
      status: "IN_PROGRESS",
    } as never);
    mockFindOneAndUpdate({ ...inProgress, status: "IN_PROGRESS" } as JobDoc);

    const withAfter = await workerAttachPhoto("job-1", WORKER_ID, {
      type: "after",
      photo_id: "photo-after-1",
    });
    expect(withAfter.completion?.after_photo_id).toBe("photo-after-1");

    vi.mocked(Job.findOne).mockResolvedValue({
      ...withAfter,
      status: "IN_PROGRESS",
    } as never);
    mockFindOneAndUpdate({ ...withAfter, status: "IN_PROGRESS" } as JobDoc);
    vi.mocked(Worker.updateOne).mockResolvedValue({ matchedCount: 1 } as never);

    const awaitingConfirm = await workerUpdateJobStatus(
      "job-1",
      WORKER_ID,
      "AWAITING_CUSTOMER_CONFIRMATION",
    );
    expect(awaitingConfirm.status).toBe("AWAITING_CUSTOMER_CONFIRMATION");
    // Worker should be released
    expect(Worker.updateOne).toHaveBeenCalledWith(
      { _id: WORKER_ID, active_job_id: "job-1" },
      { $set: { active_job_id: null, is_available: true } },
    );

    // ── Step 10: Job lifecycle events recorded ──
    const allEvents = vi.mocked(JobEvent.create).mock.calls.map((c) => c[0]);
    const transitions = allEvents.map((e) => `${e.from_state}->${e.to_state}`);
    expect(transitions).toContain("DRAFT->ANALYZING");
    expect(transitions).toContain("ANALYZING->WAITING_FOR_CUSTOMER");
    expect(transitions).toContain("WAITING_FOR_CUSTOMER->READY_TO_MATCH");
    expect(transitions).toContain("READY_TO_MATCH->BROADCASTING");
    expect(transitions).toContain("BROADCASTING->WORKER_RESPONSES");
    expect(transitions).toContain("WORKER_RESPONSES->CUSTOMER_SELECTING");
    expect(transitions).toContain("CUSTOMER_SELECTING->ACCEPTED");
    expect(transitions).toContain("ACCEPTED->EN_ROUTE");
    expect(transitions).toContain("EN_ROUTE->ARRIVED");
  });
});

// ═══════════════════════════════════════════════════════════════════
// EMERGENCY JOB JOURNEY: voice input -> emergency detected -> direct accept
// ═══════════════════════════════════════════════════════════════════

describe("E2E: emergency job lifecycle", () => {
  it("emergency: voice input -> emergency detected -> worker claims directly (skips negotiation)", async () => {
    // ── Step 1: Customer posts emergency job via voice ──
    vi.mocked(Job.create).mockImplementation(async (doc) => {
      return doc as never;
    });
    mockFindOneAndUpdate(jobDoc());

    const created = await createAndAnalyzeJob(CUSTOMER_ID, EMERGENCY_INPUT);

    expect(created.status).toBe("WAITING_FOR_CUSTOMER");

    // Verify the emergency urgency was detected from the input
    const createdArgs = vi.mocked(Job.create).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    const understanding = createdArgs.understanding as Record<string, unknown>;
    expect(understanding.urgency).toBe("emergency");
    expect((understanding.safety_flags as string[]).length).toBeGreaterThan(0);

    // ── Step 2: Confirm + broadcast (emergency jobs don't require offer) ──
    const emergencyJob = {
      ...created,
      status: "WAITING_FOR_CUSTOMER",
      understanding: { ...created.understanding, urgency: "emergency" },
    } as JobDoc;
    vi.mocked(Job.findOne).mockResolvedValue(emergencyJob as never);
    mockFindOneAndUpdate(emergencyJob);
    const confirmed = await confirmJobDetails("job-1", CUSTOMER_ID);

    const readyJob = {
      ...confirmed,
      status: "READY_TO_MATCH",
      understanding: { ...confirmed.understanding, urgency: "emergency" },
    } as JobDoc;
    vi.mocked(Job.findOne).mockResolvedValue(readyJob as never);
    mockFindOneAndUpdate(readyJob);

    // Emergency jobs can broadcast with null offer
    const broadcast = await submitOfferAndBroadcast(
      "job-1",
      CUSTOMER_ID,
      null,
      NOW,
    );
    expect(broadcast.job.status).toBe("BROADCASTING");
    expect(broadcast.job.matching!.acceptance_deadline?.toISOString()).toBe(
      new Date(NOW.getTime() + 4 * 60_000).toISOString(), // 4 min for emergency
    );

    // ── Step 3: First worker claims — emergency goes straight to ACCEPTED ──
    const broadcastingEmergency = {
      ...broadcast.job,
      status: "BROADCASTING",
      understanding: { ...broadcast.job.understanding, urgency: "emergency" },
    } as JobDoc;
    vi.mocked(Job.findOne).mockResolvedValue(broadcastingEmergency as never);
    mockFindOneAndUpdate(broadcastingEmergency);
    vi.mocked(Worker.updateOne).mockResolvedValue({ matchedCount: 1 } as never);

    const accepted = await workerAcceptJob("job-1", WORKER_ID, NOW);
    expect(accepted.status).toBe("ACCEPTED"); // Not WORKER_RESPONSES!
    expect(accepted.matching!.selected_worker_id).toBe(WORKER_ID);

    // ── Step 4: Second worker tries to claim — rejected (job is no longer BROADCASTING) ──
    vi.mocked(Job.findOne).mockResolvedValue({
      ...accepted,
      status: "ACCEPTED",
      understanding: { ...accepted.understanding, urgency: "emergency" },
    } as never);

    await expect(
      workerAcceptJob("job-1", "worker-2", NOW),
    ).rejects.toMatchObject({ code: "invalid_status" });

    // ── Step 5: Emergency worker can skip before_photo ──
    const acceptedEmergency = {
      ...accepted,
      status: "ACCEPTED",
      understanding: { ...accepted.understanding, urgency: "emergency" },
    } as JobDoc;
    vi.mocked(Job.findOne).mockResolvedValue(acceptedEmergency as never);
    mockFindOneAndUpdate(acceptedEmergency);

    const enRoute = await workerUpdateJobStatus("job-1", WORKER_ID, "EN_ROUTE");
    expect(enRoute.status).toBe("EN_ROUTE");

    vi.mocked(Job.findOne).mockResolvedValue({
      ...enRoute,
      status: "EN_ROUTE",
      understanding: { ...enRoute.understanding, urgency: "emergency" },
    } as never);
    mockFindOneAndUpdate({ ...enRoute, status: "EN_ROUTE" } as JobDoc);

    const arrived = await workerUpdateJobStatus("job-1", WORKER_ID, "ARRIVED");
    expect(arrived.status).toBe("ARRIVED");

    // Emergency: IN_PROGRESS without before_photo should succeed
    vi.mocked(Job.findOne).mockResolvedValue({
      ...arrived,
      status: "ARRIVED",
      understanding: { ...arrived.understanding, urgency: "emergency" },
    } as never);
    mockFindOneAndUpdate({ ...arrived, status: "ARRIVED" } as JobDoc);

    const inProgress = await workerUpdateJobStatus(
      "job-1",
      WORKER_ID,
      "IN_PROGRESS",
    );
    expect(inProgress.status).toBe("IN_PROGRESS");
  });
});

// ═══════════════════════════════════════════════════════════════════
// CANCELLATION PATHS
// ═══════════════════════════════════════════════════════════════════

describe("E2E: cancellation scenarios", () => {
  it("worker cancels an EN_ROUTE job — releases availability and penalizes score", async () => {
    const active = jobDoc({
      status: "EN_ROUTE",
      matching: { ...jobDoc().matching, selected_worker_id: WORKER_ID },
    });

    vi.mocked(Job.findOne).mockResolvedValue(active as never);
    vi.mocked(Job.findOneAndUpdate).mockImplementation(
      async (_filter, update) => {
        const set = (update as { $set?: Record<string, unknown> }).$set;
        return { ...active, ...set } as never;
      },
    );
    vi.mocked(Worker.updateOne).mockResolvedValue({ matchedCount: 1 } as never);

    const cancelled = await workerCancelJob(
      "job-1",
      WORKER_ID,
      "Vehicle broke down",
    );
    expect(cancelled.status).toBe("CANCELLED");
    expect(Worker.updateOne).toHaveBeenCalledWith(
      { _id: WORKER_ID, active_job_id: "job-1" },
      expect.objectContaining({
        $set: { active_job_id: null, is_available: true },
        $inc: { cancellation_rate: 1, ustad_score: -5 },
      }),
    );
    expect(Message.create).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Job cancelled by the worker" }),
    );
  });

  it("customer cancels an IN_PROGRESS job — releases worker", async () => {
    const active = jobDoc({
      status: "IN_PROGRESS",
      matching: { ...jobDoc().matching, selected_worker_id: WORKER_ID },
    });

    vi.mocked(Job.findOne).mockResolvedValue(active as never);
    vi.mocked(Job.findOneAndUpdate).mockImplementation(
      async (_filter, update) => {
        const set = (update as { $set?: Record<string, unknown> }).$set;
        return { ...active, ...set } as never;
      },
    );
    vi.mocked(Worker.updateOne).mockResolvedValue({ matchedCount: 1 } as never);

    const cancelled = await customerCancelJob(
      "job-1",
      CUSTOMER_ID,
      "Changed mind",
    );
    expect(cancelled.status).toBe("CANCELLED");
    expect(Worker.updateOne).toHaveBeenCalledWith(
      { _id: WORKER_ID, active_job_id: "job-1" },
      expect.objectContaining({
        $set: { active_job_id: null, is_available: true },
      }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════
// WORKER REJECTION + REBROADCAST
// ═══════════════════════════════════════════════════════════════════

describe("E2E: worker rejection and rebroadcast", () => {
  it("customer rejects a worker's offer and rebroadcasts", async () => {
    const responding = jobDoc({
      status: "WORKER_RESPONSES",
      matching: {
        ...jobDoc().matching,
        accepted_worker_ids: [WORKER_ID, "worker-2"],
        selection_deadline: new Date(NOW.getTime() + 60_000),
      },
    });

    vi.mocked(Job.findOne).mockResolvedValue(responding as never);
    mockFindOneAndUpdate(responding);
    vi.mocked(Worker.updateOne).mockResolvedValue({ matchedCount: 1 } as never);

    const rebroadcast = await customerRejectWorker(
      "job-1",
      CUSTOMER_ID,
      WORKER_ID,
      "rebroadcast",
      NOW,
    );
    expect(rebroadcast.status).toBe("READY_TO_MATCH");
    expect(rebroadcast.matching!.accepted_worker_ids).toEqual([]);
    expect(rebroadcast.matching!.selected_worker_id).toBeNull();
  });

  it("customer closes the job after rejecting", async () => {
    const responding = jobDoc({
      status: "WORKER_RESPONSES",
      matching: {
        ...jobDoc().matching,
        accepted_worker_ids: [WORKER_ID],
        selection_deadline: new Date(NOW.getTime() + 60_000),
      },
    });

    vi.mocked(Job.findOne).mockResolvedValue(responding as never);
    mockFindOneAndUpdate(responding);
    vi.mocked(Worker.updateOne).mockResolvedValue({ matchedCount: 1 } as never);

    const closed = await customerRejectWorker(
      "job-1",
      CUSTOMER_ID,
      WORKER_ID,
      "close",
      NOW,
    );
    expect(closed.status).toBe("CANCELLED");
  });
});

// ═══════════════════════════════════════════════════════════════════
// EXPIRY
// ═══════════════════════════════════════════════════════════════════

describe("E2E: deadline expiry", () => {
  it("broadcasting job expires when deadline passes", async () => {
    const stale = jobDoc({
      status: "BROADCASTING",
      matching: {
        ...jobDoc().matching,
        acceptance_deadline: new Date(NOW.getTime() - 1000),
        accepted_worker_ids: ["worker-2"],
      },
    });

    vi.mocked(Job.findOne).mockResolvedValue(stale as never);
    mockFindOneAndUpdate(stale);
    vi.mocked(Worker.updateMany).mockResolvedValue({
      modifiedCount: 1,
    } as never);

    const expired = await markExpired("job-1", NOW);
    expect(expired?.status).toBe("EXPIRED");
    // Workers should be released
    expect(Worker.updateMany).toHaveBeenCalled();
  });

  it("worker cannot accept after deadline", async () => {
    const stale = jobDoc({
      status: "BROADCASTING",
      matching: {
        ...jobDoc().matching,
        acceptance_deadline: new Date(NOW.getTime() - 1000),
      },
    });

    vi.mocked(Job.findOne).mockResolvedValue(stale as never);

    await expect(
      workerAcceptJob("job-1", WORKER_ID, NOW),
    ).rejects.toMatchObject({
      code: "acceptance_window_closed",
      statusCode: 410,
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// INVALID TRANSITIONS (should be rejected, not silently allowed)
// ═══════════════════════════════════════════════════════════════════

describe("E2E: invalid transition guard", () => {
  it("cannot skip from ACCEPTED directly to IN_PROGRESS", async () => {
    const accepted = jobDoc({
      status: "ACCEPTED",
      matching: { ...jobDoc().matching, selected_worker_id: WORKER_ID },
    });

    vi.mocked(Job.findOne).mockResolvedValue(accepted as never);

    await expect(
      workerUpdateJobStatus("job-1", WORKER_ID, "IN_PROGRESS"),
    ).rejects.toMatchObject({ code: "invalid_status" });
  });

  it("cannot cancel from AWAITING_CUSTOMER_CONFIRMATION as worker", async () => {
    const awaiting = jobDoc({
      status: "AWAITING_CUSTOMER_CONFIRMATION",
      matching: { ...jobDoc().matching, selected_worker_id: WORKER_ID },
    });

    vi.mocked(Job.findOne).mockResolvedValue(awaiting as never);

    await expect(workerCancelJob("job-1", WORKER_ID)).rejects.toMatchObject({
      code: "invalid_status",
    });
  });

  it("cannot confirm a job that is already BROADCASTING", async () => {
    const broadcasting = jobDoc({ status: "BROADCASTING" });
    vi.mocked(Job.findOne).mockResolvedValue(broadcasting as never);

    await expect(confirmJobDetails("job-1", CUSTOMER_ID)).rejects.toMatchObject(
      { code: "invalid_status" },
    );
  });
});
