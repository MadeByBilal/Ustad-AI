import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/server/lib/auth", () => ({ requireRole: vi.fn() }));
vi.mock("@/server/lib/mongodb", () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));
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
    workerCancelJob: vi.fn(),
  };
});
vi.mock("@/server/models", () => ({ Worker: { findOne: vi.fn() } }));

import { requireRole } from "@/server/lib/auth";
import { FlowError, workerCancelJob } from "@/server/lib/job/flow";
import { Worker } from "@/server/models";
import { POST } from "./route";

const WORKER_SESSION = {
  user: { _id: "user-1", role: "worker" as const },
  token: "token-1",
};

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/jobs/job-1/cancel", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(WORKER_SESSION as never);
  vi.mocked(Worker.findOne).mockReturnValue({
    lean: vi.fn().mockResolvedValue({ _id: "w1" }),
  } as never);
  vi.mocked(workerCancelJob).mockResolvedValue({
    _id: "job-1",
    status: "CANCELLED",
  } as never);
});

describe("POST /api/jobs/[id]/cancel", () => {
  it("requires the worker role", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("AUTH_REQUIRED"));
    const res = await POST(request({}), { params: { id: "job-1" } });
    expect(res.status).toBe(401);
  });

  it("forbids a customer session", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("ROLE_FORBIDDEN"));
    const res = await POST(request({}), { params: { id: "job-1" } });
    expect(res.status).toBe(403);
  });

  it("cancels the job from the session worker profile", async () => {
    const res = await POST(request({ reason: "vehicle breakdown" }), {
      params: { id: "job-1" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("CANCELLED");
    expect(Worker.findOne).toHaveBeenCalledWith({ user_id: "user-1" });
    expect(workerCancelJob).toHaveBeenCalledWith("job-1", "w1", "vehicle breakdown");
  });

  it("cancels without a reason too", async () => {
    const res = await POST(request({}), { params: { id: "job-1" } });
    expect(res.status).toBe(200);
    expect(workerCancelJob).toHaveBeenCalledWith("job-1", "w1", undefined);
  });

  it("returns 404 when the worker profile is missing", async () => {
    vi.mocked(Worker.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as never);
    const res = await POST(request({}), { params: { id: "job-1" } });
    expect(res.status).toBe(404);
    expect(workerCancelJob).not.toHaveBeenCalled();
  });

  it("maps a FlowError to its HTTP status", async () => {
    vi.mocked(workerCancelJob).mockRejectedValue(
      new FlowError("invalid_status", "Job cannot be cancelled from COMPLETED", 409)
    );
    const res = await POST(request({}), { params: { id: "job-1" } });
    expect(res.status).toBe(409);
  });

  it("returns 500 for unexpected errors", async () => {
    vi.mocked(workerCancelJob).mockRejectedValue(new Error("boom"));
    const res = await POST(request({}), { params: { id: "job-1" } });
    expect(res.status).toBe(500);
  });
});