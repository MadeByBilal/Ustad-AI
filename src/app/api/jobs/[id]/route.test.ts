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
  return { FlowError, reanalyzeJob: vi.fn() };
});
vi.mock("@/server/lib/job/detail", () => ({ getJobDetail: vi.fn() }));

import { requireRole } from "@/server/lib/auth";
import { FlowError, reanalyzeJob } from "@/server/lib/job/flow";
import { getJobDetail } from "@/server/lib/job/detail";
import { GET, PATCH } from "./route";

const CUSTOMER_SESSION = {
  user: { _id: "cust1", role: "customer" as const },
  token: "token-1",
};

const JOB = {
  _id: "job-1",
  status: "BROADCASTING",
  matching: { accepted_worker_ids: ["w1"], selected_worker_id: null },
};

function getRequest(): NextRequest {
  return new NextRequest("http://localhost/api/jobs/job-1");
}

function patchRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/jobs/job-1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(CUSTOMER_SESSION as never);
  vi.mocked(getJobDetail).mockResolvedValue({ job: JOB, responders: [] } as never);
  vi.mocked(reanalyzeJob).mockResolvedValue({ _id: "job-1", status: "WAITING_FOR_CUSTOMER" } as never);
});

describe("GET /api/jobs/[id]", () => {
  it("requires an authenticated customer or worker", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("AUTH_REQUIRED"));
    const res = await GET(getRequest(), { params: { id: "job-1" } });
    expect(res.status).toBe(401);
  });

  it("forbids other roles", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("ROLE_FORBIDDEN"));
    const res = await GET(getRequest(), { params: { id: "job-1" } });
    expect(res.status).toBe(403);
  });

  it("returns the job detail with responders for the session user", async () => {
    const res = await GET(getRequest(), { params: { id: "job-1" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.job._id).toBe("job-1");
    expect(getJobDetail).toHaveBeenCalledWith("job-1", "cust1");
  });

  it("rejects a missing job id", async () => {
    const res = await GET(getRequest(), { params: { id: "  " } });
    expect(res.status).toBe(400);
    expect(getJobDetail).not.toHaveBeenCalled();
  });

  it("maps a FlowError to its HTTP status", async () => {
    vi.mocked(getJobDetail).mockRejectedValue(new FlowError("job_not_found", "Job not found", 404));
    const res = await GET(getRequest(), { params: { id: "job-1" } });
    expect(res.status).toBe(404);
  });

  it("returns 500 for unexpected errors", async () => {
    vi.mocked(getJobDetail).mockRejectedValue(new Error("boom"));
    const res = await GET(getRequest(), { params: { id: "job-1" } });
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/jobs/[id]", () => {
  it("requires the customer role", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("AUTH_REQUIRED"));
    const res = await PATCH(patchRequest({ original_text: "paani leak" }), { params: { id: "job-1" } });
    expect(res.status).toBe(401);
  });

  it("re-analyzes the job with edited details", async () => {
    const res = await PATCH(
      patchRequest({
        original_text: "chhat se paani tapak raha hai",
        category_hint: "plumber",
        location: { coordinates: [67.0011, 24.8607], address_label: "Gulshan", search_radius_km: 10 },
      }),
      { params: { id: "job-1" } }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("WAITING_FOR_CUSTOMER");
    expect(reanalyzeJob).toHaveBeenCalledWith(
      "job-1",
      "cust1",
      expect.objectContaining({
        original_text: "chhat se paani tapak raha hai",
        category_hint: "plumber",
        location: { coordinates: [67.0011, 24.8607], address_label: "Gulshan", search_radius_km: 10 },
      })
    );
  });

  it("accepts a photo edit without text when photo_ids are present", async () => {
    const res = await PATCH(
      patchRequest({ type: "photo", original_text: "", photo_ids: ["p1"] }),
      { params: { id: "job-1" } }
    );
    expect(res.status).toBe(200);
    expect(reanalyzeJob).toHaveBeenCalledWith(
      "job-1",
      "cust1",
      expect.objectContaining({ type: "photo", photo_ids: ["p1"] })
    );
  });

  it("rejects an empty text edit", async () => {
    const res = await PATCH(patchRequest({ original_text: "   " }), { params: { id: "job-1" } });
    expect(res.status).toBe(400);
    expect(reanalyzeJob).not.toHaveBeenCalled();
  });

  it("rejects a photo edit with neither transcript nor photos", async () => {
    const res = await PATCH(
      patchRequest({ type: "photo", original_text: "", transcript: "", photo_ids: [] }),
      { params: { id: "job-1" } }
    );
    expect(res.status).toBe(400);
  });

  it("maps a FlowError to its HTTP status", async () => {
    vi.mocked(reanalyzeJob).mockRejectedValue(new FlowError("invalid_status", "Job cannot move", 409));
    const res = await PATCH(patchRequest({ original_text: "leak" }), { params: { id: "job-1" } });
    expect(res.status).toBe(409);
  });
});
