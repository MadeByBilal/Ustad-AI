import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/models", () => {
  return {
    Job: {
      create: vi.fn(),
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      updateOne: vi.fn(),
      updateMany: vi.fn(),
    },
    JobEvent: {
      create: vi.fn(),
      insertMany: vi.fn(),
    },
    Worker: {
      updateOne: vi.fn(),
      updateMany: vi.fn(),
    },
    Offer: {
      create: vi.fn(),
      findOne: vi.fn(),
      updateOne: vi.fn(),
      updateMany: vi.fn(),
    },
    Message: {
      create: vi.fn(),
    },
    SYSTEM_SENDER_ID: "system",
    User: { findOne: vi.fn() },
  };
});

vi.mock("@/lib/matching", () => ({
  searchEligibleWorkers: vi.fn(),
}));

import { Job, JobEvent, Message, Offer, Worker } from "@/models";
import { searchEligibleWorkers } from "@/lib/matching";
import {
  FlowError,
  createAndAnalyzeJob,
  reanalyzeJob,
  confirmJobDetails,
  submitOfferAndBroadcast,
  workerAcceptJob,
  customerSelectWorker,
  customerRejectWorker,
  workerCancelJob,
  markExpired,
  workerOffer,
  workerUpdateJobStatus,
} from "@/lib/job/flow";
import type { JobDoc, JobStatus } from "@/models/Job";

const NOW = new Date("2026-01-01T10:00:00.000Z");

function setByPath(obj: unknown, path: string, value: unknown): void {
  const parts = path.split(".");
  let target: Record<string, unknown> = obj as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (typeof target[key] !== "object" || target[key] === null) {
      target[key] = {};
    }
    target = target[key] as Record<string, unknown>;
  }
  target[parts[parts.length - 1]] = value;
}

function pushByPath(obj: unknown, path: string, value: unknown): void {
  const parts = path.split(".");
  let target: Record<string, unknown> = obj as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    target = target[parts[i]] as Record<string, unknown>;
  }
  const arr = target[parts[parts.length - 1]] as unknown[];
  if (!Array.isArray(arr)) {
    target[parts[parts.length - 1]] = [value];
  } else {
    arr.push(value);
  }
}

/** Simulates a MongoDB findOneAndUpdate mutating a base document. */
function applyUpdate(base: JobDoc, update: Record<string, unknown>): JobDoc {
  const clone: JobDoc = structuredClone(base);
  const set = update.$set as Record<string, unknown> | undefined;
  if (set) {
    for (const [path, value] of Object.entries(set)) {
      setByPath(clone, path, value);
    }
  }
  const push = update.$push as Record<string, unknown> | undefined;
  if (push) {
    for (const [path, value] of Object.entries(push)) {
      pushByPath(clone, path, value);
    }
  }
  return clone;
}

function mockFindOneAndUpdate(base: JobDoc): void {
  const mock = Job.findOneAndUpdate as unknown as {
    mockImplementation: (
      fn: (filter: unknown, update: unknown) => Promise<unknown>
    ) => void;
  };
  mock.mockImplementation(async (_filter, update) =>
    applyUpdate(base, update as Record<string, unknown>)
  );
}

function jobDoc(overrides: Partial<Record<string, unknown>> = {}): JobDoc {
  return {
    _id: "job1",
    customer_id: "cust1",
    status: "DRAFT",
    input: { type: "text", original_text: "Bijli ki wiring kharab hai", transcript: "", photo_ids: [] },
    understanding: {
      category: "",
      subcategory: "",
      description: "",
      required_skills: [],
      urgency: "normal",
      safety_flags: [],
      confidence: 0,
      clarification_required: false,
    },
    location: { type: "Point", coordinates: [67.0011, 24.8607], address_label: "Karachi" },
    pricing: {
      estimate_min: 0,
      estimate_max: 0,
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

const INPUT = {
  type: "text" as const,
  original_text: "Bijli ki wiring kharab hai, short circuit ho rahi hai",
  transcript: "",
  photo_ids: [],
};

function withStatus(job: Record<string, unknown>, status: string): JobDoc {
  return { ...job, status } as unknown as JobDoc;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(searchEligibleWorkers).mockResolvedValue([
    { _id: "w1", final_score: 90 } as never,
    { _id: "w2", final_score: 80 } as never,
  ]);
});

describe("createAndAnalyzeJob", () => {
  it("creates a job at WAITING_FOR_CUSTOMER with an analysis and recorded lifecycle events", async () => {
    vi.mocked(Job.create).mockResolvedValue(jobDoc() as never);
    mockFindOneAndUpdate(jobDoc());

    await createAndAnalyzeJob("cust1", INPUT);

    expect(Job.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer_id: "cust1", status: "DRAFT", input: INPUT })
    );
    expect(JobEvent.create).toHaveBeenCalledTimes(2);
    const events = vi.mocked(JobEvent.create).mock.calls.map((c) => c[0]);
    expect(events[0]).toMatchObject({ from_state: "DRAFT", to_state: "ANALYZING", actor_type: "system" });
    expect(events[1]).toMatchObject({ from_state: "ANALYZING", to_state: "WAITING_FOR_CUSTOMER", actor_type: "system" });
  });

  it("records the analyzed category and urgency from the input text", async () => {
    vi.mocked(Job.create).mockResolvedValue(jobDoc() as never);
    mockFindOneAndUpdate(jobDoc());

    await createAndAnalyzeJob("cust1", INPUT);

    const created = vi.mocked(Job.create).mock.calls[0][0] as Record<string, unknown>;
    const understanding = created.understanding as Record<string, unknown>;
    expect(understanding.category).toBe("electrician");
    expect(understanding.urgency).toBe("emergency");
    expect((understanding.safety_flags as string[]).length).toBeGreaterThan(0);
  });
});

describe("reanalyzeJob", () => {
  it("re-runs analysis while staying at WAITING_FOR_CUSTOMER", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(withStatus(jobDoc(), "WAITING_FOR_CUSTOMER") as never);
    mockFindOneAndUpdate(withStatus(jobDoc(), "WAITING_FOR_CUSTOMER"));

    const updated = await reanalyzeJob("job1", "cust1", INPUT);

    expect(updated.status).toBe("WAITING_FOR_CUSTOMER");
    expect(Job.findOne).toHaveBeenCalledWith(expect.objectContaining({ _id: "job1", customer_id: "cust1" }));
    expect(vi.mocked(JobEvent.create).mock.calls.length).toBe(2);
  });

  it("rejects edits from another customer", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(null);
    await expect(reanalyzeJob("job1", "other", INPUT)).rejects.toMatchObject({ code: "job_not_found" });
  });

  it("rejects re-analysis once the job has moved on", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(withStatus(jobDoc(), "BROADCASTING") as never);
    await expect(reanalyzeJob("job1", "cust1", INPUT)).rejects.toMatchObject({ code: "invalid_status" });
  });
});

describe("confirmJobDetails", () => {
  it("moves a job from WAITING_FOR_CUSTOMER to READY_TO_MATCH", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(withStatus(jobDoc(), "WAITING_FOR_CUSTOMER") as never);
    mockFindOneAndUpdate(withStatus(jobDoc(), "WAITING_FOR_CUSTOMER"));

    const job = await confirmJobDetails("job1", "cust1");

    expect(job.status).toBe("READY_TO_MATCH");
    expect(Job.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: "job1",
        customer_id: "cust1",
        status: "WAITING_FOR_CUSTOMER",
      }),
      { $set: { status: "READY_TO_MATCH" } },
      expect.anything()
    );
    expect(JobEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ from_state: "WAITING_FOR_CUSTOMER", to_state: "READY_TO_MATCH", actor_type: "customer", actor_id: "cust1" })
    );
  });

  it("fails when the job is not at WAITING_FOR_CUSTOMER", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(withStatus(jobDoc(), "BROADCASTING") as never);
    await expect(confirmJobDetails("job1", "cust1")).rejects.toMatchObject({ code: "invalid_status" });
  });
});

describe("submitOfferAndBroadcast", () => {
  const ready = withStatus(
    jobDoc({
      understanding: {
        ...jobDoc().understanding,
        category: "electrician",
        required_skills: ["wiring", "fault finding"],
        urgency: "normal",
      } as JobDoc["understanding"],
      pricing: { ...jobDoc().pricing, estimate_min: 1500, estimate_max: 4000 },
    }),
    "READY_TO_MATCH"
  );

  it("broadcasts a normal job with a validated offer, deadline and worker count", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(ready as never);
    mockFindOneAndUpdate(ready);

    const result = await submitOfferAndBroadcast("job1", "cust1", 2000, NOW);

    expect(result.job.status).toBe("BROADCASTING");
    expect(result.job.pricing!.customer_offer).toBe(2000);
    expect(result.job.matching!.broadcast_id).toBeTypeOf("string");
    expect(result.job.matching!.broadcast_round).toBe(1);
    expect(result.job.matching!.eligible_workers_count).toBe(2);
    expect(result.job.matching!.acceptance_deadline?.toISOString()).toBe(
      new Date(NOW.getTime() + 10 * 60_000).toISOString()
    );
    expect(searchEligibleWorkers).toHaveBeenCalledWith(
      expect.objectContaining({ category: "electrician", required_skills: ["wiring", "fault finding"], urgency: "normal" })
    );
  });

  it("rejects an offer below the estimate floor", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(ready as never);
    await expect(submitOfferAndBroadcast("job1", "cust1", 100, NOW)).rejects.toMatchObject({
      code: "offer_too_low",
      statusCode: 400,
    });
  });

  it("requires an offer on non-emergency jobs", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(ready as never);
    await expect(submitOfferAndBroadcast("job1", "cust1", null, NOW)).rejects.toMatchObject({
      code: "offer_required",
    });
  });

  it("broadcasts an emergency job without a customer offer", async () => {
    const emergency = withStatus(
      jobDoc({
        understanding: {
          ...jobDoc().understanding,
          category: "electrician",
          required_skills: ["wiring", "fault finding"],
          urgency: "emergency",
        } as JobDoc["understanding"],
      }),
      "READY_TO_MATCH"
    );
    vi.mocked(Job.findOne).mockResolvedValue(emergency as never);
    mockFindOneAndUpdate(emergency);

    const result = await submitOfferAndBroadcast("job1", "cust1", null, NOW);

    expect(result.job.status).toBe("BROADCASTING");
    expect(result.job.matching!.acceptance_deadline?.toISOString()).toBe(
      new Date(NOW.getTime() + 4 * 60_000).toISOString()
    );
  });
});

describe("workerAcceptJob", () => {
  const broadcasting = withStatus(
    jobDoc({
      understanding: {
        ...jobDoc().understanding,
        category: "electrician",
        urgency: "normal",
      } as JobDoc["understanding"],
      matching: {
        ...jobDoc().matching,
        broadcast_id: "b-1",
        acceptance_deadline: new Date(NOW.getTime() + 5 * 60_000),
      } as unknown as JobDoc["matching"],
    }),
    "BROADCASTING"
  );

  it("claims a normal job into WORKER_RESPONSES and locks the worker", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(broadcasting as never);
    mockFindOneAndUpdate(broadcasting);
    vi.mocked(Worker.updateOne).mockResolvedValue({ matchedCount: 1, modifiedCount: 1 } as never);

    const job = await workerAcceptJob("job1", "w1", NOW);

    expect(job.status).toBe("WORKER_RESPONSES");
    expect(job.matching!.accepted_worker_ids).toContain("w1");
    expect(job.matching!.selection_deadline?.toISOString()).toBe(
      new Date(NOW.getTime() + 5 * 60_000).toISOString()
    );
    expect(Worker.updateOne).toHaveBeenCalledWith(
      { _id: "w1", active_job_id: null },
      expect.objectContaining({ $set: { active_job_id: "job1", is_available: false } })
    );
    expect(Message.create).toHaveBeenCalledWith(
      expect.objectContaining({ sender_type: "system", content: "Job accepted" })
    );
  });

  it("rejects acceptance after the deadline has passed", async () => {
    const expired = withStatus(
      { ...broadcasting, matching: { ...broadcasting.matching, acceptance_deadline: new Date(NOW.getTime() - 1000) } },
      "BROADCASTING"
    ) as unknown as JobDoc;
    vi.mocked(Job.findOne).mockResolvedValue(expired as never);
    await expect(workerAcceptJob("job1", "w1", NOW)).rejects.toMatchObject({ code: "acceptance_window_closed", statusCode: 410 });
  });

  it("accepts an emergency job straight into ACCEPTED", async () => {
    const emergency = withStatus(
      {
        ...broadcasting,
        understanding: {
          ...broadcasting.understanding,
          urgency: "emergency",
        } as unknown as JobDoc["understanding"],
      },
      "BROADCASTING"
    ) as unknown as JobDoc;
    vi.mocked(Job.findOne).mockResolvedValue(emergency as never);
    mockFindOneAndUpdate(emergency);
    vi.mocked(Worker.updateOne).mockResolvedValue({ matchedCount: 1, modifiedCount: 1 } as never);

    const job = await workerAcceptJob("job1", "w1", NOW);

    expect(job.status).toBe("ACCEPTED");
    expect(job.matching!.selected_worker_id).toBe("w1");
    expect(JobEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ from_state: "BROADCASTING", to_state: "ACCEPTED", actor_id: "w1", actor_type: "worker" })
    );
  });

  it("fails when the job cannot be claimed (already accepted elsewhere)", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(broadcasting as never);
    vi.mocked(Job.findOneAndUpdate).mockResolvedValueOnce(null);
    await expect(workerAcceptJob("job1", "w1", NOW)).rejects.toMatchObject({ code: "job_already_claimed" });
  });

  it("rejects when the worker record cannot be locked and rolls back the claim", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(broadcasting as never);
    mockFindOneAndUpdate(broadcasting);
    vi.mocked(Worker.updateOne).mockResolvedValue({ matchedCount: 0, modifiedCount: 0 } as never);

    await expect(workerAcceptJob("job1", "w1", NOW)).rejects.toMatchObject({ code: "worker_not_available" });

    const rollback = vi.mocked(Job.findOneAndUpdate).mock.calls[1];
    expect(rollback?.[0]).toMatchObject({ status: "WORKER_RESPONSES", "matching.accepted_worker_ids": "w1" } as never);
    expect(rollback?.[1]).toMatchObject({ $pull: { "matching.accepted_worker_ids": "w1" } } as never);
  });
});

describe("customerSelectWorker", () => {
  const responding = withStatus(
    jobDoc({
      matching: {
        ...jobDoc().matching,
        broadcast_id: "b-1",
        accepted_worker_ids: ["w1", "w2"],
        selection_deadline: new Date(NOW.getTime() + 60_000),
      } as unknown as JobDoc["matching"],
    }),
    "WORKER_RESPONSES"
  );

  it("accepts a responding worker and releases the others", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(responding as never);
    mockFindOneAndUpdate(responding);
    vi.mocked(Worker.updateOne).mockResolvedValue({ matchedCount: 1, modifiedCount: 1 } as never);
    vi.mocked(Worker.updateMany).mockResolvedValue({ modifiedCount: 1 } as never);

    const job = await customerSelectWorker("job1", "cust1", "w1", NOW);

    expect(job.status).toBe("ACCEPTED");
    expect(job.matching!.selected_worker_id).toBe("w1");
    expect(Worker.updateOne).toHaveBeenCalledWith(
      { _id: "w1", active_job_id: "job1" },
      expect.objectContaining({ $set: { is_available: false } })
    );
    expect(Worker.updateMany).toHaveBeenCalledWith(
      { _id: { $in: ["w2"] }, active_job_id: "job1" },
      expect.objectContaining({ $set: { active_job_id: null, is_available: true } })
    );
    const events = vi.mocked(JobEvent.create).mock.calls.map((c) => c[0]);
    expect(events[0]).toMatchObject({ from_state: "WORKER_RESPONSES", to_state: "CUSTOMER_SELECTING", actor_type: "system" });
    expect(events[1]).toMatchObject({ from_state: "CUSTOMER_SELECTING", to_state: "ACCEPTED", actor_type: "customer", actor_id: "cust1", metadata: { worker_id: "w1" } });
  });

  it("rejects a worker who never responded", async () => {
    const responded = withStatus(
      { ...responding, matching: { ...responding.matching, accepted_worker_ids: ["w1"] } },
      "WORKER_RESPONSES"
    ) as unknown as JobDoc;
    vi.mocked(Job.findOne).mockResolvedValue(responded as never);
    await expect(customerSelectWorker("job1", "cust1", "w2", NOW)).rejects.toMatchObject({ code: "worker_not_responding" });
  });

  it("rejects selection after the window closed", async () => {
    const stale = withStatus(
      { ...responding, matching: { ...responding.matching, selection_deadline: new Date(NOW.getTime() - 1000) } },
      "WORKER_RESPONSES"
    ) as unknown as JobDoc;
    vi.mocked(Job.findOne).mockResolvedValue(stale as never);
    await expect(customerSelectWorker("job1", "cust1", "w1", NOW)).rejects.toMatchObject({ code: "selection_window_closed" });
  });
});

describe("customerRejectWorker", () => {
  const responding = withStatus(
    jobDoc({
      matching: {
        ...jobDoc().matching,
        broadcast_id: "b-1",
        accepted_worker_ids: ["w1", "w2"],
        selection_deadline: new Date(NOW.getTime() + 60_000),
      } as unknown as JobDoc["matching"],
    }),
    "WORKER_RESPONSES"
  );

  it("closes the job and releases the rejected worker", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(responding as never);
    mockFindOneAndUpdate(responding);
    vi.mocked(Worker.updateOne).mockResolvedValue({ matchedCount: 1 } as never);

    const job = await customerRejectWorker("job1", "cust1", "w1", "close", NOW);

    expect(job.status).toBe("CANCELLED");
    expect(Offer.updateOne).toHaveBeenCalledWith(
      { job_id: "job1", worker_id: "w1", status: "pending" },
      expect.objectContaining({ $set: { status: "declined", expires_at: null } })
    );
    expect(Worker.updateOne).toHaveBeenCalledWith(
      { _id: "w1", active_job_id: "job1" },
      expect.objectContaining({ $set: { active_job_id: null, is_available: true } })
    );
    expect(JobEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        from_state: "WORKER_RESPONSES",
        to_state: "CANCELLED",
        actor_id: "cust1",
        actor_type: "customer",
        metadata: { worker_id: "w1", reason: "offer-rejected-close" },
      })
    );
    expect(Message.create).toHaveBeenCalledWith(
      expect.objectContaining({ sender_type: "system", content: "Counter-offer rejected — job closed" })
    );
  });

  it("returns the job to READY_TO_MATCH and clears responders when re-broadcasting", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(responding as never);
    mockFindOneAndUpdate(responding);
    vi.mocked(Worker.updateOne).mockResolvedValue({ matchedCount: 1 } as never);

    const job = await customerRejectWorker("job1", "cust1", "w1", "rebroadcast", NOW);

    expect(job.status).toBe("READY_TO_MATCH");
    expect(job.matching!.accepted_worker_ids).toEqual([]);
    expect(job.matching!.selection_deadline).toBeNull();
    expect(job.matching!.acceptance_deadline).toBeNull();
    expect(job.matching!.selected_worker_id).toBeNull();
    expect(JobEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        from_state: "WORKER_RESPONSES",
        to_state: "READY_TO_MATCH",
        metadata: { worker_id: "w1", reason: "offer-rejected-rebroadcast" },
      })
    );
    expect(Message.create).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Counter-offer rejected — re-broadcasting to more ustads" })
    );
  });

  it("rejects a worker who never responded", async () => {
    const responded = withStatus(
      { ...responding, matching: { ...responding.matching, accepted_worker_ids: ["w1"] } },
      "WORKER_RESPONSES"
    ) as unknown as JobDoc;
    vi.mocked(Job.findOne).mockResolvedValue(responded as never);
    await expect(
      customerRejectWorker("job1", "cust1", "w2", "close", NOW)
    ).rejects.toMatchObject({ code: "worker_not_responding" });
  });

  it("refuses when the job is not awaiting selection", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(withStatus(jobDoc(), "ACCEPTED") as never);
    await expect(
      customerRejectWorker("job1", "cust1", "w1", "close", NOW)
    ).rejects.toMatchObject({ code: "invalid_status" });
  });
});

describe("workerCancelJob", () => {
  const active = withStatus(
    jobDoc({
      matching: {
        ...jobDoc().matching,
        broadcast_id: "b-1",
        selected_worker_id: "w1",
      } as unknown as JobDoc["matching"],
    }),
    "EN_ROUTE"
  );

  it("cancels the job, releases the worker and raises the cancellation rate", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(active as never);
    mockFindOneAndUpdate(active);
    vi.mocked(Worker.updateOne).mockResolvedValue({ matchedCount: 1 } as never);

    const job = await workerCancelJob("job1", "w1", "vehicle breakdown");

    expect(job.status).toBe("CANCELLED");
    expect(Worker.updateOne).toHaveBeenCalledWith(
      { _id: "w1", active_job_id: "job1" },
      {
        $set: { active_job_id: null, is_available: true },
        $inc: { cancellation_rate: 1 },
        $min: { cancellation_rate: 100 },
      }
    );
    expect(JobEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        from_state: "EN_ROUTE",
        to_state: "CANCELLED",
        actor_id: "w1",
        actor_type: "worker",
        metadata: { reason: "worker-cancelled", note: "vehicle breakdown" },
      })
    );
    expect(Message.create).toHaveBeenCalledWith(
      expect.objectContaining({ sender_type: "system", content: "Job cancelled by the worker" })
    );
  });

  it("refuses to cancel from a finished status", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(
      withStatus({ ...active, status: "AWAITING_CUSTOMER_CONFIRMATION" }, "AWAITING_CUSTOMER_CONFIRMATION") as never
    );
    await expect(
      workerCancelJob("job1", "w1")
    ).rejects.toMatchObject({ code: "invalid_status" });
  });

  it("refuses a worker who is not assigned to the job", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(null);
    await expect(workerCancelJob("job1", "w2")).rejects.toMatchObject({
      code: "job_not_found",
      statusCode: 404,
    });
  });
});

describe("markExpired", () => {
  it("marks a BROADCASTING job EXPIRED when its deadline passed", async () => {
    const stale = withStatus(
      jobDoc({
        matching: { ...jobDoc().matching, acceptance_deadline: new Date(NOW.getTime() - 1000) },
      }),
      "BROADCASTING"
    ) as JobDoc;
    vi.mocked(Job.findOne).mockResolvedValue(stale as never);
    mockFindOneAndUpdate(stale);

    const job = await markExpired("job1", NOW);

    expect(job?.status).toBe("EXPIRED");
    expect(JobEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ from_state: "BROADCASTING", to_state: "EXPIRED", actor_type: "system" })
    );
  });

  it("returns null when no deadline applies", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(withStatus(jobDoc(), "READY_TO_MATCH") as never);
    await expect(markExpired("job1", NOW)).resolves.toBeNull();
  });
});

describe("FlowError", () => {
  it("carries a machine-readable code and http status", () => {
    const err = new FlowError("offer_too_low", "Offer is too low", 400);
    expect(err.code).toBe("offer_too_low");
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("Offer is too low");
  });
});

describe("workerUpdateJobStatus", () => {
  const accepted = withStatus(
    jobDoc({
      matching: {
        ...jobDoc().matching,
        broadcast_id: "b-1",
        selected_worker_id: "w1",
      } as unknown as JobDoc["matching"],
    }),
    "ACCEPTED"
  );

  it("moves an accepted job to EN_ROUTE for the assigned worker", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(accepted as never);
    mockFindOneAndUpdate(accepted);

    const job = await workerUpdateJobStatus("job1", "w1", "EN_ROUTE");

    expect(job.status).toBe("EN_ROUTE");
    expect(Job.findOne).toHaveBeenCalledWith({
      _id: "job1",
      "matching.selected_worker_id": "w1",
    });
    expect(Job.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: "job1", status: "ACCEPTED" }),
      { $set: { status: "EN_ROUTE" } },
      expect.anything()
    );
    expect(JobEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        from_state: "ACCEPTED",
        to_state: "EN_ROUTE",
        actor_id: "w1",
        actor_type: "worker",
      })
    );
  });

  it("refuses a worker who is not assigned to the job", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(null);
    await expect(
      workerUpdateJobStatus("job1", "w2", "EN_ROUTE")
    ).rejects.toMatchObject({ code: "job_not_found", statusCode: 404 });
  });

  it("refuses to skip stages or move backwards", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(accepted as never);
    await expect(
      workerUpdateJobStatus("job1", "w1", "IN_PROGRESS")
    ).rejects.toMatchObject({ code: "invalid_status" });
    await expect(
      workerUpdateJobStatus("job1", "w1", "ACCEPTED")
    ).rejects.toMatchObject({ code: "invalid_status" });
  });

  it("walks the full journey EN_ROUTE -> ARRIVED -> IN_PROGRESS -> AWAITING_CUSTOMER_CONFIRMATION", async () => {
    const withPhotos = {
      ...accepted,
      completion: {
        ...accepted.completion,
        before_photo_id: "photo-before",
        after_photo_id: "photo-after",
      },
    } as unknown as JobDoc;
    const steps: Array<[JobDoc, JobStatus]> = [
      [accepted, "EN_ROUTE"],
      [{ ...accepted, status: "EN_ROUTE" } as unknown as JobDoc, "ARRIVED"],
      [{ ...withPhotos, status: "ARRIVED" } as unknown as JobDoc, "IN_PROGRESS"],
      [{ ...withPhotos, status: "IN_PROGRESS" } as unknown as JobDoc, "AWAITING_CUSTOMER_CONFIRMATION"],
    ];
    vi.mocked(Worker.updateOne).mockResolvedValue({ matchedCount: 1, modifiedCount: 1 } as never);
    for (const [base, to] of steps) {
      vi.mocked(Job.findOne).mockResolvedValue(base as never);
      mockFindOneAndUpdate(base);
      const job = await workerUpdateJobStatus("job1", "w1", to);
      expect(job.status).toBe(to);
    }
  });

  it("requires a before photo to start work on normal jobs", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(
      { ...accepted, status: "ARRIVED" } as never
    );
    await expect(
      workerUpdateJobStatus("job1", "w1", "IN_PROGRESS")
    ).rejects.toMatchObject({ code: "before_photo_required", statusCode: 400 });
  });

  it("waives the before photo requirement for emergency jobs", async () => {
    const emergency = withStatus(
      jobDoc({
        understanding: {
          ...jobDoc().understanding,
          urgency: "emergency",
        } as JobDoc["understanding"],
        matching: {
          ...jobDoc().matching,
          selected_worker_id: "w1",
        } as unknown as JobDoc["matching"],
      }),
      "ARRIVED"
    );
    vi.mocked(Job.findOne).mockResolvedValue(emergency as never);
    mockFindOneAndUpdate(emergency);

    const job = await workerUpdateJobStatus("job1", "w1", "IN_PROGRESS");

    expect(job.status).toBe("IN_PROGRESS");
  });

  it("requires an after photo to mark the job complete", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(
      {
        ...accepted,
        status: "IN_PROGRESS",
        completion: { ...accepted.completion, before_photo_id: "photo-before" },
      } as never
    );
    await expect(
      workerUpdateJobStatus("job1", "w1", "AWAITING_CUSTOMER_CONFIRMATION")
    ).rejects.toMatchObject({ code: "after_photo_required", statusCode: 400 });
  });

  it("records a system chat message for each status change", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(accepted as never);
    mockFindOneAndUpdate(accepted);

    await workerUpdateJobStatus("job1", "w1", "EN_ROUTE");

    expect(Message.create).toHaveBeenCalledWith({
      job_id: "job1",
      sender_id: "system",
      sender_type: "system",
      content: "On the way",
    });
  });

  it("releases the worker lock when the job is marked complete", async () => {
    vi.mocked(Job.findOne).mockResolvedValue({
      ...accepted,
      status: "IN_PROGRESS",
      completion: {
        ...accepted.completion,
        before_photo_id: "photo-before",
        after_photo_id: "photo-after",
      },
    } as never);
    mockFindOneAndUpdate(accepted);
    vi.mocked(Worker.updateOne).mockResolvedValue({ matchedCount: 1, modifiedCount: 1 } as never);

    const job = await workerUpdateJobStatus(
      "job1",
      "w1",
      "AWAITING_CUSTOMER_CONFIRMATION"
    );

    expect(job.status).toBe("AWAITING_CUSTOMER_CONFIRMATION");
    expect(Worker.updateOne).toHaveBeenCalledWith(
      { _id: "w1", active_job_id: "job1" },
      { $set: { active_job_id: null, is_available: true } }
    );
  });
});

describe("workerOffer", () => {
  const broadcasting = withStatus(
    jobDoc({
      understanding: {
        ...jobDoc().understanding,
        category: "electrician",
        urgency: "normal",
      } as JobDoc["understanding"],
      pricing: { ...jobDoc().pricing, customer_offer: 2000 },
      matching: {
        ...jobDoc().matching,
        broadcast_id: "b-1",
        acceptance_deadline: new Date(NOW.getTime() + 5 * 60_000),
      } as unknown as JobDoc["matching"],
    }),
    "BROADCASTING"
  );

  it("accepts a job and records the offer for the customer", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(broadcasting as never);
    mockFindOneAndUpdate(broadcasting);
    vi.mocked(Worker.updateOne).mockResolvedValue({
      matchedCount: 1,
      modifiedCount: 1,
    } as never);
    vi.mocked(Offer.create).mockImplementation((doc) =>
      Promise.resolve(doc as never)
    );

    const result = await workerOffer("job1", "w1", { type: "accept" }, NOW);

    expect(result.job.status).toBe("WORKER_RESPONSES");
    expect(Offer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        job_id: "job1",
        worker_id: "w1",
        type: "accept",
        offered_price: 2000,
        status: "pending",
        expires_at: new Date(NOW.getTime() + 5 * 60_000),
      })
    );
  });

  it("records a counter offer and moves the job into negotiable responses", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(broadcasting as never);
    mockFindOneAndUpdate(broadcasting);
    vi.mocked(Worker.updateOne).mockResolvedValue({
      matchedCount: 1,
      modifiedCount: 1,
    } as never);
    vi.mocked(Offer.create).mockImplementation((doc) =>
      Promise.resolve(doc as never)
    );

    const result = await workerOffer(
      "job1",
      "w1",
      { type: "counter_offer", counter_price: 2500, message: "Extra parts" },
      NOW
    );

    expect(result.job.status).toBe("WORKER_RESPONSES");
    expect(result.job.pricing!.worker_counter_offer).toBe(2500);
    expect(Offer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        job_id: "job1",
        worker_id: "w1",
        type: "counter_offer",
        counter_price: 2500,
        offered_price: 2000,
        status: "pending",
        message: "Extra parts",
      })
    );
    expect(JobEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        from_state: "BROADCASTING",
        to_state: "WORKER_RESPONSES",
        actor_id: "w1",
        actor_type: "worker",
        metadata: { reason: "counter-offer", urgency: "normal", broadcast_id: "b-1" },
      })
    );
  });

  it("rejects a counter outside the negotiation band", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(broadcasting as never);
    await expect(
      workerOffer("job1", "w1", { type: "counter_offer", counter_price: 900 }, NOW)
    ).rejects.toMatchObject({ code: "counter_too_low", statusCode: 400 });
    expect(Offer.create).not.toHaveBeenCalled();
  });

  it("records a decline without claiming the job", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(broadcasting as never);
    vi.mocked(Offer.create).mockImplementation((doc) =>
      Promise.resolve(doc as never)
    );

    const result = await workerOffer(
      "job1",
      "w1",
      { type: "decline", message: "Too far" },
      NOW
    );

    expect(result.job.status).toBe("BROADCASTING");
    expect(result.offer.type).toBe("decline");
    expect(Offer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "decline",
        status: "declined",
        message: "Too far",
      })
    );
    expect(Worker.updateOne).not.toHaveBeenCalled();
  });
});

describe("customerSelectWorker with counter offers", () => {
  const responding = withStatus(
    jobDoc({
      pricing: { ...jobDoc().pricing, customer_offer: 2000 },
      matching: {
        ...jobDoc().matching,
        broadcast_id: "b-1",
        accepted_worker_ids: ["w1", "w2"],
        selection_deadline: new Date(NOW.getTime() + 60_000),
      } as unknown as JobDoc["matching"],
    }),
    "WORKER_RESPONSES"
  );

  it("settles the selected worker's counter as the agreed price", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(responding as never);
    vi.mocked(Offer.findOne).mockResolvedValue({
      _id: "offer1",
      type: "counter_offer",
      counter_price: 2500,
      status: "pending",
    } as never);
    mockFindOneAndUpdate(responding);
    vi.mocked(Worker.updateOne).mockResolvedValue({
      matchedCount: 1,
      modifiedCount: 1,
    } as never);
    vi.mocked(Worker.updateMany).mockResolvedValue({ modifiedCount: 1 } as never);
    vi.mocked(Offer.updateMany).mockResolvedValue({ modifiedCount: 1 } as never);

    const job = await customerSelectWorker("job1", "cust1", "w1", NOW);

    expect(job.status).toBe("ACCEPTED");
    expect(job.pricing!.final_price).toBe(2500);
    expect(job.pricing!.status).toBe("agreed");
    expect(Offer.updateOne).toHaveBeenCalledWith(
      { job_id: "job1", worker_id: "w1", status: "pending" },
      expect.objectContaining({ $set: { status: "selected", expires_at: null } })
    );
    expect(Offer.updateMany).toHaveBeenCalledWith(
      { job_id: "job1", worker_id: { $in: ["w2"] }, status: "pending" },
      expect.objectContaining({
        $set: expect.objectContaining({ status: "declined" }),
      })
    );
  });

  it("applies the customer offer when the worker sent no counter", async () => {
    vi.mocked(Job.findOne).mockResolvedValue(responding as never);
    vi.mocked(Offer.findOne).mockResolvedValue(null);
    mockFindOneAndUpdate(responding);
    vi.mocked(Worker.updateOne).mockResolvedValue({
      matchedCount: 1,
      modifiedCount: 1,
    } as never);
    vi.mocked(Worker.updateMany).mockResolvedValue({ modifiedCount: 1 } as never);

    const job = await customerSelectWorker("job1", "cust1", "w1", NOW);

    expect(job.pricing!.final_price).toBe(2000);
    expect(job.pricing!.status).toBe("agreed");
    expect(Offer.updateOne).not.toHaveBeenCalled();
  });
});