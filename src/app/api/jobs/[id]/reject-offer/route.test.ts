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
    customerRejectWorker: vi.fn(),
  };
});

import { requireRole } from "@/lib/auth";
import { FlowError, customerRejectWorker } from "@/lib/job/flow";
import { POST } from "./route";

const CUSTOMER_SESSION = {
  user: { _id: "cust1", role: "customer" as const },
  token: "token-1",
};

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/jobs/job-1/reject-offer", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(CUSTOMER_SESSION as never);
  vi.mocked(customerRejectWorker).mockResolvedValue({
    _id: "job-1",
    status: "READY_TO_MATCH",
  } as never);
});

describe("POST /api/jobs/[id]/reject-offer", () => {
  it("requires the customer role", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("AUTH_REQUIRED"));
    const res = await POST(request({ worker_id: "w1" }), { params: { id: "job-1" } });
    expect(res.status).toBe(401);
  });

  it("forbids a worker session", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("ROLE_FORBIDDEN"));
    const res = await POST(request({ worker_id: "w1" }), { params: { id: "job-1" } });
    expect(res.status).toBe(403);
  });

  it("closes the job by default when a worker is rejected", async () => {
    const res = await POST(request({ worker_id: "w1" }), { params: { id: "job-1" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("READY_TO_MATCH");
    expect(customerRejectWorker).toHaveBeenCalledWith("job-1", "cust1", "w1", undefined);
  });

  it("re-broadcasts the job when action is rebroadcast", async () => {
    const res = await POST(request({ worker_id: "w1", action: "rebroadcast" }), {
      params: { id: "job-1" },
    });
    expect(res.status).toBe(200);
    expect(customerRejectWorker).toHaveBeenCalledWith("job-1", "cust1", "w1", "rebroadcast");
  });

  it("requires a worker_id in the body", async () => {
    const res = await POST(request({}), { params: { id: "job-1" } });
    expect(res.status).toBe(400);
    expect(customerRejectWorker).not.toHaveBeenCalled();
  });

  it("rejects an unknown action", async () => {
    const res = await POST(request({ worker_id: "w1", action: "explode" }), {
      params: { id: "job-1" },
    });
    expect(res.status).toBe(400);
    expect(customerRejectWorker).not.toHaveBeenCalled();
  });

  it("maps a FlowError to its HTTP status", async () => {
    vi.mocked(customerRejectWorker).mockRejectedValue(
      new FlowError("worker_not_responding", "Worker did not respond to this job", 403)
    );
    const res = await POST(request({ worker_id: "w9" }), { params: { id: "job-1" } });
    expect(res.status).toBe(403);
  });

  it("returns 500 for unexpected errors", async () => {
    vi.mocked(customerRejectWorker).mockRejectedValue(new Error("boom"));
    const res = await POST(request({ worker_id: "w1" }), { params: { id: "job-1" } });
    expect(res.status).toBe(500);
  });
});