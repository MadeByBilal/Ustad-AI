import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/mongodb", () => ({ connectDB: vi.fn() }));
vi.mock("@/models", () => ({ Worker: { findOne: vi.fn(), findOneAndUpdate: vi.fn() } }));

import { requireRole } from "@/lib/auth";
import { Worker } from "@/models";
import { PATCH } from "./route";

const WORKER_SESSION = {
  user: { _id: "user-1", role: "worker" as const },
  token: "token-1",
};

const POSITION = { lat: 24.9206, lng: 67.0877 };

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/workers/me/location", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(WORKER_SESSION as never);
  vi.mocked(Worker.findOne).mockReturnValue({
    lean: vi.fn().mockResolvedValue({ _id: "worker-profile-1" }),
  } as never);
  vi.mocked(Worker.findOneAndUpdate).mockReturnValue({
    lean: vi.fn().mockResolvedValue({
      _id: "worker-profile-1",
      location: { type: "Point", coordinates: [67.0877, 24.9206] },
      location_updated_at: new Date("2026-01-01T12:00:00Z"),
    }),
  } as never);
});

describe("PATCH /api/workers/me/location", () => {
  it("requires the worker role", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("AUTH_REQUIRED"));
    const res = await PATCH(request(POSITION));
    expect(res.status).toBe(401);
  });

  it("forbids a customer session", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("ROLE_FORBIDDEN"));
    const res = await PATCH(request(POSITION));
    expect(res.status).toBe(403);
  });

  it("rejects out-of-range coordinates", async () => {
    const res = await PATCH(request({ lat: 91, lng: 67 }));
    expect(res.status).toBe(400);
  });

  it("rejects missing coordinates", async () => {
    const res = await PATCH(request({ lat: 24.9 }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the session user has no worker profile", async () => {
    vi.mocked(Worker.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as never);
    const res = await PATCH(request(POSITION));
    expect(res.status).toBe(404);
    expect(Worker.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("updates the worker location within their service area", async () => {
    const res = await PATCH(request(POSITION));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.location).toEqual({
      type: "Point",
      coordinates: [67.0877, 24.9206],
    });
    expect(Worker.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: "worker-profile-1",
        service_area: {
          $geoIntersects: {
            $geometry: { type: "Point", coordinates: [67.0877, 24.9206] },
          },
        },
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          location: { type: "Point", coordinates: [67.0877, 24.9206] },
        }),
      }),
      expect.anything()
    );
  });

  it("rejects a location outside the service area", async () => {
    vi.mocked(Worker.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as never);
    const res = await PATCH(request(POSITION));
    expect(res.status).toBe(403);
  });
});