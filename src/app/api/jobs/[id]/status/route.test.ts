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
    workerUpdateJobStatus: vi.fn(),
  };
});
vi.mock("@/server/models", () => ({ Worker: { findOne: vi.fn() } }));

import { requireRole } from "@/server/lib/auth";
import { FlowError, workerUpdateJobStatus } from "@/server/lib/job/flow";
import { Worker } from "@/server/models";
import { POST } from "./route";

const WORKER_SESSION = {
  user: { _id: "user-1", role: "worker" as const },
  token: "token-1",
};

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/jobs/job-1/status", {
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
  vi.mocked(workerUpdateJobStatus).mockResolvedValue({
    _id: "job-1",
    status: "EN_ROUTE",
  } as never);
});

describe("POST /api/jobs/[id]/status", () => {
  it("requires the worker role", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("AUTH_REQUIRED"));
    const res = await POST(request({ status: "EN_ROUTE" }), {
      params: { id: "job-1" },
    });
    expect(res.status).toBe(401);
  });

  it("forbids a customer session", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("ROLE_FORBIDDEN"));
    const res = await POST(request({ status: "EN_ROUTE" }), {
      params: { id: "job-1" },
    });
    expect(res.status).toBe(403);
  });

  it("rejects an unknown status", async () => {
    const res = await POST(request({ status: "TELEPORTING" }), {
      params: { id: "job-1" },
    });
    expect(res.status).toBe(400);
  });

  it("rejects a status outside the worker journey", async () => {
    const res = await POST(request({ status: "DRAFT" }), {
      params: { id: "job-1" },
    });
    expect(res.status).toBe(400);
  });

  it("resolves the worker profile and advances the job", async () => {
    const res = await POST(request({ status: "EN_ROUTE", note: "On my way" }), {
      params: { id: "job-1" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("EN_ROUTE");
    expect(Worker.findOne).toHaveBeenCalledWith({ user_id: "user-1" });
    expect(workerUpdateJobStatus).toHaveBeenCalledWith(
      "job-1",
      "worker-profile-1",
      "EN_ROUTE",
      "On my way"
    );
  });

  it("returns 404 when the session user has no worker profile", async () => {
    vi.mocked(Worker.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as never);
    const res = await POST(request({ status: "EN_ROUTE" }), {
      params: { id: "job-1" },
    });
    expect(res.status).toBe(404);
    expect(workerUpdateJobStatus).not.toHaveBeenCalled();
  });

  it("maps a FlowError to its HTTP status", async () => {
    vi.mocked(workerUpdateJobStatus).mockRejectedValue(
      new FlowError("invalid_status", "Job cannot move", 409)
    );
    const res = await POST(request({ status: "EN_ROUTE" }), {
      params: { id: "job-1" },
    });
    expect(res.status).toBe(409);
  });

  it("returns 500 for unexpected errors", async () => {
    vi.mocked(workerUpdateJobStatus).mockRejectedValue(new Error("boom"));
    const res = await POST(request({ status: "EN_ROUTE" }), {
      params: { id: "job-1" },
    });
    expect(res.status).toBe(500);
  });
});