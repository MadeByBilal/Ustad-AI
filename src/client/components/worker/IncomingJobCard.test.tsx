// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import IncomingJobCard from "./IncomingJobCard";
import type { IncomingJobView } from "@/server/lib/worker/dashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const fetchMock = vi.fn();

function okResponse(payload: unknown) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );
}

const JOB: IncomingJobView = {
  id: "job-1",
  category: "plumber",
  subcategory: "drain_cleaning",
  description: "Kitchen sink drain blocked, water not draining",
  original_text: "Sink band hai, paani nahi jata",
  required_skills: ["drain cleaning", "pipe fitting"],
  urgency: "normal",
  customer_offer: 1500,
  distance_km: 2.3,
  address_label: "Gulshan-e-Iqbal, Karachi",
  photo_ids: ["photo-1"],
  acceptance_deadline: new Date(Date.now() + 5 * 60_000).toISOString(),
  created_at: new Date().toISOString(),
  my_offer: null,
};

const NOW = Date.now();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("IncomingJobCard", () => {
  it("shows the job details, offer, distance and countdown", () => {
    render(<IncomingJobCard job={JOB} now={NOW} onChanged={() => {}} />);

    expect(screen.getAllByText(/drain cleaning/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Kitchen sink drain blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/Rs 1,500/)).toBeInTheDocument();
    expect(screen.getByText(/~2.3 km/)).toBeInTheDocument();
    expect(screen.getByText(/Gulshan-e-Iqbal, Karachi/)).toBeInTheDocument();
    expect(screen.getByText(/⏱/)).toBeInTheDocument();
    expect(screen.getByAltText("Problem photo")).toHaveAttribute(
      "src",
      "/api/photos/photo-1"
    );
  });

  it("marks an expired job as expired", () => {
    render(
      <IncomingJobCard
        job={{ ...JOB, acceptance_deadline: new Date(NOW - 1000).toISOString() }}
        now={NOW}
        onChanged={() => {}}
      />
    );
    expect(screen.getByText(/Expired/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /accept offer/i })).not.toBeInTheDocument();
  });

  it("accepts the job via POST /api/jobs/:id/accept and refreshes", async () => {
    okResponse({ success: true, data: { ok: true } });
    const onChanged = vi.fn();
    render(<IncomingJobCard job={JOB} now={NOW} onChanged={onChanged} />);

    fireEvent.click(screen.getByRole("button", { name: /accept offer/i }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());

    const acceptCall = fetchMock.mock.calls.find(
      ([url, init]) => url === "/api/jobs/job-1/accept" && init?.method === "POST"
    );
    expect(acceptCall).toBeDefined();
  });

  it("declines the job via POST /api/offers", async () => {
    okResponse({ success: true, data: {} });
    const onChanged = vi.fn();
    render(<IncomingJobCard job={JOB} now={NOW} onChanged={onChanged} />);

    fireEvent.click(screen.getByRole("button", { name: /^decline$/i }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());

    const declineCall = fetchMock.mock.calls.find(
      ([url, init]) => url === "/api/offers" && init?.method === "POST"
    );
    expect(declineCall).toBeDefined();
    expect(JSON.parse((declineCall![1] as RequestInit).body as string)).toEqual({
      job_id: "job-1",
      type: "decline",
    });
  });

  it("submits a counter-offer with a price and an optional message", async () => {
    okResponse({ success: true, data: {} });
    const onChanged = vi.fn();
    render(<IncomingJobCard job={JOB} now={NOW} onChanged={onChanged} />);

    fireEvent.click(screen.getByRole("button", { name: /counter-offer/i }));
    fireEvent.change(screen.getByLabelText(/your price/i), {
      target: { value: "1800" },
    });
    fireEvent.change(screen.getByLabelText(/optional message/i), {
      target: { value: "Additional parts required" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit counter-offer/i }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());

    const counterCall = fetchMock.mock.calls.find(
      ([url, init]) => url === "/api/offers" && init?.method === "POST"
    );
    expect(counterCall).toBeDefined();
    expect(JSON.parse((counterCall![1] as RequestInit).body as string)).toEqual({
      job_id: "job-1",
      type: "counter_offer",
      counter_price: 1800,
      message: "Additional parts required",
    });
  });

  it("sends a clarification question to the job chat", async () => {
    okResponse({ success: true, data: {} });
    const onChanged = vi.fn();
    render(<IncomingJobCard job={JOB} now={NOW} onChanged={onChanged} />);

    fireEvent.click(screen.getByRole("button", { name: /ask clarification/i }));
    fireEvent.change(screen.getByLabelText(/clarification question/i), {
      target: { value: "Is the sink fully blocked?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^send$/i }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());

    const clarifyCall = fetchMock.mock.calls.find(
      ([url, init]) => url === "/api/jobs/job-1/messages" && init?.method === "POST"
    );
    expect(clarifyCall).toBeDefined();
    expect(JSON.parse((clarifyCall![1] as RequestInit).body as string)).toEqual({
      content: "Is the sink fully blocked?",
    });
  });

  it("shows an error when the accept fails", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, error: "Job was claimed by another worker" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      })
    );
    render(<IncomingJobCard job={JOB} now={NOW} onChanged={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /accept offer/i }));
    await waitFor(() =>
      expect(screen.getByText(/Job was claimed by another worker/)).toBeInTheDocument()
    );
  });
});