// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VoiceCapture from "./VoiceCapture";

async function holdThenRelease() {
  const mic = screen.getByRole("button", { name: "Hold to speak" });
  await act(async () => {
    fireEvent.pointerDown(mic);
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  await act(async () => {
    fireEvent.pointerUp(mic);
  });
}

class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = [];
  mimeType = "audio/webm";
  state: "inactive" | "recording" = "inactive";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;

  start = vi.fn(() => {
    this.state = "recording";
  });

  stop = vi.fn(() => {
    this.state = "inactive";
    const blob = new Blob([new Uint8Array([0x1f, 0xa6])], { type: this.mimeType });
    this.ondataavailable?.({ data: blob });
    this.onstop?.();
  });

  constructor(public stream: unknown) {
    FakeMediaRecorder.instances.push(this);
  }
}

const fetchMock = vi.fn();

const WORKERS = {
  best: {
    id: "w1",
    name: "Muhammad Imran",
    category: "electrician",
    skills: ["electrical_fault", "switch_repair"],
    verified: true,
    verification_level: "identity_reviewed",
    ustad_score: 88,
    completed_jobs: 55,
    average_rating: 4.5,
    skills_match: 100,
    final_score: 95,
  },
  others: [],
};

const UNDERSTANDING = {
  category: "electrician",
  subcategory: "electrical_fault",
  description: "Switch sparks lag rahi hai",
  required_skills: ["electrical_fault", "switch_repair"],
  urgency: "emergency",
  safety_flags: ["sparking_switch"],
  confidence: 0.98,
  clarification_required: false,
  estimate_min: 1500,
  estimate_max: 4000,
  inspection_fee: 350,
};

function okResponse(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function stubRecorderGlobals() {
  vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }),
    },
  });
}

beforeEach(() => {
  FakeMediaRecorder.instances = [];
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("VoiceCapture", () => {
  it("shows only a mic button with no forms", () => {
    render(<VoiceCapture />);
    expect(screen.getByRole("button", { name: "Hold to speak" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  it("shows an error when speech is not supported and lets the user reset", async () => {
    const user = userEvent.setup();
    render(<VoiceCapture />);

    await user.click(screen.getByRole("button", { name: "Hold to speak" }));

    expect(await screen.findByText(/voice recording is not supported/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByRole("button", { name: "Hold to speak" })).toBeInTheDocument();
  });

  it("records audio, analyzes it, and shows category, urgency, price and the best worker", async () => {
    stubRecorderGlobals();
    render(<VoiceCapture />);

    fetchMock.mockResolvedValueOnce(
      okResponse({ understanding: UNDERSTANDING, workers: WORKERS, source: "gemini" })
    );

    await holdThenRelease();

    expect(await screen.findByText("Best match")).toBeInTheDocument();
    expect(screen.getByText("Electrician")).toBeInTheDocument();
    expect(screen.getByText("Emergency")).toBeInTheDocument();
    expect(screen.getByText("98% confident")).toBeInTheDocument();
    expect(screen.getByText("PKR 350 visit fee · then PKR 1,500 – PKR 4,000")).toBeInTheDocument();
    expect(screen.getByText("Muhammad Imran")).toBeInTheDocument();
    expect(screen.getByText(/sparking_switch/)).toBeInTheDocument();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/ai/understand");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);

    const cta = screen.getByRole("link", { name: "Set price & find workers" });
    expect(cta.getAttribute("href")).toContain("/login?next=");
    expect(cta.getAttribute("href")).toContain("%2Fnew-work%3Fmethod%3Dvoice");
    expect(cta.getAttribute("href")).toContain("urgency%3Demergency");
  });

  it("asks one clarifying question then commits the answer", async () => {
    stubRecorderGlobals();
    const user = userEvent.setup();
    render(<VoiceCapture />);

    fetchMock.mockResolvedValueOnce(
      okResponse({
        understanding: { ...UNDERSTANDING, category: null, confidence: 0.3 },
        clarification_question: "Kya masla hai? Bijli ya paani?",
        workers: { best: null, others: [] },
      })
    );
    await holdThenRelease();

    expect(await screen.findByText("Kya masla hai? Bijli ya paani?")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/bijli/m), "bijli ka masla hai");
    fetchMock.mockResolvedValueOnce(
      okResponse({ understanding: UNDERSTANDING, workers: WORKERS, source: "gemini" })
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("Electrician")).toBeInTheDocument();
    const [, secondCall] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(String(secondCall.body)).clarification).toContain("bijli");
  });

  it("shows checkbox choices when the AI returns clarification options", async () => {
    stubRecorderGlobals();
    const user = userEvent.setup();
    render(<VoiceCapture />);

    fetchMock.mockResolvedValueOnce(
      okResponse({
        understanding: { ...UNDERSTANDING, category: null, confidence: 0.3 },
        clarification_question: "Kis qisam ka kaam hai?",
        clarification_options: ["Bijli", "Pani", "AC", "Lakri"],
        workers: { best: null, others: [] },
      })
    );
    await holdThenRelease();

    expect(await screen.findByRole("checkbox", { name: "Bijli" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: "Bijli" }));
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("shows the server error and lets the user retry", async () => {
    stubRecorderGlobals();
    const user = userEvent.setup();
    render(<VoiceCapture />);

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: false, error: "Something went wrong. Please try again." }),
        { status: 500 }
      )
    );
    await holdThenRelease();

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByRole("button", { name: "Hold to speak" })).toBeInTheDocument();
  });
});
