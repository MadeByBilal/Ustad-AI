import { type JobDoc } from "../../models/index.js";
export interface JobResponderWorker {
    id: string;
    name: string;
    category: string;
    skills: string[];
    ustad_score: number;
    completed_jobs: number;
    average_rating: number;
    verified: boolean;
    verification_level: string;
    response_rate: number;
}
export interface JobResponderOffer {
    type: string;
    status: string;
    offered_price: number;
    counter_price: number | null;
}
export interface JobResponder {
    worker: JobResponderWorker;
    distance_km: number | null;
    offer: JobResponderOffer | null;
}
export interface JobDetail {
    job: JobDoc;
    responders: JobResponder[];
}
/**
 * Single-job view for the customer results screen and worker feed:
 *   - the owning customer
 *   - any open BROADCASTING job (worker feed)
 *   - a worker who responded or was selected
 * Responders carry public profile metadata plus distance from the job and
 * their pending offer (null for emergency direct claims).
 */
export declare function getJobDetail(jobId: string, userId: string): Promise<JobDetail>;
//# sourceMappingURL=detail.d.ts.map