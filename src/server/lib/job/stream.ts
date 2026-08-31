import { JobEvent, Message } from "@/server/models";
import { getAccessibleJob } from "@/server/lib/job/chat";

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

const DEFAULT_POLL_MS = 1500;

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
export async function createJobStream(
  jobId: string,
  userId: string,
  role: "customer" | "worker",
  signal?: AbortSignal,
  options: JobStreamOptions = {}
): Promise<ReadableStream<Uint8Array>> {
  await getAccessibleJob(jobId, userId, role);

  const pollMs = options.pollMs ?? DEFAULT_POLL_MS;

  const [lastEvent, lastMessage] = await Promise.all([
    JobEvent.findOne({ job_id: jobId }).sort({ created_at: -1 }).select("_id").lean(),
    Message.findOne({ job_id: jobId }).sort({ created_at: -1 }).select("_id").lean(),
  ]);
  let eventCursor: string | null = lastEvent ? String(lastEvent._id) : null;
  let messageCursor: string | null = lastMessage ? String(lastMessage._id) : null;

  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let timer: ReturnType<typeof setInterval> | null = null;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // stream closed underneath us
        }
      };

      const poll = async () => {
        try {
          const eventFilter: Record<string, unknown> = { job_id: jobId };
          if (eventCursor) {
            eventFilter._id = { $gt: eventCursor };
          }
          const events = await JobEvent.find(eventFilter)
            .sort({ created_at: 1 })
            .lean();
          if (events.length > 0) {
            eventCursor = String(events[events.length - 1]._id);
            send(
              "job_event",
              events.map(
                (e): JobStreamEvent => ({
                  id: String(e._id),
                  from_state: e.from_state,
                  to_state: e.to_state,
                  actor_type: e.actor_type,
                  metadata: (e.metadata ?? {}) as Record<string, unknown>,
                  created_at: new Date(e.created_at).toISOString(),
                })
              )
            );
          }

          const messageFilter: Record<string, unknown> = { job_id: jobId };
          if (messageCursor) {
            messageFilter._id = { $gt: messageCursor };
          }
          const messages = await Message.find(messageFilter)
            .sort({ created_at: 1 })
            .lean();
          if (messages.length > 0) {
            messageCursor = String(messages[messages.length - 1]._id);
            send(
              "message",
              messages.map(
                (m): JobStreamMessage => ({
                  id: String(m._id),
                  sender_type: m.sender_type,
                  content: m.content ?? "",
                  media_ids: m.media_ids ?? [],
                  created_at: new Date(m.created_at).toISOString(),
                })
              )
            );
          }

          send("heartbeat", { at: new Date().toISOString() });
        } catch (e) {
          // Transient DB errors must not kill the stream; the next poll
          // retries with the same cursor.
          void e;
        }
      };

      const close = () => {
        if (closed) return;
        closed = true;
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      send("connected", { ok: true });
      timer = setInterval(() => void poll(), pollMs);

      signal?.addEventListener("abort", close, { once: true });
      if (signal?.aborted) {
        close();
      }
    },
    cancel() {
      // The abort listener closes the controller and clears the timer.
    },
  });
}