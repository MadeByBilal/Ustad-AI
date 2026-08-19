import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/worker/dashboard", () => ({ getWorkerDashboard: vi.fn() }));
vi.mock("@/models", () => ({ Worker: { findOne: vi.fn() } }));

import { requireRole } from "@/lib/auth";
import { getWorkerDashboard } from "@/lib/worker/dashboard";
import { Worker } from "@/models";
import { GET } from "./route";

const WORKER_SESSION = {
  user: { _id: "user-1", role: "worker" as const },
  token: "token-1",
};

const DASHBOARD = {
  worker: {
    id: "worker-1",
    name: "Muhammad Imran",
    category: "plumber",
    skills: ["pipe fitting"],
    verified: true,
    verification_level: "documents_verified",
    is_online: true,
    is_available: true,
    emergency_available: false,
    ustad_score: 85,
    completed_jobs: 30,
    average_rating: 4.5,
    response_rate: 95,
    cancellation_rate: 2,
    repeat_customers: 12,
    confirmed_jobs: 27,
    location_updated_at: "2026-01-01T09:00:00.000Z",
    active_job_id: null,
  },
  active_job: null,
  incoming_jobs: [
    {
      id: "job-1",
      category: "plumber",
      subcategory: "drain_cleaning",
      description: "Kitchen sink drain blocked",
      original_text: "Sink band hai",
      required_skills: ["drain cleaning"],
      urgency: "normal",
      customer_offer: 1500,
      distance_km: 2.3,
      address_label: "Gulshan-e-Iqbal, Karachi",
      photo_ids: ["photo-1"],
      acceptance_deadline: "2026-01-01T10:08:00.000Z",
      created_at: "2026-01-01T10:00:00.000Z",
      my_offer: null,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(WORKER_SESSION as never);
  vi.mocked(Worker.findOne).mockReturnValue({
    lean: vi.fn().mockResolvedValue({ _id: "worker-1" }),
  } as never);
  vi.mocked(getWorkerDashboard).mockResolvedValue(DASHBOARD as never);
});

describe("GET /api/workers/:id/dashboard", () => {
  it("requires the worker role", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("AUTH_REQUIRED"));
    const res = await GET(new NextRequest("http://localhost/api/workers/worker-1/dashboard"), {
      params: { id: "worker-1" },
    });
    expect(res.status).toBe(401);
  });

  it("returns the worker dashboard payload", async () => {
    const res = await GET(new NextRequest("http://localhost/api/workers/worker-1/dashboard"), {
      params: { id: "worker-1" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.worker.name).toBe("Muhammad Imran");
    expect(body.data.active_job).toBeNull();
    expect(body.data.incoming_jobs).toHaveLength(1);
    expect(body.data.incoming_jobs[0].customer_offer).toBe(1500);
    expect(getWorkerDashboard).toHaveBeenCalledWith("worker-1");
  });

  it("refuses to serve another worker's dashboard id", async () => {
    const res = await GET(new NextRequest("http://localhost/api/workers/other/dashboard"), {
      params: { id: "other" },
    });
    expect(res.status).toBe(404);
    expect(getWorkerDashboard).not.toHaveBeenCalled();
  });

  it("returns 404 when the session user has no worker profile", async () => {
    vi.mocked(Worker.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as never);
    const res = await GET(new NextRequest("http://localhost/api/workers/worker-1/dashboard"), {
      params: { id: "worker-1" },
    });
    expect(res.status).toBe(404);
  });
});