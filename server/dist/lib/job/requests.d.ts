export declare class RequestError extends Error {
    readonly code: string;
    readonly statusCode: number;
    constructor(code: string, message: string, statusCode?: number);
}
export interface DirectRequestInput {
    worker_id: string;
    proposed_price: number;
    message?: string;
    understanding: {
        category: string;
        subcategory?: string;
        description?: string;
        required_skills?: string[];
        urgency?: string;
        confidence?: number;
        estimate_min?: number;
        estimate_max?: number;
        inspection_fee?: number;
        complexity?: "low" | "medium" | "high";
    };
    input: {
        type: "voice" | "text" | "photo";
        original_text?: string;
        transcript?: string;
        photo_ids?: string[];
    };
    location?: {
        coordinates?: [number, number] | null;
        address_label?: string;
        search_radius_km?: number;
    };
}
export interface DirectRequestResult {
    job_id: string;
    offer_id: string;
    status: string;
}
/**
 * Customer sends a targeted request (with proposed price) to a specific
 * technician after voice matching. Creates a Job in BROADCASTING status
 * and a customer_offer Offer. The deadline gives the worker time to respond.
 */
export declare function createDirectRequest(customerId: string, input: DirectRequestInput, now?: Date): Promise<DirectRequestResult>;
export interface WorkerRespondInput {
    action: "accept" | "counter_offer" | "decline";
    counter_price?: number;
    message?: string;
}
export interface WorkerRespondResult {
    offer_status: string;
    job_status: string;
    final_price?: number;
}
/**
 * Worker responds to a direct customer request. Accept locks the worker
 * and confirms the job. Counter-offer updates the price. Decline leaves
 * the job open for the customer to try another technician.
 */
export declare function respondToDirectRequest(workerUserId: string, offerId: string, input: WorkerRespondInput, now?: Date): Promise<WorkerRespondResult>;
export interface CounterResponseInput {
    action: "accept" | "decline";
}
export interface CounterResponseResult {
    offer_status: string;
    job_status: string;
    final_price?: number;
}
/**
 * Customer responds to a worker's counter-offer. Accept confirms the job
 * at the counter price. Decline keeps the job open.
 */
export declare function respondToCounter(customerId: string, offerId: string, input: CounterResponseInput): Promise<CounterResponseResult>;
//# sourceMappingURL=requests.d.ts.map