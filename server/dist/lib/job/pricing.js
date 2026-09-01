export const PETROL_PRICE_PER_LITER_PKR = 350;
export const BIKE_FUEL_EFFICIENCY_KM_PER_LITER = 40;
export const COMPLEXITY_MULTIPLIERS = {
    low: 0.85,
    medium: 1,
    high: 1.35,
};
export function estimateTravelCost(distanceKm) {
    const oneWayDistance = Number.isFinite(distanceKm) ? Math.max(0, distanceKm) : 0;
    const roundTripDistance = oneWayDistance * 2;
    const fuelLiters = roundTripDistance / BIKE_FUEL_EFFICIENCY_KM_PER_LITER;
    return {
        round_trip_distance_km: Number(roundTripDistance.toFixed(2)),
        fuel_liters: Number(fuelLiters.toFixed(2)),
        fuel_cost_pkr: Math.round(fuelLiters * PETROL_PRICE_PER_LITER_PKR),
    };
}
export function calculatePredictedPrice({ estimateMin, estimateMax, complexity = "medium", distanceKm, }) {
    const safeMin = Math.max(0, Number.isFinite(estimateMin) ? estimateMin : 0);
    const safeMax = Math.max(safeMin, Number.isFinite(estimateMax) ? estimateMax : safeMin);
    const midpoint = (safeMin + safeMax) / 2;
    const basePrice = Math.round((midpoint * COMPLEXITY_MULTIPLIERS[complexity]) / 50) * 50;
    const travel = estimateTravelCost(distanceKm);
    return {
        ...travel,
        base_price_pkr: basePrice,
        travel_cost_pkr: travel.fuel_cost_pkr,
        complexity,
        predicted_price_pkr: basePrice + travel.fuel_cost_pkr,
    };
}
//# sourceMappingURL=pricing.js.map