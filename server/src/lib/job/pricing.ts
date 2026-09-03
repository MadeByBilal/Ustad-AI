export const PETROL_PRICE_PER_LITER_PKR = 346;
export const BIKE_FUEL_EFFICIENCY_KM_PER_LITER = 50;
export const BASE_WORK_FEE_PKR = 300;

export type ComplexityLevel = "low" | "medium" | "high";

export const COMPLEXITY_MULTIPLIERS: Record<ComplexityLevel, number> = {
  low: 0.85,
  medium: 1,
  high: 1.35,
};

export interface TravelCostEstimate {
  round_trip_distance_km: number;
  fuel_liters: number;
  fuel_cost_pkr: number;
}

export interface PredictedPriceInput {
  estimateMin: number;
  estimateMax: number;
  complexity?: ComplexityLevel;
  distanceKm: number | null | undefined;
}

export interface PredictedPriceEstimate extends TravelCostEstimate {
  base_price_pkr: number;
  travel_cost_pkr: number;
  complexity: ComplexityLevel;
  predicted_price_pkr: number;
}

export function estimateTravelCost(
  distanceKm: number | null | undefined
): TravelCostEstimate {
  const oneWayDistance = Number.isFinite(distanceKm) ? Math.max(0, distanceKm as number) : 0;
  const fuelLiters = oneWayDistance / BIKE_FUEL_EFFICIENCY_KM_PER_LITER;

  return {
    round_trip_distance_km: Number(oneWayDistance.toFixed(2)),
    fuel_liters: Number(fuelLiters.toFixed(2)),
    fuel_cost_pkr: Math.round(fuelLiters * PETROL_PRICE_PER_LITER_PKR),
  };
}

export function calculatePredictedPrice({
  estimateMin,
  estimateMax,
  complexity = "medium",
  distanceKm,
}: PredictedPriceInput): PredictedPriceEstimate {
  const safeMin = Math.max(0, Number.isFinite(estimateMin) ? estimateMin : 0);
  const safeMax = Math.max(safeMin, Number.isFinite(estimateMax) ? estimateMax : safeMin);
  const midpoint = (safeMin + safeMax) / 2;
  const travel = estimateTravelCost(distanceKm);

  return {
    ...travel,
    base_price_pkr: BASE_WORK_FEE_PKR,
    travel_cost_pkr: travel.fuel_cost_pkr,
    complexity,
    predicted_price_pkr: BASE_WORK_FEE_PKR + travel.fuel_cost_pkr,
  };
}
