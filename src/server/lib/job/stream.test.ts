import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/server/lib/job/chat", () => ({ getAccessibleJob: vi.fn() }));
vi.mock("@/server/models", () => {
  const chain = (resolved: unknown) => ({
    sort: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(resolved) }),
      lean: vi.fn().mockResolvedValue(resolved),
    }),
  });
  return {
    JobEvent: {
      findOne: vi.fn(() => chain(null)),
      find: vi.fn(() => chain([])),
    },
    Message: {
      findOne: vi.fn(() => chain(null)),
      find: vi.fn(() => chain([])),
    },
  };
});

import { getAccessibleJob } from "@/server/lib/job/chat";
import { JobEvent, Message } from "@/server/models";
import { createJobStream } from "@/server/lib/job/stream";

const DECODER = new TextDecoder();

async function readUntil(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  needle: string,
  timeoutMs = 2000
): Promise<string> {
  let out = "";
  const deadline = Date.now() + timeoutMs;
  while (!out.includes(needle) && Date.now() < deadline) {
    const { value, done } = await reader.read();
    if (done) break;
    out += DECODER.decode(value, { stream: true });
  }
  return out;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAccessibleJob).mockResolvedValue({ _id: "job1" } as never);
});

describe("createJobStream", () => {
  it("requires chat-level access to the job", async () => {
    vi.mocked(getAccessibleJob).mockRejectedValue(
      Object.assign(new Error("No access to this job chat"), { code: "chat_access_denied" })
    );
    await expect(
      createJobStream("job1", "u1", "customer")
    ).rejects.toMatchObject({ code: "chat_access_denied" });
    expect(getAccessibleJob).toHaveBeenCalledWith("job1", "u1", "customer");
  });

  it("emits connected, then new job events and messages as they arrive", async () => {
    const controller = new AbortController();
    const stream = await createJobStream("job1", "u1", "customer", controller.signal, {
      pollMs: 5,
    });
    const reader = stream.getReader();

    const first = await readUntil(reader, "event: connected");
    expect(first).toContain('event: connected');

    vi.mocked(JobEvent.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: "evt-2",
            from_state: "EN_ROUTE",
            to_state: "ARRIVED",
            actor_type: "worker",
            metadata: {},
            created_at: new Date("2026-01-01T10:00:01Z"),
          },
        ]),
      }),
    } as never);
    vi.mocked(Message.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: "msg-2",
            sender_type: "customer",
            content: "Salam ustad!",
            media_ids: [],
            created_at: new Date("2026-01-01T10:00:02Z"),
          },
        ]),
      }),
    } as never);

    const out = await readUntil(reader, "event: message");
    expect(out).toContain('event: job_event');
    expect(out).toContain('"to_state":"ARRIVED"');
    expect(out).toContain('event: message');
    expect(out).toContain('"content":"Salam ustad!"');

    controller.abort();
    void reader.cancel();
  });

  it("does not replay items already present at stream open", async () => {
    vi.mocked(JobEvent.findOne).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: "evt-9" }) }),
      }),
    } as never);
    vi.mocked(Message.findOne).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: "msg-9" }) }),
      }),
    } as never);

    const controller = new AbortController();
    const stream = await createJobStream("job1", "u1", "customer", controller.signal, {
      pollMs: 10,
    });
    const reader = stream.getReader();

    await readUntil(reader, "event: connected");

    // Simulates the DB honouring the `_id: { $gt: cursor }` filter: once
    // the cursor is set, nothing new is returned for these ids.
    vi.mocked(JobEvent.find).mockImplementation((filter) => ({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(
          (filter as { _id?: unknown })._id
            ? []
            : [
                {
                  _id: "evt-9",
                  from_state: "READY_TO_MATCH",
                  to_state: "BROADCASTING",
                  actor_type: "customer",
                  metadata: {},
                  created_at: new Date("2026-01-01T10:00:00Z"),
                },
              ]
        ),
      }),
    }) as never);
    vi.mocked(Message.find).mockImplementation((filter) => ({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(
          (filter as { _id?: unknown })._id
            ? []
            : [
                {
                  _id: "msg-9",
                  sender_type: "system",
                  content: "old message",
                  media_ids: [],
                  created_at: new Date("2026-01-01T10:00:00Z"),
                },
              ]
        ),
      }),
    }) as never);

    const out = await readUntil(reader, "event: heartbeat");
    expect(out).not.toContain('event: job_event');
    expect(out).not.toContain('event: message');

    controller.abort();
    void reader.cancel();
  });

  it("stops cleanly when aborted", async () => {
    const controller = new AbortController();
    const stream = await createJobStream("job1", "u1", "customer", controller.signal, {
      pollMs: 10,
    });
    const reader = stream.getReader();

    await readUntil(reader, "event: connected");
    controller.abort();

    const { done } = await reader.read();
    expect(done).toBe(true);
  });
});