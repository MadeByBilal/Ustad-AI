import { describe, expect, it } from "vitest";
import { getTrackingTarget, parseLocationPayload, } from "./realtime.js";
describe("realtime tracking helpers", () => {
    it("accepts only finite latitude and longitude values in range", () => {
        expect(parseLocationPayload({ lat: 33.6844, lng: 73.0479 })).toEqual({
            lat: 33.6844,
            lng: 73.0479,
        });
        expect(parseLocationPayload({ lat: 91, lng: 73 })).toBeNull();
        expect(parseLocationPayload({ lat: 33, lng: Number.NaN })).toBeNull();
        expect(parseLocationPayload(null)).toBeNull();
    });
    it("routes to the customer's live location when available", () => {
        expect(getTrackingTarget({
            location: { coordinates: [73.05, 33.69] },
            tracking: { customer_location: { coordinates: [73.06, 33.7] } },
        })).toEqual([73.06, 33.7]);
    });
    it("falls back to the job destination when live customer location is absent", () => {
        expect(getTrackingTarget({ location: { coordinates: [73.05, 33.69] } })).toEqual([73.05, 33.69]);
        expect(getTrackingTarget({ location: { coordinates: [73.05] } })).toBeNull();
    });
});
//# sourceMappingURL=realtime.test.js.map