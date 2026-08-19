// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import WorkerResults from "./WorkerResults";

const fetchMock = vi.fn();

function detailResponse(overrides: Record<string, unknown> = {}): unknown {
  return {
    success: true,
    data: {
      job: {
        _id: "job-1",
        status: "BROADCASTING",
        pricing: {
          customer_offer: 1500,
          final_price: null,
          worker_counter_offer: null,
        },
        matching: {
          acceptance_deadline: "2026-01-01T10:10:00.000Z",
          selected_worker_id: null,
        },
        ...((overrides.job as Record<string, unknown>) ?? {}),
      },
      responders:
        overrides.responders !== undefined
          ? (overrides.responders as unknown[])
          : [
              {
                worker: {
                  id: "w1",
                  name: "Salman",
                  category: "plumber",
                  skills: ["pipe_fixing", "leak_detection", "sink_repair"],
                  ustad_score: 88,
                  average_rating: 4.7,
                  completed_jobs: 120,
                  verified: true,
                  verification_level: "documents_verified",
                  response_rate: 95,
                },
                distance_km: 1.2,
                offer: {
                  type: "accept",
                  status: "pending",
                  offered_price: 1500,
                  counter_price: null,
                },
              },
            ],
    },
  };
}

function okResponse(payload: unknown): void {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } })
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("WorkerResults", () => {
  it("shows the waiting state while broadcast is open with no responders", async () => {
    okResponse(detailResponse({ responders: [], job: { status: "BROADCASTING" } }));
    render(
      <WorkerResults
        jobId="job-1"
        urgency="normal"
        customerOffer={1500}
        acceptanceDeadline="2026-01-01T10:10:00.000Z"
      />
    );
    expect(screen.getByText(/waiting for ustads/i)).toBeInTheDocument();
    await advance(3000);
  });

  it("lists responders with score, rating, distance and skills", async () => {
    okResponse(detailResponse());
    render(
      <WorkerResults
        jobId="job-1"
        urgency="normal"
        customerOffer={1500}
        acceptanceDeadline="2026-01-01T10:10:00.000Z"
      />
    );
    await advance(0);
    expect(screen.getByText("Salman")).toBeInTheDocument();
    expect(screen.getByText(/ustad 88/i)).toBeInTheDocument();
    expect(screen.getByText("⭐ 4.7")).toBeInTheDocument();
    expect(screen.getByText("1.2 km")).toBeInTheDocument();
    expect(screen.getByText("pipe_fixing", { exact: false })).toBeInTheDocument();
    await advance(3000);
  });

  it("marks verified workers and tags emergency jobs", async () => {
    okResponse(detailResponse());
    render(
      <WorkerResults
        jobId="job-1"
        urgency="emergency"
        customerOffer={null}
        acceptanceDeadline="2026-01-01T10:10:00.000Z"
      />
    );
    await advance(0);
    expect(screen.getByText(/verified/i)).toBeInTheDocument();
    expect(screen.getByText(/emergency/i)).toBeInTheDocument();
    await advance(3000);
  });

  it("expands a worker profile on request", async () => {
    okResponse(detailResponse());
    render(
      <WorkerResults
        jobId="job-1"
        urgency="normal"
        customerOffer={1500}
        acceptanceDeadline="2026-01-01T10:10:00.000Z"
      />
    );
    await advance(0);
    fireEvent.click(screen.getByRole("button", { name: /view profile/i }));
    expect(screen.getByText(/120 jobs/i)).toBeInTheDocument();
    expect(screen.getByText(/documents_verified/i)).toBeInTheDocument();
    await advance(3000);
  });

  it("hires a worker and shows the final price summary", async () => {
    okResponse(detailResponse());
    render(
      <WorkerResults
        jobId="job-1"
        urgency="normal"
        customerOffer={1500}
        acceptanceDeadline="2026-01-01T10:10:00.000Z"
      />
    );
    await advance(0);
    expect(screen.getByText("Salman")).toBeInTheDocument();

    okResponse({
      success: true,
      data: {
        status: "ACCEPTED",
        matching: { selected_worker_id: "w1" },
        pricing: { final_price: 1500, customer_offer: null, worker_counter_offer: null },
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /hire salman/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/jobs/job-1/select-worker",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ worker_id: "w1" }),
      })
    );
    await advance(0);
    expect(screen.getByText(/hired salman/i)).toBeInTheDocument();
    expect(screen.getByText("₨ 1,500", { exact: false })).toBeInTheDocument();
    await advance(3000);
  });

  it("shows the worker's counter offer on the card", async () => {
    okResponse(
      detailResponse({
        responders: [
          {
            worker: { id: "w1", name: "Salman", category: "plumber", skills: ["pipe_fixing"] },
            distance_km: 1.2,
            offer: { type: "counter_offer", status: "pending", offered_price: 1500, counter_price: 1800 },
          },
        ],
      })
    );
    render(
      <WorkerResults
        jobId="job-1"
        urgency="normal"
        customerOffer={1500}
        acceptanceDeadline="2026-01-01T10:10:00.000Z"
      />
    );
    await advance(0);
    expect(screen.getByText(/₨ 1,800/i)).toBeInTheDocument();
    await advance(3000);
  });

  it("shows the emergency finding state and auto-reveals the claimed worker", async () => {
    okResponse(detailResponse({ responders: [] }));
    render(
      <WorkerResults
        jobId="job-1"
        urgency="emergency"
        customerOffer={null}
        acceptanceDeadline="2026-01-01T10:04:00.000Z"
      />
    );
    expect(screen.getByText(/finding nearest available worker/i)).toBeInTheDocument();

    const claimed = detailResponse({
      responders: [],
      job: {
        status: "ACCEPTED",
        matching: { selected_worker_id: "w2" },
        pricing: { final_price: null as number | null, customer_offer: null },
      },
    });
    (claimed as { data: { responders: unknown[] } }).data.responders = [
      (detailResponse() as { data: { responders: unknown[] } }).data.responders[0],
    ];
    (claimed as { data: { job: Record<string, unknown> } }).data.job.responders = undefined;
    okResponse(claimed);
    await advance(3000);

    expect(screen.getByText(/salman arrived/i)).toBeInTheDocument();
  });

  it("shows a fallback message once the acceptance window closes with no one", async () => {
    okResponse(detailResponse({ responders: [] }));
    render(
      <WorkerResults
        jobId="job-1"
        urgency="normal"
        customerOffer={1500}
        acceptanceDeadline={new Date(Date.now() + 60 * 1000).toISOString()}
      />
    );
    await advance(10 * 60 * 1000);
    expect(screen.getByText(/no ustads responded yet/i)).toBeInTheDocument();
  });

  it("surfaces hire errors without losing the responder list", async () => {
    okResponse(detailResponse());
    render(
      <WorkerResults
        jobId="job-1"
        urgency="normal"
        customerOffer={1500}
        acceptanceDeadline="2026-01-01T10:10:00.000Z"
      />
    );
    await advance(0);
    expect(screen.getByText("Salman")).toBeInTheDocument();

    okResponse({ success: false, error: "job is no longer accepting" });
    fireEvent.click(screen.getByRole("button", { name: /hire salman/i }));

    await advance(0);
    expect(screen.getByText(/job is no longer accepting/i)).toBeInTheDocument();
    expect(screen.getByText("Salman")).toBeInTheDocument();
    await advance(3000);
  });
});
