import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/server/lib/auth", () => ({ requireRole: vi.fn() }));
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
  return {
    FlowError,
    createAndAnalyzeJob: vi.fn(),
  };
});
vi.mock("@/server/lib/mongodb", () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));

import { requireRole } from "@/server/lib/auth";
import { createAndAnalyzeJob, FlowError } from "@/server/lib/job/flow";
import { POST } from "./route";

const CUSTOMER_SESSION = {
  user: { _id: "cust1", role: "customer" as const },
  token: "token-1",
};

const ANALYZED_JOB = {
  _id: "job-1",
  status: "WAITING_FOR_CUSTOMER",
  input: { type: "text", original_text: "پائپ لیک ہو رہا ہے" },
  understanding: {
    category: "plumbing",
    description: "Water pipe leaking under the sink",
    required_skills: ["pipe_fixing"],
    urgency: "normal",
    estimate_min: 1000,
    estimate_max: 2500,
  },
  pricing: { currency: "PKR", estimate_min: 1000, estimate_max: 2500 },
  location: { type: "Point", coordinates: [67.0011, 24.8607], address_label: "Gulshan" },
};

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/jobs", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(CUSTOMER_SESSION as never);
  vi.mocked(createAndAnalyzeJob).mockResolvedValue(ANALYZED_JOB as never);
});

describe("POST /api/jobs", () => {
  it("requires the customer role", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("AUTH_REQUIRED"));
    const res = await POST(request({ original_text: "paani leak" }));
    expect(res.status).toBe(401);
    expect(createAndAnalyzeJob).not.toHaveBeenCalled();
  });

  it("forbids a worker session", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("ROLE_FORBIDDEN"));
    const res = await POST(request({ original_text: "paani leak" }));
    expect(res.status).toBe(403);
  });

  it("creates and analyzes a text job for the session customer", async () => {
    const res = await POST(request({ original_text: "پائپ لیک ہو رہا ہے" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.status).toBe("WAITING_FOR_CUSTOMER");
    expect(body.data.understanding.category).toBe("plumbing");
    expect(createAndAnalyzeJob).toHaveBeenCalledWith(
      "cust1",
      expect.objectContaining({
        type: "text",
        original_text: "پائپ لیک ہو رہا ہے",
      })
    );
  });

  it("forwards category and urgency hints", async () => {
    await POST(
      request({
        original_text: "geyser ki wiring",
        category_hint: "electrician",
        urgency_hint: "emergency",
      })
    );
    expect(createAndAnalyzeJob).toHaveBeenCalledWith(
      "cust1",
      expect.objectContaining({ category_hint: "electrician", urgency_hint: "emergency" })
    );
  });

  it("forwards location coordinates, address and search radius", async () => {
    await POST(
      request({
        original_text: "leak",
        location: {
          coordinates: [67.0011, 24.8607],
          address_label: "Gulshan-e-Iqbal, Block 5",
          search_radius_km: 10,
        },
      })
    );
    expect(createAndAnalyzeJob).toHaveBeenCalledWith(
      "cust1",
      expect.objectContaining({
        location: {
          coordinates: [67.0011, 24.8607],
          address_label: "Gulshan-e-Iqbal, Block 5",
          search_radius_km: 10,
        },
      })
    );
  });

  it("rejects an empty problem description", async () => {
    const res = await POST(request({ original_text: "   " }));
    expect(res.status).toBe(400);
    expect(createAndAnalyzeJob).not.toHaveBeenCalled();
  });

  it("creates a voice job from a transcript without original_text", async () => {
    const res = await POST(request({ type: "voice", transcript: "geyser on nahi ho rahi" }));
    expect(res.status).toBe(201);
    expect(createAndAnalyzeJob).toHaveBeenCalledWith(
      "cust1",
      expect.objectContaining({
        type: "voice",
        transcript: "geyser on nahi ho rahi",
        original_text: "",
      })
    );
  });

  it("creates a photo job from photo_ids without original_text", async () => {
    const res = await POST(request({ type: "photo", photo_ids: ["p1", "p2"] }));
    expect(res.status).toBe(201);
    expect(createAndAnalyzeJob).toHaveBeenCalledWith(
      "cust1",
      expect.objectContaining({ type: "photo", photo_ids: ["p1", "p2"] })
    );
  });

  it("rejects a voice job with neither transcript nor text", async () => {
    const res = await POST(request({ type: "voice", photo_ids: [] }));
    expect(res.status).toBe(400);
    expect(createAndAnalyzeJob).not.toHaveBeenCalled();
  });

  it("rejects a photo job with no photo_ids and no text", async () => {
    const res = await POST(request({ type: "photo" }));
    expect(res.status).toBe(400);
    expect(createAndAnalyzeJob).not.toHaveBeenCalled();
  });

  it("rejects an unknown category hint", async () => {
    const res = await POST(request({ original_text: "leak", category_hint: "rocket_science" }));
    expect(res.status).toBe(400);
  });

  it("maps a FlowError to its HTTP status", async () => {
    vi.mocked(createAndAnalyzeJob).mockRejectedValue(
      new FlowError("analysis_failed", "Could not analyze input", 422)
    );
    const res = await POST(request({ original_text: "leak" }));
    expect(res.status).toBe(422);
  });

  it("returns 500 for unexpected errors", async () => {
    vi.mocked(createAndAnalyzeJob).mockRejectedValue(new Error("boom"));
    const res = await POST(request({ original_text: "leak" }));
    expect(res.status).toBe(500);
  });
});