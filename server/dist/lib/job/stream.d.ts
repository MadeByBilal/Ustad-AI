export interface JobStreamEvent {
    id: string;
    from_state: string;
    to_state: string;
    actor_type: string;
    metadata: Record<string, unknown>;
    created_at: string;
}
export interface JobStreamMessage {
    id: string;
    sender_type: string;
    content: string;
    media_ids: string[];
    created_at: string;
}
export interface JobStreamOptions {
    pollMs?: number;
}
/**
 * Opens a server-sent-event stream for a job. Emits `job_event` and
 * `message` events as new lifecycle events and chat messages arrive, plus
 * a `connected` event with the current cursor so clients know the stream
 * is live. Access is enforced the same way as the chat: the customer owner
 * or a worker who is broadcasting / responded / selected.
 *
 * Note: change streams would require a replica set, so this polls the
 * JobEvent and Message collections with a monotonic ObjectId cursor. A
 * heartbeat comment is sent every poll so proxies keep the connection open.
 */
export declare function createJobStream(jobId: string, userId: string, role: "customer" | "worker", signal?: AbortSignal, options?: JobStreamOptions): Promise<ReadableStream<Uint8Array>>;
//# sourceMappingURL=stream.d.ts.map