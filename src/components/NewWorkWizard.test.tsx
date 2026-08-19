// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import NewWorkWizard from "./NewWorkWizard";

const fetchMock = vi.fn();

function okResponse(payload: unknown) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );
}

function createdJob(): unknown {
  return {
    success: true,
    data: {
      _id: "job-1",
      status: "BROADCASTING",
      understanding: {
        category: "plumber",
        description: "Leaking pipe in the bathroom",
        required_skills: ["pipe_fixing"],
        urgency: "emergency",
      },
      pricing: { currency: "PKR", estimate_min: 1500, estimate_max: 2500 },
    },
  };
}

function emptyDetail(): unknown {
  return {
    success: true,
    data: {
      job: {
        _id: "job-1",
        status: "BROADCASTING",
        urgency: "emergency",
        matching: { selected_worker_id: null },
        pricing: { final_price: null },
      },
      responders: [],
    },
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("NewWorkWizard integration", () => {
  it("presets the urgency selector and shows the voice capture branch for ?method=voice&urgency=emergency", () => {
    history.replaceState(null, "", "/new-work?method=voice&urgency=emergency");
    render(<NewWorkWizard />);

    expect(screen.getByLabelText("Urgency (optional)")).toHaveValue("emergency");
    expect(screen.getByText(/voice note|voice not supported/i)).toBeInTheDocument();
  });

  it("shows the photo capture branch for ?method=photo", () => {
    history.replaceState(null, "", "/new-work?method=photo");
    render(<NewWorkWizard />);

    expect(screen.getByRole("button", { name: /take a photo/i })).toBeInTheDocument();
  });

  it("renders live worker results after broadcast and PATCHes the job when going back to edit", async () => {
    vi.useFakeTimers();
    history.replaceState(null, "", "/new-work?method=voice&urgency=emergency");
    okResponse(createdJob());
    okResponse({ success: true, data: { ok: true } });
    okResponse({
      success: true,
      data: {
        broadcast_id: "b1",
        eligible_workers_count: 3,
        acceptance_deadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      },
    });
    okResponse(emptyDetail());
    render(<NewWorkWizard />);

    fireEvent.change(screen.getByLabelText("What needs fixing?"), {
      target: { value: "Leaking pipe in the bathroom" },
    });
    fireEvent.click(screen.getByRole("button", { name: /analyze & see summary/i }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    fireEvent.click(screen.getByRole("button", { name: /sab theek hai — confirm/i }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    fireEvent.click(screen.getByRole("button", { name: /broadcast to workers/i }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText(/no ustads responded yet|finding nearest/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit job & restart/i })).toBeInTheDocument();

    okResponse({ success: true, data: { ok: true } });
    fireEvent.click(screen.getByRole("button", { name: /edit job & restart/i }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const patchCall = fetchMock.mock.calls.find(
      ([url, init]) => url === "/api/jobs/job-1" && init?.method === "PATCH"
    );
    expect(patchCall).toBeDefined();
    const parsed = JSON.parse((patchCall![1] as RequestInit).body as string);
    expect(parsed.type).toBe("voice");
    expect(parsed.urgency_hint).toBe("emergency");
    expect(screen.getByText(/what needs fixing/i)).toBeInTheDocument();
    vi.useRealTimers();
  });
});