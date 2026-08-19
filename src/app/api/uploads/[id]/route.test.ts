import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ requireRole: vi.fn() }));
vi.mock("@/models", () => ({
  Upload: { findById: vi.fn() },
}));

import { requireRole } from "@/lib/auth";
import { Upload } from "@/models";
import { GET } from "./route";

const SESSION = {
  user: { _id: "user-1", role: "customer" as const },
  token: "token-1",
};

function request(url = "http://localhost/api/uploads/upload-1"): NextRequest {
  return new NextRequest(url, { method: "GET" });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(SESSION as never);
});

describe("GET /api/uploads/:id", () => {
  it("requires authentication", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("AUTH_REQUIRED"));
    const res = await GET(request(), { params: { id: "upload-1" } });
    expect(res.status).toBe(401);
  });

  it("accepts both customer and worker roles", async () => {
    vi.mocked(requireRole).mockResolvedValue({
      ...SESSION,
      user: { _id: "user-2", role: "worker" },
    } as never);
    vi.mocked(Upload.findById).mockResolvedValue({
      _id: "upload-1",
      mime: "image/jpeg",
      data: Buffer.from("jpeg-data"),
    } as never);
    const res = await GET(request(), { params: { id: "upload-1" } });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("requires a valid upload id", async () => {
    const res = await GET(request(), { params: { id: "" } });
    expect(res.status).toBe(400);
  });

  it("returns 404 for missing upload", async () => {
    vi.mocked(Upload.findById).mockResolvedValue(null);
    const res = await GET(request(), { params: { id: "missing" } });
    expect(res.status).toBe(404);
  });

  it("serves the image with correct mime and cache headers", async () => {
    const fakeJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    vi.mocked(Upload.findById).mockResolvedValue({
      _id: "upload-1",
      mime: "image/jpeg",
      data: fakeJpeg,
    } as never);

    const res = await GET(request(), { params: { id: "upload-1" } });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    expect(res.headers.get("Cache-Control")).toContain("max-age=31536000");
    const body = await res.arrayBuffer();
    expect(new Uint8Array(body)).toEqual(new Uint8Array(fakeJpeg));
  });

  it("serves PNG correctly", async () => {
    const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    vi.mocked(Upload.findById).mockResolvedValue({
      _id: "upload-2",
      mime: "image/png",
      data: fakePng,
    } as never);

    const res = await GET(request("http://localhost/api/uploads/upload-2"), { params: { id: "upload-2" } });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    const body = await res.arrayBuffer();
    expect(new Uint8Array(body)).toEqual(new Uint8Array(fakePng));
  });

  it("returns 500 for unexpected errors", async () => {
    vi.mocked(Upload.findById).mockRejectedValue(new Error("boom"));
    const res = await GET(request(), { params: { id: "upload-1" } });
    expect(res.status).toBe(500);
  });
});