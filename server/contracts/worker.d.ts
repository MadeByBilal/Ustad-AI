export declare const WORKER_CATEGORIES: readonly ["plumber", "electrician", "ac_technician", "carpenter"];
export type WorkerCategory = (typeof WORKER_CATEGORIES)[number];
export declare const VERIFICATION_LEVELS: readonly ["identity_reviewed", "documents_verified"];
export type VerificationLevel = (typeof VERIFICATION_LEVELS)[number];
export interface WorkerLocation {
    type: "Point";
    coordinates: number[];
}
export interface WorkerOption {
    id: string;
    name: string;
    category: WorkerCategory;
    skills: string[];
    verified: boolean;
    verification_level: string;
    ustad_score: number;
    completed_jobs: number;
    average_rating: number;
    response_rate?: number;
    skills_match: number;
    final_score: number;
    distance_km?: number | null;
    predicted_price?: number;
    travel_cost_pkr?: number;
}
export interface WorkerResult {
    id: string;
    name: string;
    category: WorkerCategory;
    skills: string[];
    matched_skills: string[];
    verification_level: string;
    verified: boolean;
    completeness_pct: number;
    ustad_score: number;
    completed_jobs: number;
    average_rating: number;
    distance_km: number;
    skills_match: number;
    final_score: number;
}
export interface WorkerView {
    id: string;
    name: string;
    category: string;
    skills: string[];
    verified: boolean;
    verification_level: string;
    is_online: boolean;
    is_available: boolean;
    emergency_available: boolean;
    ustad_score: number;
    completed_jobs: number;
    average_rating: number;
    response_rate: number;
    cancellation_rate: number;
    repeat_customers: number;
    confirmed_jobs: number;
    location_updated_at: string | null;
    active_job_id: string | null;
    location_lat: number | null;
    location_lng: number | null;
}
export interface IncomingJobView {
    id: string;
    category: string;
    subcategory: string;
    description: string;
    original_text: string;
    required_skills: string[];
    urgency: string;
    customer_offer: number;
    distance_km: number | null;
    address_label: string;
    photo_ids: string[];
    acceptance_deadline: string | null;
    created_at: string;
    my_offer: {
        type: string;
        status: string;
        counter_price: number | null;
    } | null;
}
export interface DirectRequestView {
    offer_id: string;
    job_id: string;
    category: string;
    description: string;
    original_text: string;
    required_skills: string[];
    urgency: string;
    customer_offer: number;
    my_counter_price: number | null;
    offer_status: string;
    address_label: string;
    created_at: string;
}
export interface ActiveJobView {
    _id: string;
    status: string;
    input?: {
        original_text?: string;
    };
    understanding?: {
        category?: string;
        subcategory?: string;
        description?: string;
        required_skills?: string[];
        urgency?: string;
    };
    pricing?: {
        customer_offer?: number;
        worker_counter_offer?: number | null;
        final_price?: number | null;
        currency?: string;
    };
    location?: {
        address_label?: string;
        lat?: number | null;
        lng?: number | null;
    };
    route?: {
        polyline?: number[][] | null;
        distance_meters?: number | null;
        duration_seconds?: number | null;
    } | null;
    completion?: {
        before_photo_id?: string | null;
        after_photo_id?: string | null;
        note?: string | null;
        customer_confirmed?: boolean;
    };
    created_at?: string;
    updated_at?: string;
}
export interface WorkerDashboardData {
    worker: WorkerView;
    active_job: ActiveJobView | null;
    incoming_jobs: IncomingJobView[];
    direct_requests: DirectRequestView[];
}
//# sourceMappingURL=worker.d.ts.map