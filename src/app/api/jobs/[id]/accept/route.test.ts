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
vi.mock("@/models", () => ({ Worker: { findOne: vi.fn() } }));

import { requireRole } from "@/lib/auth";
import { FlowError, workerAcceptJob } from "@/lib/job/flow";
import { Worker } from "@/models";
import { POST } from "./route";

const WORKER_SESSION = {
  user: { _id: "user-1", role: "worker" as const },
  token: "token-1",
};

function request(): NextRequest {
  return new NextRequest("http://localhost/api/jobs/job-1/accept", { method: "POST" });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(WORKER_SESSION as never);
  vi.mocked(Worker.findOne).mockReturnValue({
  lean: vi.fn().mockResolvedValue({ _id: "worker-profile-1" }),
} as never);
  vi.mocked(workerAcceptJob).mockResolvedValue({
    _id: "job-1",
    status: "WORKER_RESPONSES",
  } as never);
});

describe("POST /api/jobs/[id]/accept", () => {
  it("requires the worker role", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("AUTH_REQUIRED"));
    const res = await POST(request(), { params: { id: "job-1" } });
    expect(res.status).toBe(401);
  });

  it("forbids a customer session", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("ROLE_FORBIDDEN"));
    const res = await POST(request(), { params: { id: "job-1" } });
    expect(res.status).toBe(403);
  });

  it("resolves the worker profile then accepts the job", async () => {
    const res = await POST(request(), { params: { id: "job-1" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("WORKER_RESPONSES");
    expect(Worker.findOne).toHaveBeenCalledWith({ user_id: "user-1" });
    expect(workerAcceptJob).toHaveBeenCalledWith("job-1", "worker-profile-1");
  });

  it("returns 404 when the session user has no worker profile", async () => {
    vi.mocked(Worker.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as never);
    const res = await POST(request(), { params: { id: "job-1" } });
    expect(res.status).toBe(404);
    expect(workerAcceptJob).not.toHaveBeenCalled();
  });

  it("maps a FlowError to its HTTP status", async () => {
    vi.mocked(workerAcceptJob).mockRejectedValue(
      new FlowError("acceptance_window_closed", "Acceptance window has closed", 410)
    );
    const res = await POST(request(), { params: { id: "job-1" } });
    expect(res.status).toBe(410);
  });

  it("returns 500 for unexpected errors", async () => {
    vi.mocked(workerAcceptJob).mockRejectedValue(new Error("boom"));
    const res = await POST(request(), { params: { id: "job-1" } });
    expect(res.status).toBe(500);
  });
});