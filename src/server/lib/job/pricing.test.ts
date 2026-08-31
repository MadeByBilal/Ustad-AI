import { describe, expect, it } from "vitest";
import {
  BIKE_FUEL_EFFICIENCY_KM_PER_LITER,
  PETROL_PRICE_PER_LITER_PKR,
  calculatePredictedPrice,
  estimateTravelCost,
} from "@/server/lib/job/pricing";

describe("job pricing", () => {
  it("calculates round-trip bike fuel cost from worker distance", () => {
    const travel = estimateTravelCost(10);

    expect(travel.round_trip_distance_km).toBe(20);
    expect(travel.fuel_liters).toBe(0.5);
    expect(travel.fuel_cost_pkr).toBe(175);
    expect(BIKE_FUEL_EFFICIENCY_KM_PER_LITER).toBe(40);
    expect(PETROL_PRICE_PER_LITER_PKR).toBe(350);
  });

  it("adds complexity and travel fuel to the predicted base price", () => {
    const estimate = calculatePredictedPrice({
      estimateMin: 800,
      estimateMax: 1500,
      complexity: "high",
      distanceKm: 10,
    });

    expect(estimate.base_price_pkr).toBe(1550);
    expect(estimate.travel_cost_pkr).toBe(175);
    expect(estimate.predicted_price_pkr).toBe(1725);
  });

  it("does not add travel cost when worker distance is unavailable", () => {
    const estimate = calculatePredictedPrice({
      estimateMin: 800,
      estimateMax: 1500,
      complexity: "medium",
      distanceKm: null,
    });

    expect(estimate.travel_cost_pkr).toBe(0);
    expect(estimate.predicted_price_pkr).toBe(1150);
  });
});
