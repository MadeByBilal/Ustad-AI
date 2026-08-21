import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/mongodb", () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/models", () => ({ Job: { findOne: vi.fn() }, Worker: { findOne: vi.fn() } }));

import { requireRole } from "@/lib/auth";
import { Job, Worker } from "@/models";
import { GET } from "./route";

const WORKER_SESSION = {
  user: { _id: "user-1", role: "worker" as const },
  token: "token-1",
};

const job = {
  customer_id: "customer-1",
  status: "EN_ROUTE",
  matching: { selected_worker_id: "worker-profile-1" },
  location: {
    coordinates: [73.1, 33.6],
    address_label: "Customer location",
  },
  completion: {},
};

function request() {
  return new NextRequest("http://localhost/api/jobs/job-1/tracking");
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(WORKER_SESSION as never);
  vi.mocked(Job.findOne).mockReturnValue({
    lean: vi.fn().mockResolvedValue(job),
  } as never);
  vi.mocked(Worker.findOne).mockImplementation(((filter: { user_id?: string }) => {
    if (filter.user_id) {
      return {
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ _id: "worker-profile-1" }),
        }),
      } as never;
    }

    return {
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          name: "Worker",
          location: { coordinates: [73, 33] },
          location_updated_at: null,
        }),
      }),
    } as never;
  }) as never);
});

describe("GET /api/jobs/[id]/tracking", () => {
  it("allows the assigned worker profile to receive destination coordinates", async () => {
    const response = await GET(request(), { params: Promise.resolve({ id: "job-1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.destination_lat).toBe(33.6);
    expect(body.data.destination_lng).toBe(73.1);
  });
});
