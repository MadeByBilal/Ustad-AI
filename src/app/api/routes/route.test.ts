import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/server/lib/auth", () => ({ requireRole: vi.fn() }));

import { requireRole } from "@/server/lib/auth";
import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue({
    user: { _id: "user-1", role: "customer" },
  } as never);
});

describe("GET /api/routes", () => {
  it("returns road geometry from the routing provider", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: "Ok",
            routes: [
              {
                geometry: { coordinates: [[73, 33], [73.1, 33.6]] },
                distance: 1200,
                duration: 180,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    const response = await GET(
      new NextRequest(
        "http://localhost/api/routes?fromLat=33&fromLng=73&toLat=33.6&toLng=73.1"
      )
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.coordinates).toEqual([[73, 33], [73.1, 33.6]]);
    expect(body.data.distance_meters).toBe(1200);
  });

  it("rejects missing coordinates", async () => {
    const response = await GET(new NextRequest("http://localhost/api/routes"));

    expect(response.status).toBe(400);
  });
});
