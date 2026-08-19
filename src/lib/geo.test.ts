import { describe, expect, it } from "vitest";
import {
  buildBoundingBox,
  haversineDistanceKm,
  kmToDegreesRadius,
} from "@/lib/geo";

describe("haversineDistanceKm", () => {
  it("returns zero for identical coordinates", () => {
    expect(haversineDistanceKm(24.86, 67.0, 24.86, 67.0)).toBe(0);
  });

  it("computes Karachi-Lahore distance (~1033 km)", () => {
    const d = haversineDistanceKm(24.8607, 67.0011, 31.5497, 74.3436);
    expect(d).toBeGreaterThan(1000);
    expect(d).toBeLessThan(1080);
  });

  it("is symmetric", () => {
    const a = haversineDistanceKm(24.86, 67.0, 31.55, 74.34);
    const b = haversineDistanceKm(31.55, 74.34, 24.86, 67.0);
    expect(Math.abs(a - b)).toBeLessThan(0.001);
  });
});

describe("kmToDegreesRadius", () => {
  it("converts ~111.32 km to one degree of latitude", () => {
    expect(kmToDegreesRadius(111.32)).toBeCloseTo(1, 3);
  });

  it("returns zero for zero km", () => {
    expect(kmToDegreesRadius(0)).toBe(0);
  });
});

describe("buildBoundingBox", () => {
  it("builds [minLng, minLat, maxLng, maxLat] for a 5 km radius", () => {
    const box = buildBoundingBox(74.3436, 31.5497, 5);
    const [minLng, minLat, maxLng, maxLat] = box;

    expect(minLng).toBeLessThan(74.3436);
    expect(maxLng).toBeGreaterThan(74.3436);
    expect(minLat).toBeLessThan(31.5497);
    expect(maxLat).toBeGreaterThan(31.5497);
    expect(minLng).toBeLessThan(maxLng);
    expect(minLat).toBeLessThan(maxLat);
  });

  it("keeps the center point inside the box", () => {
    const [minLng, minLat, maxLng, maxLat] = buildBoundingBox(74.3436, 31.5497, 10);
    expect(74.3436).toBeGreaterThan(minLng);
    expect(74.3436).toBeLessThan(maxLng);
    expect(31.5497).toBeGreaterThan(minLat);
    expect(31.5497).toBeLessThan(maxLat);
  });
});