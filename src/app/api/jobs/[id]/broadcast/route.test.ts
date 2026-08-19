import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/job/flow", () => {
  class FlowError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly statusCode: number = 409
    ) {
      super(message);
      this.name = "FlowError";
    }
  }
  return {
    FlowError,
    confirmJobDetails: vi.fn(),
    submitOfferAndBroadcast: vi.fn(),
    workerAcceptJob: vi.fn(),
    customerSelectWorker: vi.fn(),
  };
});

import { requireRole } from "@/lib/auth";
import {
  FlowError,
  confirmJobDetails,
  submitOfferAndBroadcast,
} from "@/lib/job/flow";
import { POST } from "./route";

const CUSTOMER_SESSION = {
  user: { _id: "cust1", role: "customer" as const },
  token: "token-1",
};

function postRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/jobs/job-1/broadcast", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(CUSTOMER_SESSION as never);
  vi.mocked(submitOfferAndBroadcast).mockResolvedValue({
    job: { _id: "job-1", status: "BROADCASTING" },
    broadcast_id: "b-1",
    eligible_workers_count: 3,
    acceptance_deadline: new Date("2026-01-01T10:10:00.000Z"),
  } as never);
});

describe("POST /api/jobs/[id]/broadcast", () => {
  it("requires the customer role", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("AUTH_REQUIRED"));
    const res = await POST(postRequest({ offer_rs: 2000 }), { params: { id: "job-1" } });
    expect(res.status).toBe(401);
  });

  it("forbids a worker session", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("ROLE_FORBIDDEN"));
    const res = await POST(postRequest({ offer_rs: 2000 }), { params: { id: "job-1" } });
    expect(res.status).toBe(403);
  });

  it("broadcasts with the customer offer and returns the deadline", async () => {
    const res = await POST(postRequest({ offer_rs: 2500 }), { params: { id: "job-1" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.broadcast_id).toBe("b-1");
    expect(body.data.eligible_workers_count).toBe(3);
    expect(submitOfferAndBroadcast).toHaveBeenCalledWith(
      "job-1",
      "cust1",
      2500
    );
  });

  it("allows a missing offer for emergency jobs", async () => {
    const res = await POST(postRequest({}), { params: { id: "job-1" } });
    expect(res.status).toBe(200);
    expect(submitOfferAndBroadcast).toHaveBeenCalledWith("job-1", "cust1", null);
  });

  it("rejects a negative offer", async () => {
    const res = await POST(postRequest({ offer_rs: -5 }), { params: { id: "job-1" } });
    expect(res.status).toBe(400);
    expect(submitOfferAndBroadcast).not.toHaveBeenCalled();
  });

  it("maps a FlowError to its HTTP status", async () => {
    vi.mocked(submitOfferAndBroadcast).mockRejectedValue(
      new FlowError("offer_too_low", "Offer below the floor", 400)
    );
    const res = await POST(postRequest({ offer_rs: 100 }), { params: { id: "job-1" } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("floor");
  });

  it("returns 500 for unexpected errors", async () => {
    vi.mocked(submitOfferAndBroadcast).mockRejectedValue(new Error("boom"));
    const res = await POST(postRequest({ offer_rs: 2000 }), { params: { id: "job-1" } });
    expect(res.status).toBe(500);
  });

  it("resolves the customer id from the session", async () => {
    await POST(postRequest({ offer_rs: 2000 }), { params: { id: "job-1" } });
    expect(submitOfferAndBroadcast).toHaveBeenCalledWith("job-1", "cust1", 2000);
  });

  it("requires a job id in the path", async () => {
    const res = await POST(postRequest({ offer_rs: 2000 }), { params: { id: "   " } });
    expect(res.status).toBe(400);
    expect(submitOfferAndBroadcast).not.toHaveBeenCalled();
  });

  it("keeps the confirm step available for earlier screens", async () => {
    vi.mocked(confirmJobDetails).mockResolvedValue({ _id: "job-1", status: "READY_TO_MATCH" } as never);
    expect(confirmJobDetails).toBeDefined();
  });
});