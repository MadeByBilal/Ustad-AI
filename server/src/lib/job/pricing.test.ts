import { describe, expect, it } from "vitest";
import {
  BIKE_FUEL_EFFICIENCY_KM_PER_LITER,
  PETROL_PRICE_PER_LITER_PKR,
  calculatePredictedPrice,
  estimateTravelCost,
} from "./pricing.js";

describe("fuel rates", () => {
  it("uses the agreed pilot rates (370 PKR/L, 50 km/L)", () => {
    expect(PETROL_PRICE_PER_LITER_PKR).toBe(370);
    expect(BIKE_FUEL_EFFICIENCY_KM_PER_LITER).toBe(50);
  });
});

describe("estimateTravelCost", () => {
  it("charges petrol per liter / 50 km of distance", () => {
    // 10 km → 0.2 L → 74 PKR
    expect(estimateTravelCost(10)).toEqual({
      distance_km: 10,
      fuel_liters: 0.2,
      fuel_cost_pkr: 74,
    });
    // 25 km → 0.5 L → 185 PKR
    expect(estimateTravelCost(25).fuel_cost_pkr).toBe(185);
  });

  it("handles missing and negative distance as zero", () => {
    expect(estimateTravelCost(null).fuel_cost_pkr).toBe(0);
    expect(estimateTravelCost(undefined).fuel_cost_pkr).toBe(0);
    expect(estimateTravelCost(-4).fuel_cost_pkr).toBe(0);
  });
});

describe("calculatePredictedPrice", () => {
  it("adds petrol to the AI work estimate at the measured complexity", () => {
    // low complexity, 800–2500 → mid 1650 × 0.85 = 1402.5 → 1403 + 10 km fuel 74
    const low = calculatePredictedPrice({
      estimateMin: 800,
      estimateMax: 2500,
      complexity: "low",
      distanceKm: 10,
    });
    expect(low.work_price_pkr).toBe(1403);
    expect(low.travel_cost_pkr).toBe(74);
    expect(low.predicted_price_pkr).toBe(1477);

    // high complexity, 4000–12000 → mid 8000 × 1.35 = 10800 + 25 km fuel 185
    const high = calculatePredictedPrice({
      estimateMin: 4000,
      estimateMax: 12000,
      complexity: "high",
      distanceKm: 25,
    });
    expect(high.work_price_pkr).toBe(10800);
    expect(high.predicted_price_pkr).toBe(10985);
  });

  it("falls back to the base visit fee when the analysis carried no range", () => {
    const p = calculatePredictedPrice({
      estimateMin: 0,
      estimateMax: 0,
      complexity: "medium",
      distanceKm: 0,
    });
    expect(p.work_price_pkr).toBe(300);
    expect(p.predicted_price_pkr).toBe(300);
  });

  it("keeps the work estimate when the distance is unknown", () => {
    const p = calculatePredictedPrice({
      estimateMin: 2000,
      estimateMax: 4000,
      complexity: "medium",
      distanceKm: null,
    });
    expect(p.travel_cost_pkr).toBe(0);
    expect(p.predicted_price_pkr).toBe(3000);
  });
});
