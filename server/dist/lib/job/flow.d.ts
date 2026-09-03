import { type JobDoc, type JobStatus } from "../../models/index.js";
export declare const CUSTOMER_SCORE_CANCEL_PENALTY = 5;
import { type JobActor } from "./state-machine.js";
import type { UrgencyLevel, WorkerCategory } from "../../models/index.js";
export declare class FlowError extends Error {
    readonly code: string;
    readonly statusCode: number;
    constructor(code: string, message: string, statusCode?: number);
}
export declare const WORKER_SCORE_CANCEL_PENALTY = 5;
export declare const WORKER_SCORE_COMPLETION_REWARD = 2;
export interface JobInputPayload {
    type: "voice" | "text" | "photo";
    original_text?: string;
    transcript?: string;
    photo_ids?: string[];
    category_hint?: WorkerCategory | null;
    urgency_hint?: UrgencyLevel | null;
    location?: {
        coordinates?: [number, number] | null;
        address_label?: string;
        search_radius_km?: number;
    };
}
export interface BroadcastResult {
    job: JobDoc;
    broadcast_id: string;
    eligible_workers_count: number;
    acceptance_deadline: Date;
}
export declare function recordEvent(jobId: unknown, from_state: JobStatus, to_state: JobStatus, actor_id: string, actor_type: JobActor, metadata?: Record<string, unknown>): Promise<void>;
/**
 * Creates a DRAFT job, runs the (pure, synchronous) analysis and settles
 * on WAITING_FOR_CUSTOMER with the lifecycle events recorded.
 */
export declare function createAndAnalyzeJob(customerId: string, input: JobInputPayload): Promise<JobDoc>;
/**
 * Re-runs analysis after the customer edits their input while the job is
 * still at WAITING_FOR_CUSTOMER.
 */
export declare function reanalyzeJob(jobId: string, customerId: string, input: JobInputPayload): Promise<JobDoc>;
/** "Sab theek hai" — customer confirms the summary and the job becomes matchable. */
export declare function confirmJobDetails(jobId: string, customerId: string): Promise<JobDoc>;
/**
 * Broadcasts a confirmed job to eligible workers. Normal jobs require a
 * customer offer; emergency jobs skip negotiation (offer may be null).
 */
export declare function submitOfferAndBroadcast(jobId: string, customerId: string, offerRs: number | null, now?: Date): Promise<BroadcastResult>;
/**
 * Worker claims a broadcast job atomically.
 *   - normal: BROADCASTING -> WORKER_RESPONSES (multiple workers may respond)
 *   - emergency: BROADCASTING -> ACCEPTED for the FIRST responder (atomic guard)
 */
export declare function workerAcceptJob(jobId: string, workerId: string, now?: Date): Promise<JobDoc>;
export type WorkerOfferType = "accept" | "counter_offer" | "decline";
export interface WorkerOfferInput {
    type: WorkerOfferType;
    counter_price?: number;
    message?: string;
}
export interface WorkerOfferResult {
    job: JobDoc;
    offer: {
        _id?: unknown;
        type: WorkerOfferType;
        status: string;
        counter_price?: number | null;
    };
}
/**
 * Worker responds to a broadcast with an accept, a counter offer, or a
 * decline. Accepts/counters claim the worker for a normal job
 * (BROADCASTING -> WORKER_RESPONSES); an emergency only allows a direct
 * claim (BROADCASTING -> ACCEPTED for the first responder). Declines are
 * recorded as offers without claiming anything.
 */
export declare function workerOffer(jobId: string, workerId: string, input: WorkerOfferInput, now?: Date): Promise<WorkerOfferResult>;
export declare function workerUpdateJobStatus(jobId: string, workerId: string, status: JobStatus, note?: string): Promise<JobDoc>;
export interface AttachPhotoInput {
    type: "before" | "after";
    photo_id: string;
    note?: string;
}
/**
 * Attaches a before/after photo (plus an optional work note) to the job
 * completion record. Only the assigned worker can attach photos, and only
 * while the job is active.
 */
export declare function workerAttachPhoto(jobId: string, workerId: string, input: AttachPhotoInput): Promise<JobDoc>;
/**
 * Customer picks a worker from those who responded. Other responders are
 * released back to availability.
 */
export declare function customerSelectWorker(jobId: string, customerId: string, workerId: string, now?: Date): Promise<JobDoc>;
/**
 * Customer rejects one worker's offer (counter-offer or accept). The
 * rejected worker is released back to availability and the job either
 * returns to READY_TO_MATCH for a new broadcast or is closed.
 */
export declare function customerRejectWorker(jobId: string, customerId: string, workerId: string, action?: "close" | "rebroadcast", now?: Date): Promise<JobDoc>;
/**
 * Worker cancels an assigned job they can no longer complete. The job is
 * closed, the worker's availability is restored and their cancellation
 * rate is raised (capped at 100).
 */
export declare function workerCancelJob(jobId: string, workerId: string, note?: string): Promise<JobDoc>;
/**
 * Customer cancels a job they created. The job is closed, the worker
 * (if assigned) is released back to availability.
 */
export declare function customerCancelJob(jobId: string, customerId: string, note?: string): Promise<JobDoc>;
/**
 * Lazy deadline enforcement: marks a job EXPIRED when its acceptance or
 * selection window has passed and releases any locked workers.
 */
export declare function markExpired(jobId: string, now?: Date): Promise<JobDoc | null>;
//# sourceMappingURL=flow.d.ts.map