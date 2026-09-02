import { describe, expect, it } from "vitest";
import { canCustomerCancel, resolveWorkerCancellation, } from "./cancellation.js";
describe("job cancellation policy", () => {
    it("allows the customer to cancel before and after worker selection", () => {
        expect(canCustomerCancel("WAITING_FOR_CUSTOMER")).toBe(true);
        expect(canCustomerCancel("READY_TO_MATCH")).toBe(true);
        expect(canCustomerCancel("BROADCASTING")).toBe(true);
        expect(canCustomerCancel("WORKER_RESPONSES")).toBe(true);
        expect(canCustomerCancel("CUSTOMER_SELECTING")).toBe(true);
        expect(canCustomerCancel("ACCEPTED")).toBe(true);
        expect(canCustomerCancel("EN_ROUTE")).toBe(true);
        expect(canCustomerCancel("COMPLETED")).toBe(false);
    });
    it("withdraws one worker response without cancelling other responses", () => {
        expect(resolveWorkerCancellation({
            status: "WORKER_RESPONSES",
            selectedWorkerId: null,
            acceptedWorkerIds: ["worker-1", "worker-2"],
        }, "worker-1")).toEqual({
            targetStatus: "WORKER_RESPONSES",
            remainingWorkerIds: ["worker-2"],
            cancelsJob: false,
        });
    });
    it("returns an empty response round to matching when the last worker withdraws", () => {
        expect(resolveWorkerCancellation({
            status: "WORKER_RESPONSES",
            selectedWorkerId: null,
            acceptedWorkerIds: ["worker-1"],
        }, "worker-1")).toEqual({
            targetStatus: "READY_TO_MATCH",
            remainingWorkerIds: [],
            cancelsJob: false,
        });
    });
    it("cancels the job when the selected worker withdraws", () => {
        expect(resolveWorkerCancellation({
            status: "EN_ROUTE",
            selectedWorkerId: "worker-1",
            acceptedWorkerIds: ["worker-1"],
        }, "worker-1")).toEqual({
            targetStatus: "CANCELLED",
            remainingWorkerIds: [],
            cancelsJob: true,
        });
    });
    it("rejects a worker who is not assigned or responding", () => {
        expect(resolveWorkerCancellation({
            status: "WORKER_RESPONSES",
            selectedWorkerId: null,
            acceptedWorkerIds: ["worker-2"],
        }, "worker-1")).toBeNull();
    });
});
//# sourceMappingURL=cancellation.test.js.map