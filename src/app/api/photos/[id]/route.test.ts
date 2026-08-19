import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/mongodb", () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/models", () => ({
  Upload: { findById: vi.fn() },
}));

import { requireRole } from "@/lib/auth";
import { Upload } from "@/models";
import { GET } from "./route";

const WORKER_SESSION = {
  user: { _id: "user-1", role: "worker" as const },
  token: "token-1",
};

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(WORKER_SESSION as never);
  vi.mocked(Upload.findById).mockReturnValue({
    lean: vi.fn().mockResolvedValue({
      _id: "photo-1",
      mime: "image/png",
      size: PNG.length,
      data: PNG,
    }),
  } as never);
});

describe("GET /api/photos/:id", () => {
  it("requires a session", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("AUTH_REQUIRED"));
    const res = await GET(new NextRequest("http://localhost/api/photos/photo-1"), {
      params: { id: "photo-1" },
    });
    expect(res.status).toBe(401);
  });

  it("serves the stored photo bytes with its mime type", async () => {
    const res = await GET(new NextRequest("http://localhost/api/photos/photo-1"), {
      params: { id: "photo-1" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    const bytes = Buffer.from(await res.arrayBuffer());
    expect(bytes.equals(PNG)).toBe(true);
    expect(Upload.findById).toHaveBeenCalledWith("photo-1");
  });

  it("returns 404 for an unknown photo", async () => {
    vi.mocked(Upload.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as never);
    const res = await GET(new NextRequest("http://localhost/api/photos/photo-1"), {
      params: { id: "photo-1" },
    });
    expect(res.status).toBe(404);
  });
});