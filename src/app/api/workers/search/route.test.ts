import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/server/lib/auth", () => ({ requireRole: vi.fn() }));
vi.mock("@/server/lib/matching", () => ({ getWorkerResults: vi.fn() }));

import { requireRole } from "@/server/lib/auth";
import { getWorkerResults } from "@/server/lib/matching";
import { GET } from "./route";

const CUSTOMER_SESSION = {
  user: { _id: "cust1", role: "customer" as const },
  token: "token-1",
};

function searchUrl(params: Record<string, string> = {}): NextRequest {
  const query = new URLSearchParams(
    Object.entries({ lat: "24.8607", lng: "67.0011", ...params })
  ).toString();
  return new NextRequest(`http://localhost/api/workers/search?${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(CUSTOMER_SESSION as never);
  vi.mocked(getWorkerResults).mockResolvedValue([
    { id: "w1", name: "Imran", category: "electrician", final_score: 90, distance_km: 1.2 },
  ] as never);
});

describe("GET /api/workers/search", () => {
  it("requires an authenticated customer or worker", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("AUTH_REQUIRED"));
    const res = await GET(searchUrl());
    expect(res.status).toBe(401);
  });

  it("forbids other roles", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("ROLE_FORBIDDEN"));
    const res = await GET(searchUrl());
    expect(res.status).toBe(403);
  });

  it("returns ranked workers for the parsed filters", async () => {
    const res = await GET(
      searchUrl({ category: "electrician", radius_km: "3", urgency: "emergency", required_skills: "wiring,fault" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.results).toHaveLength(1);
    expect(getWorkerResults).toHaveBeenCalledWith({
      category: "electrician",
      lat: 24.8607,
      lng: 67.0011,
      radius_km: 3,
      urgency: "emergency",
      required_skills: ["wiring", "fault"],
      limit: 15,
    });
  });

  it("defaults radius, urgency and limit", async () => {
    await GET(searchUrl({ category: "plumber" }));
    expect(getWorkerResults).toHaveBeenCalledWith(
      expect.objectContaining({ radius_km: 5, urgency: "normal", limit: 15 })
    );
  });

  it("rejects an invalid category value", async () => {
    const res = await GET(searchUrl({ category: "astronaut" }));
    expect(res.status).toBe(400);
    expect(getWorkerResults).not.toHaveBeenCalled();
  });

  it("rejects out-of-range coordinates", async () => {
    const res = await GET(searchUrl({ lat: "999" }));
    expect(res.status).toBe(400);
  });
});