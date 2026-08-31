import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/server/lib/auth", () => ({ requireRole: vi.fn() }));
vi.mock("@/server/lib/mongodb", () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/server/lib/job/chat", () => ({
  listJobMessages: vi.fn(),
  sendJobMessage: vi.fn(),
}));
vi.mock("@/server/models", () => ({ Worker: { findOne: vi.fn() } }));

import { requireRole } from "@/server/lib/auth";
import { listJobMessages, sendJobMessage } from "@/server/lib/job/chat";
import { Worker } from "@/server/models";
import { GET, POST } from "./route";

const WORKER_SESSION = {
  user: { _id: "user-1", role: "worker" as const },
  token: "token-1",
};
const CUSTOMER_SESSION = {
  user: { _id: "user-9", role: "customer" as const },
  token: "token-9",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(WORKER_SESSION as never);
  vi.mocked(Worker.findOne).mockReturnValue({
    lean: vi.fn().mockResolvedValue({ _id: "worker-1" }),
  } as never);
  vi.mocked(listJobMessages).mockResolvedValue([
    { id: "m1", sender_type: "system", sender_name: "Ustad AI", content: "Job accepted", media_ids: [], location: null, created_at: "2026-01-01T10:00:00.000Z" },
  ] as never);
  vi.mocked(sendJobMessage).mockImplementation((_jobId, _senderId, _type, input) =>
    Promise.resolve({
      _id: "m2",
      sender_type: "worker",
      content: input.content ?? "",
      media_ids: input.photo_ids ?? [],
      location: input.location ?? null,
      created_at: new Date("2026-01-01T10:01:00.000Z"),
    } as never)
  );
});

describe("GET /api/jobs/:id/messages", () => {
  it("requires a session", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("AUTH_REQUIRED"));
    const res = await GET(new NextRequest("http://localhost/api/jobs/job-1/messages"), {
      params: { id: "job-1" },
    });
    expect(res.status).toBe(401);
  });

  it("resolves the worker profile and lists the job chat", async () => {
    const res = await GET(new NextRequest("http://localhost/api/jobs/job-1/messages"), {
      params: { id: "job-1" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.messages).toHaveLength(1);
    expect(body.data.messages[0].sender_type).toBe("system");
    expect(Worker.findOne).toHaveBeenCalledWith({ user_id: "user-1" });
    expect(listJobMessages).toHaveBeenCalledWith("job-1", "worker-1", "worker");
  });

  it("passes the customer user id through for customer sessions", async () => {
    vi.mocked(requireRole).mockResolvedValue(CUSTOMER_SESSION as never);
    const res = await GET(new NextRequest("http://localhost/api/jobs/job-1/messages"), {
      params: { id: "job-1" },
    });
    expect(res.status).toBe(200);
    expect(listJobMessages).toHaveBeenCalledWith("job-1", "user-9", "customer");
    expect(Worker.findOne).not.toHaveBeenCalled();
  });
});

describe("POST /api/jobs/:id/messages", () => {
  it("rejects an empty message", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/jobs/job-1/messages", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      { params: { id: "job-1" } }
    );
    expect(res.status).toBe(400);
    expect(sendJobMessage).not.toHaveBeenCalled();
  });

  it("sends a text message as the worker", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/jobs/job-1/messages", {
        method: "POST",
        body: JSON.stringify({ content: "Main pohanch gaya hoon" }),
      }),
      { params: { id: "job-1" } }
    );
    expect(res.status).toBe(201);
    expect(sendJobMessage).toHaveBeenCalledWith(
      "job-1",
      "worker-1",
      "worker",
      { content: "Main pohanch gaya hoon" }
    );
    const body = await res.json();
    expect(body.data.message.content).toBe("Main pohanch gaya hoon");
  });

  it("accepts a photo or location payload", async () => {
    const photo = await POST(
      new NextRequest("http://localhost/api/jobs/job-1/messages", {
        method: "POST",
        body: JSON.stringify({ photo_ids: ["photo-1"] }),
      }),
      { params: { id: "job-1" } }
    );
    expect(photo.status).toBe(201);

    const location = await POST(
      new NextRequest("http://localhost/api/jobs/job-1/messages", {
        method: "POST",
        body: JSON.stringify({ location: { lat: 24.86, lng: 67.0 } }),
      }),
      { params: { id: "job-1" } }
    );
    expect(location.status).toBe(201);
    expect(sendJobMessage).toHaveBeenCalledWith(
      "job-1",
      "worker-1",
      "worker",
      { location: { lat: 24.86, lng: 67.0 } }
    );
  });

  it("returns 404 when the session user has no worker profile", async () => {
    vi.mocked(Worker.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as never);
    const res = await POST(
      new NextRequest("http://localhost/api/jobs/job-1/messages", {
        method: "POST",
        body: JSON.stringify({ content: "Hi" }),
      }),
      { params: { id: "job-1" } }
    );
    expect(res.status).toBe(404);
  });
});