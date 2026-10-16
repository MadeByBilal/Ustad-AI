/**
 * Pre-computed price estimate for a worker offer.
 *
 * Formula (as agreed for the pilot):
 *   petrol  = distance_km / BIKE_FUEL_EFFICIENCY_KM_PER_LITER
 *             × PETROL_PRICE_PER_LITER_PKR          (370 PKR/L, 50 km/L)
 *   work    = AI estimate range midpoint × complexity multiplier
 *   total   = work + petrol
 *
 * Everything is computed server-side during matching so the offer modal
 * never waits on a price call — the number is already on the worker card.
 */

export const PETROL_PRICE_PER_LITER_PKR = 370;
export const BIKE_FUEL_EFFICIENCY_KM_PER_LITER = 50;
export const BASE_WORK_FEE_PKR = 300;

export type ComplexityLevel = "low" | "medium" | "high";

export const COMPLEXITY_MULTIPLIERS: Record<ComplexityLevel, number> = {
  low: 0.85,
  medium: 1,
  high: 1.35,
};

export interface TravelCostEstimate {
  /** One-way distance between customer and worker, km. */
  distance_km: number;
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
  /** Work portion: AI estimate adjusted by the AI-measured complexity. */
  work_price_pkr: number;
  travel_cost_pkr: number;
  complexity: ComplexityLevel;
  /** work + petrol, ready to show / prefill in the offer form. */
  predicted_price_pkr: number;
}

export function estimateTravelCost(
  distanceKm: number | null | undefined
): TravelCostEstimate {
  const distance = Number.isFinite(distanceKm)
    ? Math.max(0, distanceKm as number)
    : 0;
  const fuelLiters = distance / BIKE_FUEL_EFFICIENCY_KM_PER_LITER;

  return {
    distance_km: Number(distance.toFixed(2)),
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
  const safeMax = Math.max(
    safeMin,
    Number.isFinite(estimateMax) ? estimateMax : safeMin
  );
  const midpoint = (safeMin + safeMax) / 2;
  const multiplier = COMPLEXITY_MULTIPLIERS[complexity] ?? 1;

  // The AI's range is the work estimate; its complexity level scales it.
  // No range at all (keyword fallback) → base visit fee × multiplier.
  const workPrice =
    midpoint > 0
      ? Math.round(midpoint * multiplier)
      : Math.round(BASE_WORK_FEE_PKR * multiplier);

  const travel = estimateTravelCost(distanceKm);

  return {
    ...travel,
    work_price_pkr: workPrice,
    travel_cost_pkr: travel.fuel_cost_pkr,
    complexity,
    predicted_price_pkr: workPrice + travel.fuel_cost_pkr,
  };
}
