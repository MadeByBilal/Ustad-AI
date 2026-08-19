import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/mongodb", () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));
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
    workerOffer: vi.fn(),
  };
});
vi.mock("@/models", () => ({ Worker: { findOne: vi.fn() } }));

import { requireRole } from "@/lib/auth";
import { FlowError, workerOffer } from "@/lib/job/flow";
import { Worker } from "@/models";
import { POST } from "./route";

const WORKER_SESSION = {
  user: { _id: "user-1", role: "worker" as const },
  token: "token-1",
};

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/offers", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(WORKER_SESSION as never);
  vi.mocked(Worker.findOne).mockReturnValue({
    lean: vi.fn().mockResolvedValue({ _id: "worker-profile-1" }),
  } as never);
  vi.mocked(workerOffer).mockResolvedValue({
    job: { _id: "job-1", status: "WORKER_RESPONSES" },
    offer: { _id: "offer-1", type: "counter_offer" },
  } as never);
});

describe("POST /api/offers", () => {
  it("requires the worker role", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("AUTH_REQUIRED"));
    const res = await POST(request({ job_id: "job-1", type: "accept" }));
    expect(res.status).toBe(401);
  });

  it("forbids a customer session", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("ROLE_FORBIDDEN"));
    const res = await POST(request({ job_id: "job-1", type: "accept" }));
    expect(res.status).toBe(403);
  });

  it("rejects an unknown offer type", async () => {
    const res = await POST(request({ job_id: "job-1", type: "maybe" }));
    expect(res.status).toBe(400);
  });

  it("requires a counter price on counter offers", async () => {
    const res = await POST(request({ job_id: "job-1", type: "counter_offer" }));
    expect(res.status).toBe(400);
  });

  it("rejects a non-positive counter price", async () => {
    const res = await POST(
      request({ job_id: "job-1", type: "counter_offer", counter_price: -50 })
    );
    expect(res.status).toBe(400);
  });

  it("resolves the worker profile and submits the offer", async () => {
    const res = await POST(
      request({
        job_id: "job-1",
        type: "counter_offer",
        counter_price: 2500,
        message: "Extra parts",
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.offer.type).toBe("counter_offer");
    expect(Worker.findOne).toHaveBeenCalledWith({ user_id: "user-1" });
    expect(workerOffer).toHaveBeenCalledWith(
      "job-1",
      "worker-profile-1",
      { type: "counter_offer", counter_price: 2500, message: "Extra parts" },
      expect.any(Date)
    );
  });

  it("returns 404 when the session user has no worker profile", async () => {
    vi.mocked(Worker.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as never);
    const res = await POST(request({ job_id: "job-1", type: "accept" }));
    expect(res.status).toBe(404);
    expect(workerOffer).not.toHaveBeenCalled();
  });

  it("maps a FlowError to its HTTP status", async () => {
    vi.mocked(workerOffer).mockRejectedValue(
      new FlowError("acceptance_window_closed", "Acceptance window has closed", 410)
    );
    const res = await POST(request({ job_id: "job-1", type: "accept" }));
    expect(res.status).toBe(410);
  });

  it("returns 500 for unexpected errors", async () => {
    vi.mocked(workerOffer).mockRejectedValue(new Error("boom"));
    const res = await POST(request({ job_id: "job-1", type: "accept" }));
    expect(res.status).toBe(500);
  });
});