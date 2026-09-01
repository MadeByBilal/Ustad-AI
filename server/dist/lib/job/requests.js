import { randomUUID } from "node:crypto";
import { connectDB } from "../mongodb.js";
import { validateCustomerOffer, validateWorkerCounter } from "./offers.js";
import { Job, JobEvent, Message, Offer, Worker, SYSTEM_SENDER_ID } from "../../models/index.js";
export class RequestError extends Error {
    code;
    statusCode;
    constructor(code, message, statusCode = 400) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = "RequestError";
    }
}
/**
 * Customer sends a targeted request (with proposed price) to a specific
 * technician after voice matching. Creates a Job in BROADCASTING status
 * and a customer_offer Offer. The deadline gives the worker time to respond.
 */
export async function createDirectRequest(customerId, input, now = new Date()) {
    await connectDB();
    // Validate proposed price against estimates
    const estMin = input.understanding.estimate_min ?? 0;
    const estMax = input.understanding.estimate_max ?? 0;
    const validation = validateCustomerOffer(input.proposed_price, estMin, estMax);
    if (!validation.valid) {
        throw new RequestError(validation.reason === "too_high" ? "offer_too_high" : "offer_too_low", validation.reason === "too_high"
            ? `Offer above the Rs ${validation.max_allowed} ceiling`
            : `Offer below the Rs ${validation.min_allowed} floor`, 400);
    }
    // Verify target worker exists and is available
    const worker = await Worker.findById(input.worker_id).lean();
    if (!worker) {
        throw new RequestError("worker_not_found", "Technician not found", 404);
    }
    if (worker.is_available === false || worker.suspended) {
        throw new RequestError("worker_not_available", "Technician is not available", 409);
    }
    const urgency = (input.understanding.urgency ?? "normal");
    const deadline = new Date(now.getTime() + (urgency === "emergency" ? 4 : 10) * 60_000);
    const job = await Job.create({
        customer_id: customerId,
        status: "BROADCASTING",
        input: {
            type: input.input.type,
            original_text: input.input.original_text ?? "",
            transcript: input.input.transcript ?? "",
            photo_ids: input.input.photo_ids ?? [],
        },
        understanding: {
            category: input.understanding.category ?? "",
            subcategory: input.understanding.subcategory ?? "",
            description: input.understanding.description ?? "",
            required_skills: input.understanding.required_skills ?? [],
            urgency,
            safety_flags: [],
            confidence: input.understanding.confidence ?? 0,
            clarification_required: false,
            complexity: input.understanding.complexity ?? "medium",
        },
        pricing: {
            estimate_min: estMin,
            estimate_max: estMax,
            inspection_fee: input.understanding.inspection_fee ?? 0,
            customer_offer: input.proposed_price,
            currency: "PKR",
            status: "pending",
        },
        location: {
            type: "Point",
            coordinates: input.location?.coordinates ?? undefined,
            address_label: input.location?.address_label ?? "",
        },
        matching: {
            search_radius_km: input.location?.search_radius_km ?? 5,
            broadcast_round: 1,
            broadcast_id: randomUUID(),
            eligible_workers_count: 1,
            acceptance_deadline: deadline,
            selected_worker_id: null,
        },
    });
    const offer = await Offer.create({
        job_id: job._id,
        worker_id: input.worker_id,
        type: "customer_offer",
        status: "pending",
        offered_price: input.proposed_price,
        message: input.message ?? "",
        expires_at: deadline,
    });
    await JobEvent.create({
        job_id: job._id,
        from_state: "READY_TO_MATCH",
        to_state: "BROADCASTING",
        actor_id: customerId,
        actor_type: "customer",
        metadata: {
            broadcast_id: job.matching?.broadcast_id,
            target_worker_id: input.worker_id,
            direct_request: true,
        },
    });
    return {
        job_id: String(job._id),
        offer_id: String(offer._id),
        status: "BROADCASTING",
    };
}
/**
 * Worker responds to a direct customer request. Accept locks the worker
 * and confirms the job. Counter-offer updates the price. Decline leaves
 * the job open for the customer to try another technician.
 */
export async function respondToDirectRequest(workerUserId, offerId, input, now = new Date()) {
    await connectDB();
    const worker = await Worker.findOne({ user_id: workerUserId }).lean();
    if (!worker) {
        throw new RequestError("worker_not_found", "Worker profile not found", 404);
    }
    const offer = await Offer.findById(offerId).lean();
    if (!offer) {
        throw new RequestError("offer_not_found", "Request not found", 404);
    }
    if (String(offer.worker_id) !== String(worker._id)) {
        throw new RequestError("not_your_offer", "This request is not for you", 403);
    }
    if (offer.type !== "customer_offer" || offer.status !== "pending") {
        throw new RequestError("offer_not_pending", "This request is no longer pending", 409);
    }
    const job = await Job.findById(offer.job_id).lean();
    if (!job) {
        throw new RequestError("job_not_found", "Job not found", 404);
    }
    if (job.status !== "BROADCASTING") {
        throw new RequestError("invalid_status", "Job is not accepting responses", 409);
    }
    if (job.matching?.acceptance_deadline && new Date(job.matching.acceptance_deadline).getTime() < now.getTime()) {
        throw new RequestError("deadline_passed", "Response deadline has passed", 410);
    }
    const customerOffer = job.pricing?.customer_offer ?? 0;
    const estimateMax = job.pricing?.estimate_max ?? 0;
    if (input.action === "decline") {
        await Offer.findByIdAndUpdate(offerId, { $set: { status: "declined" } });
        await JobEvent.create({
            job_id: job._id,
            from_state: "BROADCASTING",
            to_state: "BROADCASTING",
            actor_id: String(worker._id),
            actor_type: "worker",
            metadata: { action: "declined_direct_request" },
        });
        await Message.create({
            job_id: job._id,
            sender_id: SYSTEM_SENDER_ID,
            sender_type: "system",
            content: "Technician declined the request",
        });
        return { offer_status: "declined", job_status: "BROADCASTING" };
    }
    if (input.action === "counter_offer") {
        if (!input.counter_price || input.counter_price <= 0) {
            throw new RequestError("invalid_counter", "Counter price is required and must be positive", 400);
        }
        const check = validateWorkerCounter(input.counter_price, customerOffer, estimateMax);
        if (!check.valid) {
            throw new RequestError(check.reason === "too_low" ? "counter_too_low" : "counter_too_high", check.reason === "too_low"
                ? `Counter must be at least Rs ${check.min_allowed}`
                : `Counter cannot exceed Rs ${check.max_allowed}`, 400);
        }
        await Offer.findByIdAndUpdate(offerId, {
            $set: {
                type: "counter_offer",
                counter_price: input.counter_price,
                message: input.message ?? "",
                status: "pending",
            },
        });
        await Job.findByIdAndUpdate(job._id, {
            $set: { "pricing.worker_counter_offer": input.counter_price },
        });
        await JobEvent.create({
            job_id: job._id,
            from_state: "BROADCASTING",
            to_state: "BROADCASTING",
            actor_id: String(worker._id),
            actor_type: "worker",
            metadata: { action: "counter_offer", counter_price: input.counter_price },
        });
        await Message.create({
            job_id: job._id,
            sender_id: SYSTEM_SENDER_ID,
            sender_type: "system",
            content: `Counter-offer submitted: Rs ${Math.round(input.counter_price).toLocaleString("en-PK")} — waiting for the customer`,
        });
        return { offer_status: "pending", job_status: "BROADCASTING" };
    }
    // ACCEPT
    const finalPrice = customerOffer;
    const jobUpdate = await Job.findOneAndUpdate({ _id: job._id, status: "BROADCASTING" }, {
        $set: {
            status: "ACCEPTED",
            "matching.selected_worker_id": worker._id,
            "matching.acceptance_deadline": null,
            "pricing.final_price": finalPrice,
            "pricing.status": "agreed",
        },
    }, { new: true });
    if (!jobUpdate) {
        throw new RequestError("concurrent_update", "Job changed concurrently", 409);
    }
    const lockResult = await Worker.updateOne({ _id: worker._id, active_job_id: null }, { $set: { active_job_id: job._id, is_available: false } });
    if (lockResult.matchedCount !== 1) {
        // Rollback
        await Job.findOneAndUpdate({ _id: job._id, status: "ACCEPTED" }, { $set: { status: "BROADCASTING", "matching.selected_worker_id": null } });
        throw new RequestError("worker_busy", "Technician is already busy", 409);
    }
    await Offer.findByIdAndUpdate(offerId, { $set: { status: "selected", expires_at: null } });
    await JobEvent.create({
        job_id: job._id,
        from_state: "BROADCASTING",
        to_state: "ACCEPTED",
        actor_id: String(worker._id),
        actor_type: "worker",
        metadata: { final_price: finalPrice, direct_request: true },
    });
    await Message.create({
        job_id: job._id,
        sender_id: SYSTEM_SENDER_ID,
        sender_type: "system",
        content: `Job accepted — confirmed at Rs ${Math.round(finalPrice).toLocaleString("en-PK")}`,
    });
    return { offer_status: "selected", job_status: "ACCEPTED", final_price: finalPrice };
}
/**
 * Customer responds to a worker's counter-offer. Accept confirms the job
 * at the counter price. Decline keeps the job open.
 */
export async function respondToCounter(customerId, offerId, input) {
    await connectDB();
    const offer = await Offer.findById(offerId).lean();
    if (!offer) {
        throw new RequestError("offer_not_found", "Request not found", 404);
    }
    if (offer.type !== "counter_offer" || offer.status !== "pending") {
        throw new RequestError("offer_not_pending", "This counter-offer is no longer pending", 409);
    }
    const job = await Job.findById(offer.job_id).lean();
    if (!job) {
        throw new RequestError("job_not_found", "Job not found", 404);
    }
    if (String(job.customer_id) !== String(customerId)) {
        throw new RequestError("not_your_job", "This job does not belong to you", 403);
    }
    if (job.status !== "BROADCASTING") {
        throw new RequestError("invalid_status", "Job is not accepting responses", 409);
    }
    const counterPrice = offer.counter_price ?? 0;
    if (input.action === "decline") {
        await Offer.findByIdAndUpdate(offerId, { $set: { status: "declined" } });
        await JobEvent.create({
            job_id: job._id,
            from_state: "BROADCASTING",
            to_state: "BROADCASTING",
            actor_id: customerId,
            actor_type: "customer",
            metadata: { action: "declined_counter" },
        });
        await Message.create({
            job_id: job._id,
            sender_id: SYSTEM_SENDER_ID,
            sender_type: "system",
            content: "Counter-offer rejected — job is still open",
        });
        return { offer_status: "declined", job_status: "BROADCASTING" };
    }
    // ACCEPT counter
    const jobUpdate = await Job.findOneAndUpdate({ _id: job._id, status: "BROADCASTING" }, {
        $set: {
            status: "ACCEPTED",
            "matching.selected_worker_id": offer.worker_id,
            "matching.acceptance_deadline": null,
            "pricing.final_price": counterPrice,
            "pricing.status": "agreed",
        },
    }, { new: true });
    if (!jobUpdate) {
        throw new RequestError("concurrent_update", "Job changed concurrently", 409);
    }
    const lockResult = await Worker.updateOne({ _id: offer.worker_id, active_job_id: null }, { $set: { active_job_id: job._id, is_available: false } });
    if (lockResult.matchedCount !== 1) {
        await Job.findOneAndUpdate({ _id: job._id, status: "ACCEPTED" }, { $set: { status: "BROADCASTING", "matching.selected_worker_id": null } });
        throw new RequestError("worker_busy", "Technician is already busy", 409);
    }
    await Offer.findByIdAndUpdate(offerId, { $set: { status: "selected", expires_at: null } });
    await JobEvent.create({
        job_id: job._id,
        from_state: "BROADCASTING",
        to_state: "ACCEPTED",
        actor_id: customerId,
        actor_type: "customer",
        metadata: { final_price: counterPrice, accepted_counter: true },
    });
    await Message.create({
        job_id: job._id,
        sender_id: SYSTEM_SENDER_ID,
        sender_type: "system",
        content: `Counter-offer accepted — job confirmed at Rs ${Math.round(counterPrice).toLocaleString("en-PK")}`,
    });
    return { offer_status: "selected", job_status: "ACCEPTED", final_price: counterPrice };
}
//# sourceMappingURL=requests.js.map