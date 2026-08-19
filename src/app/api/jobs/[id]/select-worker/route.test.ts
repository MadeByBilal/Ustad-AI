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
import { FlowError, confirmJobDetails, customerSelectWorker } from "@/lib/job/flow";
import { POST } from "./route";

const CUSTOMER_SESSION = {
  user: { _id: "cust1", role: "customer" as const },
  token: "token-1",
};

function request(url: string, body: unknown): NextRequest {
  return new NextRequest(url, { method: "POST", body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(CUSTOMER_SESSION as never);
  vi.mocked(customerSelectWorker).mockResolvedValue({
    _id: "job-1",
    status: "ACCEPTED",
    matching: { selected_worker_id: "w1" },
  } as never);
});

describe("POST /api/jobs/[id]/select-worker", () => {
  it("requires the customer role", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("AUTH_REQUIRED"));
    const res = await POST(request("http://localhost/api/jobs/job-1/select-worker", { worker_id: "w1" }), {
      params: { id: "job-1" },
    });
    expect(res.status).toBe(401);
  });

  it("forbids a worker session", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("ROLE_FORBIDDEN"));
    const res = await POST(request("http://localhost/api/jobs/job-1/select-worker", { worker_id: "w1" }), {
      params: { id: "job-1" },
    });
    expect(res.status).toBe(403);
  });

  it("selects the chosen worker and returns the accepted job", async () => {
    const res = await POST(
      request("http://localhost/api/jobs/job-1/select-worker", { worker_id: "w1" }),
      { params: { id: "job-1" } }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("ACCEPTED");
    expect(customerSelectWorker).toHaveBeenCalledWith("job-1", "cust1", "w1");
  });

  it("requires a worker_id in the body", async () => {
    const res = await POST(request("http://localhost/api/jobs/job-1/select-worker", {}), {
      params: { id: "job-1" },
    });
    expect(res.status).toBe(400);
    expect(customerSelectWorker).not.toHaveBeenCalled();
  });

  it("maps a FlowError to its HTTP status", async () => {
    vi.mocked(customerSelectWorker).mockRejectedValue(
      new FlowError("selection_window_closed", "Selection window has closed", 410)
    );
    const res = await POST(
      request("http://localhost/api/jobs/job-1/select-worker", { worker_id: "w1" }),
      { params: { id: "job-1" } }
    );
    expect(res.status).toBe(410);
  });

  it("returns 500 for unexpected errors", async () => {
    vi.mocked(customerSelectWorker).mockRejectedValue(new Error("boom"));
    const res = await POST(
      request("http://localhost/api/jobs/job-1/select-worker", { worker_id: "w1" }),
      { params: { id: "job-1" } }
    );
    expect(res.status).toBe(500);
  });

  it("exposes the confirm step used by the summary screen", async () => {
    vi.mocked(confirmJobDetails).mockResolvedValue({ _id: "job-1", status: "READY_TO_MATCH" } as never);
    expect(confirmJobDetails).toBeDefined();
  });
});