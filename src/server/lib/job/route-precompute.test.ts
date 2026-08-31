import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeAndStoreRoute } from "./route-precompute";

const findOneAndUpdate = vi.fn();

function osrmResponse() {
  return new Response(
    JSON.stringify({
      code: "Ok",
      routes: [
        {
          distance: 1200.4,
          duration: 180.6,
          geometry: {
            coordinates: [
              [73, 33],
              [73.1, 33.6],
            ],
          },
        },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(osrmResponse()));
  findOneAndUpdate.mockResolvedValue({});
  vi.spyOn(mongoose, "model").mockReturnValue({ findOneAndUpdate } as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("computeAndStoreRoute", () => {
  it("returns the stored route so callers can push it immediately", async () => {
    const result = await computeAndStoreRoute("job-1", 33, 73, 33.6, 73.1);

    expect(result).toEqual({
      polyline: [
        [33, 73],
        [33.6, 73.1],
      ],
      distanceMeters: 1200,
      durationSeconds: 181,
    });
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "job-1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          "route.polyline": [
            [33, 73],
            [33.6, 73.1],
          ],
          "route.distance_meters": 1200,
          "route.duration_seconds": 181,
        }),
      }),
    );
  });

  it("returns null when the routing provider fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("OSRM unavailable")),
    );

    await expect(
      computeAndStoreRoute("job-1", 33, 73, 33.6, 73.1),
    ).resolves.toBeNull();
  });
});
