export const PETROL_PRICE_PER_LITER_PKR = 346;
export const BIKE_FUEL_EFFICIENCY_KM_PER_LITER = 50;
export const BASE_WORK_FEE_PKR = 300;
export const COMPLEXITY_MULTIPLIERS = {
    low: 0.85,
    medium: 1,
    high: 1.35,
};
export function estimateTravelCost(distanceKm) {
    const oneWayDistance = Number.isFinite(distanceKm) ? Math.max(0, distanceKm) : 0;
    const fuelLiters = oneWayDistance / BIKE_FUEL_EFFICIENCY_KM_PER_LITER;
    return {
        round_trip_distance_km: Number(oneWayDistance.toFixed(2)),
        fuel_liters: Number(fuelLiters.toFixed(2)),
        fuel_cost_pkr: Math.round(fuelLiters * PETROL_PRICE_PER_LITER_PKR),
    };
}
export function calculatePredictedPrice({ estimateMin, estimateMax, complexity = "medium", distanceKm, }) {
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
//# sourceMappingURL=pricing.js.map