// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import WorkerDashboard from "./WorkerDashboard";

const fetchMock = vi.fn();

function dashboardPayload(): unknown {
  return {
    success: true,
    data: {
      worker: {
        id: "worker-1",
        name: "Muhammad Imran",
        category: "plumber",
        skills: ["pipe fitting", "faucet repair"],
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
        location_updated_at: new Date().toISOString(),
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
          photo_ids: [],
          acceptance_deadline: new Date(Date.now() + 5 * 60_000).toISOString(),
          created_at: new Date().toISOString(),
          my_offer: null,
        },
      ],
    },
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify(dashboardPayload()), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );
  vi.stubGlobal("fetch", fetchMock);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("WorkerDashboard integration", () => {
  it("loads the dashboard endpoint and renders the worker header, stats and availability", async () => {
    render(<WorkerDashboard workerId="worker-1" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/workers/worker-1/dashboard",
      expect.objectContaining({ cache: "no-store" })
    );
    expect(screen.getByText(/Muhammad Imran/)).toBeInTheDocument();
    expect(screen.getByText("85")).toBeInTheDocument();
    expect(screen.getAllByText("30").length).toBeGreaterThan(0);
    expect(screen.getByText("95%")).toBeInTheDocument();
    expect(screen.getByText(/documents verified/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update location/i })).toBeInTheDocument();
    expect(screen.getByText(/Sink band hai/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /accept offer/i })).toBeInTheDocument();
  });

  it("updates availability through the availability endpoint and refreshes", async () => {
    render(<WorkerDashboard workerId="worker-1" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            is_available: false,
            is_online: true,
            emergency_available: false,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    fireEvent.click(screen.getByRole("button", { name: /available for jobs/i }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const call = fetchMock.mock.calls.find(
      ([url, init]) =>
        url === "/api/workers/me/availability" && init?.method === "PATCH"
    );
    expect(call).toBeDefined();
    expect(JSON.parse((call![1] as RequestInit).body as string)).toEqual({
      is_available: false,
    });
  });

  it("shows a loading state before the first fetch resolves", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<WorkerDashboard workerId="worker-1" />);
    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
  });

  it("shows an error message when the dashboard request fails", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: "Worker not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    );
    render(<WorkerDashboard workerId="missing" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText(/Worker not found/)).toBeInTheDocument();
  });
});