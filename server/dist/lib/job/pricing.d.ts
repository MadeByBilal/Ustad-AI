export declare const PETROL_PRICE_PER_LITER_PKR = 350;
export declare const BIKE_FUEL_EFFICIENCY_KM_PER_LITER = 40;
export type ComplexityLevel = "low" | "medium" | "high";
export declare const COMPLEXITY_MULTIPLIERS: Record<ComplexityLevel, number>;
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
export declare function estimateTravelCost(distanceKm: number | null | undefined): TravelCostEstimate;
export declare function calculatePredictedPrice({ estimateMin, estimateMax, complexity, distanceKm, }: PredictedPriceInput): PredictedPriceEstimate;
//# sourceMappingURL=pricing.d.ts.map