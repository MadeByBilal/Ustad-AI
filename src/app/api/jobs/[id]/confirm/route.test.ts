import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/server/lib/auth", () => ({ requireRole: vi.fn() }));
vi.mock("@/server/lib/job/flow", () => {
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

import { requireRole } from "@/server/lib/auth";
import { confirmJobDetails, FlowError } from "@/server/lib/job/flow";
import { POST } from "./route";

const CUSTOMER_SESSION = {
  user: { _id: "cust1", role: "customer" as const },
  token: "token-1",
};

function request(): NextRequest {
  return new NextRequest("http://localhost/api/jobs/job-1/confirm", { method: "POST" });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(CUSTOMER_SESSION as never);
  vi.mocked(confirmJobDetails).mockResolvedValue({
    _id: "job-1",
    status: "READY_TO_MATCH",
  } as never);
});

describe("POST /api/jobs/[id]/confirm", () => {
  it("requires the customer role", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("AUTH_REQUIRED"));
    const res = await POST(request(), { params: { id: "job-1" } });
    expect(res.status).toBe(401);
  });

  it("forbids a worker session", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("ROLE_FORBIDDEN"));
    const res = await POST(request(), { params: { id: "job-1" } });
    expect(res.status).toBe(403);
  });

  it("confirms the job summary for the session customer", async () => {
    const res = await POST(request(), { params: { id: "job-1" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("READY_TO_MATCH");
    expect(confirmJobDetails).toHaveBeenCalledWith("job-1", "cust1");
  });

  it("maps a FlowError to its HTTP status", async () => {
    vi.mocked(confirmJobDetails).mockRejectedValue(
      new FlowError("invalid_status", "Job cannot move", 409)
    );
    const res = await POST(request(), { params: { id: "job-1" } });
    expect(res.status).toBe(409);
  });

  it("returns 500 for unexpected errors", async () => {
    vi.mocked(confirmJobDetails).mockRejectedValue(new Error("boom"));
    const res = await POST(request(), { params: { id: "job-1" } });
    expect(res.status).toBe(500);
  });
});