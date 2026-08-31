import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/server/lib/auth", () => ({ requireRole: vi.fn() }));
vi.mock("@/server/lib/mongodb", () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/server/lib/job/flow", () => {
  class FlowError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly statusCode: number = 409
    ) {
      super(message);
      this.name = "FlowError";
    }
  }
  return { FlowError };
});
vi.mock("@/server/lib/job/stream", () => ({ createJobStream: vi.fn() }));
vi.mock("@/server/models", () => ({ Worker: { findOne: vi.fn() } }));

import { requireRole } from "@/server/lib/auth";
import { FlowError } from "@/server/lib/job/flow";
import { createJobStream } from "@/server/lib/job/stream";
import { Worker } from "@/server/models";
import { GET } from "./route";

const CUSTOMER_SESSION = {
  user: { _id: "cust1", role: "customer" as const },
  token: "token-1",
};
const WORKER_SESSION = {
  user: { _id: "user-1", role: "worker" as const },
  token: "token-1",
};

const encoder = new TextEncoder();

function streamWith(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(CUSTOMER_SESSION as never);
  vi.mocked(createJobStream).mockResolvedValue(streamWith("event: connected\n\n"));
});

describe("GET /api/jobs/[id]/stream", () => {
  it("requires authentication", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("AUTH_REQUIRED"));
    const res = await GET(new NextRequest("http://localhost/api/jobs/job-1/stream"), {
      params: { id: "job-1" },
    });
    expect(res.status).toBe(401);
  });

  it("returns a server-sent-events stream for the job owner", async () => {
    const res = await GET(new NextRequest("http://localhost/api/jobs/job-1/stream"), {
      params: { id: "job-1" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
    expect(res.headers.get("Cache-Control")).toContain("no-cache");

    const text = await res.text();
    expect(text).toContain("event: connected");
    expect(createJobStream).toHaveBeenCalledWith(
      "job-1",
      "cust1",
      "customer",
      expect.any(AbortSignal)
    );
  });

  it("resolves the worker profile for a worker session", async () => {
    vi.mocked(requireRole).mockResolvedValue(WORKER_SESSION as never);
    vi.mocked(Worker.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: "w1" }),
    } as never);

    await GET(new NextRequest("http://localhost/api/jobs/job-1/stream"), {
      params: { id: "job-1" },
    });

    expect(Worker.findOne).toHaveBeenCalledWith({ user_id: "user-1" });
    expect(createJobStream).toHaveBeenCalledWith(
      "job-1",
      "w1",
      "worker",
      expect.any(AbortSignal)
    );
  });

  it("returns 404 when the worker profile is missing", async () => {
    vi.mocked(requireRole).mockResolvedValue(WORKER_SESSION as never);
    vi.mocked(Worker.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as never);

    const res = await GET(new NextRequest("http://localhost/api/jobs/job-1/stream"), {
      params: { id: "job-1" },
    });
    expect(res.status).toBe(404);
    expect(createJobStream).not.toHaveBeenCalled();
  });

  it("maps a FlowError to its HTTP status", async () => {
    vi.mocked(createJobStream).mockRejectedValue(
      new FlowError("chat_access_denied", "No access to this job chat", 404)
    );
    const res = await GET(new NextRequest("http://localhost/api/jobs/job-1/stream"), {
      params: { id: "job-1" },
    });
    expect(res.status).toBe(404);
  });

  it("returns 500 for unexpected errors", async () => {
    vi.mocked(createJobStream).mockRejectedValue(new Error("boom"));
    const res = await GET(new NextRequest("http://localhost/api/jobs/job-1/stream"), {
      params: { id: "job-1" },
    });
    expect(res.status).toBe(500);
  });
});