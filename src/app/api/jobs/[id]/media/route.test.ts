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
  return { FlowError, workerAttachPhoto: vi.fn() };
});
vi.mock("@/models", () => ({ Worker: { findOne: vi.fn() } }));

import { requireRole } from "@/lib/auth";
import { FlowError, workerAttachPhoto } from "@/lib/job/flow";
import { Worker } from "@/models";
import { POST } from "./route";

const WORKER_SESSION = {
  user: { _id: "user-1", role: "worker" as const },
  token: "token-1",
};

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/jobs/job-1/media", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(WORKER_SESSION as never);
  vi.mocked(Worker.findOne).mockReturnValue({
    lean: vi.fn().mockResolvedValue({ _id: "worker-1" }),
  } as never);
  vi.mocked(workerAttachPhoto).mockResolvedValue({
    _id: "job-1",
    completion: { before_photo_id: "photo-9", after_photo_id: null },
  } as never);
});

describe("POST /api/jobs/:id/media", () => {
  it("requires the worker role", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("AUTH_REQUIRED"));
    const res = await POST(request({ type: "before", photo_id: "photo-9" }), {
      params: { id: "job-1" },
    });
    expect(res.status).toBe(401);
  });

  it("rejects a job id that is missing", async () => {
    const res = await POST(request({ type: "before", photo_id: "photo-9" }), {
      params: { id: "  " },
    });
    expect(res.status).toBe(400);
  });

  it("rejects an unknown media type", async () => {
    const res = await POST(request({ type: "during", photo_id: "photo-9" }), {
      params: { id: "job-1" },
    });
    expect(res.status).toBe(400);
    expect(workerAttachPhoto).not.toHaveBeenCalled();
  });

  it("requires a photo id", async () => {
    const res = await POST(request({ type: "before" }), {
      params: { id: "job-1" },
    });
    expect(res.status).toBe(400);
  });

  it("attaches a before photo with a work note", async () => {
    const res = await POST(
      request({ type: "before", photo_id: "photo-9", note: "Replaced faucet washer" }),
      { params: { id: "job-1" } }
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.completion.before_photo_id).toBe("photo-9");
    expect(Worker.findOne).toHaveBeenCalledWith({ user_id: "user-1" });
    expect(workerAttachPhoto).toHaveBeenCalledWith(
      "job-1",
      "worker-1",
      { type: "before", photo_id: "photo-9", note: "Replaced faucet washer" }
    );
  });

  it("returns 404 when the session user has no worker profile", async () => {
    vi.mocked(Worker.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as never);
    const res = await POST(request({ type: "before", photo_id: "photo-9" }), {
      params: { id: "job-1" },
    });
    expect(res.status).toBe(404);
  });

  it("maps a FlowError to its HTTP status", async () => {
    vi.mocked(workerAttachPhoto).mockRejectedValue(
      new FlowError("invalid_status", "Photos can only be attached to an active job", 409)
    );
    const res = await POST(request({ type: "after", photo_id: "photo-9" }), {
      params: { id: "job-1" },
    });
    expect(res.status).toBe(409);
  });

  it("returns 500 for unexpected errors", async () => {
    vi.mocked(workerAttachPhoto).mockRejectedValue(new Error("boom"));
    const res = await POST(request({ type: "after", photo_id: "photo-9" }), {
      params: { id: "job-1" },
    });
    expect(res.status).toBe(500);
  });
});