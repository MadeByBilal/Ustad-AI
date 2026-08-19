import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/mongodb", () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/models", () => ({
  Upload: { create: vi.fn() },
}));

import { requireRole } from "@/lib/auth";
import { Upload } from "@/models";
import { POST } from "./route";

const CUSTOMER_SESSION = {
  user: { _id: "cust1", role: "customer" as const },
  token: "token-1",
};

const WORKER_SESSION = {
  user: { _id: "work1", role: "worker" as const },
  token: "token-2",
};

const JPEG_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

function photoRequest(jpeg: Buffer, mime = "image/jpeg"): NextRequest {
  return new NextRequest("http://localhost/api/jobs/photos", {
    method: "POST",
    body: JSON.stringify({ mime, data: jpeg.toString("base64") }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(CUSTOMER_SESSION as never);
  vi.mocked(Upload.create).mockResolvedValue({ _id: "photo-1" } as never);
});

describe("POST /api/jobs/photos", () => {
  it("requires the customer role", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("AUTH_REQUIRED"));
    const res = await POST(photoRequest(JPEG_PNG));
    expect(res.status).toBe(401);
  });

  it("forbids a worker session", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("ROLE_FORBIDDEN"));
    const res = await POST(photoRequest(JPEG_PNG));
    expect(res.status).toBe(403);
  });

  it("stores a valid jpeg and returns its id", async () => {
    const res = await POST(photoRequest(JPEG_PNG));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.photo_id).toBe("photo-1");
    expect(Upload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: "cust1",
        mime: "image/jpeg",
        size: JPEG_PNG.length,
      })
    );
  });

  it("accepts a png", async () => {
    const res = await POST(photoRequest(JPEG_PNG, "image/png"));
    expect(res.status).toBe(201);
  });

  it("rejects a non-image mime", async () => {
    const res = await POST(photoRequest(JPEG_PNG, "text/html"));
    expect(res.status).toBe(400);
    expect(Upload.create).not.toHaveBeenCalled();
  });

  it("rejects invalid base64 data", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/jobs/photos", {
        method: "POST",
        body: JSON.stringify({ mime: "image/jpeg", data: "!!not-base64!!" }),
      })
    );
    expect(res.status).toBe(400);
    expect(Upload.create).not.toHaveBeenCalled();
  });

  it("rejects photos over 2MB", async () => {
    const res = await POST(photoRequest(Buffer.alloc(2 * 1024 * 1024 + 1, 1)));
    expect(res.status).toBe(400);
    expect(Upload.create).not.toHaveBeenCalled();
  });

  it("returns 500 for unexpected errors", async () => {
    vi.mocked(Upload.create).mockRejectedValue(new Error("boom"));
    const res = await POST(photoRequest(JPEG_PNG));
    expect(res.status).toBe(500);
  });
});