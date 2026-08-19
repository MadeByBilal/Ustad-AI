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
    workerUploadJobMedia: vi.fn(),
  };
});
vi.mock("@/models", () => ({
  Worker: { findOne: vi.fn() },
  Upload: { create: vi.fn() },
}));

import { requireRole } from "@/lib/auth";
import { FlowError, workerUploadJobMedia } from "@/lib/job/flow";
import { Worker, Upload } from "@/models";
import { POST } from "./route";

const WORKER_SESSION = {
  user: { _id: "user-1", role: "worker" as const },
  token: "token-1",
};

const UPLOAD_ID = "upload-1";

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
    lean: vi.fn().mockResolvedValue({ _id: "worker-profile-1" }),
  } as never);
  vi.mocked(Upload.create).mockResolvedValue({
    _id: UPLOAD_ID,
    mime: "image/jpeg",
    size: 12345,
    data: Buffer.from("test"),
  } as never);
  vi.mocked(workerUploadJobMedia).mockResolvedValue({
    _id: "job-1",
    status: "IN_PROGRESS",
    completion: { before_photo_id: UPLOAD_ID },
  } as never);
});

describe("POST /api/jobs/:id/media", () => {
  it("requires the worker role", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("AUTH_REQUIRED"));
    const res = await POST(request({ type: "before", mime: "image/jpeg", data: "aGVsbG8=" }), { params: { id: "job-1" } });
    expect(res.status).toBe(401);
  });

  it("forbids a customer session", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("ROLE_FORBIDDEN"));
    const res = await POST(request({ type: "before", mime: "image/jpeg", data: "aGVsbG8=" }), { params: { id: "job-1" } });
    expect(res.status).toBe(403);
  });

  it("requires a valid job id", async () => {
    const res = await POST(request({ type: "before", mime: "image/jpeg", data: "aGVsbG8=" }), { params: { id: "" } });
    expect(res.status).toBe(400);
  });

  it("requires type to be before or after", async () => {
    const res = await POST(request({ type: "middle", mime: "image/jpeg", data: "aGVsbG8=" }), { params: { id: "job-1" } });
    expect(res.status).toBe(400);
  });

  it("requires valid base64 image data", async () => {
    const res = await POST(request({ type: "before", mime: "image/jpeg", data: "not-base64!" }), { params: { id: "job-1" } });
    expect(res.status).toBe(400);
  });

  it("rejects images over 2MB", async () => {
    const bigBase64 = "a".repeat(3_000_000);
    const res = await POST(request({ type: "before", mime: "image/jpeg", data: bigBase64 }), { params: { id: "job-1" } });
    expect(res.status).toBe(400);
  });

  it("uploads the photo, stores it, and attaches to the job", async () => {
    const res = await POST(request({ type: "before", mime: "image/jpeg", data: "aGVsbG8=", note: "Replaced washer" }), { params: { id: "job-1" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.completion.before_photo_id).toBe(UPLOAD_ID);

    expect(Worker.findOne).toHaveBeenCalledWith({ user_id: "user-1" });
    expect(Upload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: "user-1",
        mime: "image/jpeg",
      })
    );
    expect(workerUploadJobMedia).toHaveBeenCalledWith(
      "job-1",
      "worker-profile-1",
      { type: "before", photo_id: UPLOAD_ID, note: "Replaced washer" }
    );
  });

  it("returns 404 when the session user has no worker profile", async () => {
    vi.mocked(Worker.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as never);
    const res = await POST(request({ type: "before", mime: "image/jpeg", data: "aGVsbG8=" }), { params: { id: "job-1" } });
    expect(res.status).toBe(404);
    expect(workerUploadJobMedia).not.toHaveBeenCalled();
  });

  it("maps FlowError to HTTP status", async () => {
    vi.mocked(workerUploadJobMedia).mockRejectedValue(
      new FlowError("job_not_found", "Job not found", 404)
    );
    const res = await POST(request({ type: "before", mime: "image/jpeg", data: "aGVsbG8=" }), { params: { id: "job-1" } });
    expect(res.status).toBe(404);
  });

  it("returns 500 for unexpected errors", async () => {
    vi.mocked(workerUploadJobMedia).mockRejectedValue(new Error("boom"));
    const res = await POST(request({ type: "before", mime: "image/jpeg", data: "aGVsbG8=" }), { params: { id: "job-1" } });
    expect(res.status).toBe(500);
  });
});