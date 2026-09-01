// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VoiceCapture from "./VoiceCapture";

async function tapToRecord(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Start recording" }));
  await screen.findByRole("button", { name: "Stop recording" });
  await user.click(screen.getByRole("button", { name: "Stop recording" }));
}

class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = [];
  static supportedMimeTypes = new Set([
    "audio/webm;codecs=opus",
    "audio/webm",
  ]);
  static nextBlobSize = 2048;
  static isTypeSupported(mimeType: string) {
    return FakeMediaRecorder.supportedMimeTypes.has(mimeType);
  }

  mimeType: string;
  state: "inactive" | "recording" = "inactive";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;

  start = vi.fn(() => {
    this.state = "recording";
  });

  stop = vi.fn(() => {
    this.state = "inactive";
    const blob = new Blob([new Uint8Array(FakeMediaRecorder.nextBlobSize)], {
      type: this.mimeType,
    });
    this.ondataavailable?.({ data: blob });
    this.onstop?.();
  });

  emitError = vi.fn(() => {
    this.onerror?.();
  });

  constructor(public stream: unknown, options?: { mimeType?: string }) {
    this.mimeType = options?.mimeType ?? "audio/webm";
    FakeMediaRecorder.instances.push(this);
  }
}

class FakeAnalyser {
  static sample = 128;
  fftSize = 256;
  disconnect = vi.fn();
  getByteTimeDomainData = vi.fn((data: Uint8Array) => {
    data.fill(FakeAnalyser.sample);
  });
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state: AudioContextState = "running";
  analyser = new FakeAnalyser();
  createMediaStreamSource = vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
  createAnalyser = vi.fn(() => this.analyser);
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);

  constructor() {
    FakeAudioContext.instances.push(this);
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
    geolocation: {
      getCurrentPosition: vi.fn((success: (position: unknown) => void) =>
        success({ coords: { latitude: 33.6844, longitude: 73.0479 } })
      ),
    },
  });
}

beforeEach(() => {
  FakeMediaRecorder.instances = [];
  FakeMediaRecorder.supportedMimeTypes = new Set([
    "audio/webm;codecs=opus",
    "audio/webm",
  ]);
  FakeMediaRecorder.nextBlobSize = 2048;
  FakeAudioContext.instances = [];
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("VoiceCapture", () => {
  it("shows only a mic button with no forms", () => {
    render(<VoiceCapture />);
    expect(screen.getByRole("button", { name: "Start recording" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  it("shows an error when speech is not supported and lets the user reset", async () => {
    const user = userEvent.setup();
    render(<VoiceCapture />);

    await user.click(screen.getByRole("button", { name: "Start recording" }));

    expect(await screen.findByText(/voice recording is not supported/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByRole("button", { name: "Start recording" })).toBeInTheDocument();
  });

  it("records audio, analyzes it, and shows category, urgency, price and the best worker", async () => {
    stubRecorderGlobals();
    const user = userEvent.setup();
    render(<VoiceCapture />);

    fetchMock.mockResolvedValueOnce(
      okResponse({ understanding: UNDERSTANDING, workers: WORKERS, source: "gemini" })
    );

    await tapToRecord(user);

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

  it("keeps the dashboard result variant and omits the landing CTA", async () => {
    stubRecorderGlobals();
    const user = userEvent.setup();
    render(<VoiceCapture variant="dashboard" />);
    fetchMock.mockResolvedValueOnce(
      okResponse({ understanding: UNDERSTANDING, workers: WORKERS, source: "gemini" })
    );

    await tapToRecord(user);

    expect(await screen.findByText("Best matches for electrician work")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Set price & find workers" })).not.toBeInTheDocument();
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
    await tapToRecord(user);

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
    await tapToRecord(user);

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
    await tapToRecord(user);

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByRole("button", { name: "Start recording" })).toBeInTheDocument();
  });

  it("uses a supported Safari MIME type and matching upload filename", async () => {
    stubRecorderGlobals();
    FakeMediaRecorder.supportedMimeTypes = new Set(["audio/mp4"]);
    const user = userEvent.setup();
    render(<VoiceCapture />);
    fetchMock.mockResolvedValueOnce(
      okResponse({ understanding: UNDERSTANDING, workers: WORKERS, source: "gemini" })
    );

    await tapToRecord(user);
    await screen.findByText("Electrician");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const audio = (init.body as FormData).get("audio") as File;
    expect(FakeMediaRecorder.instances[0].mimeType).toBe("audio/mp4");
    expect(audio.type).toBe("audio/mp4");
    expect(audio.name).toBe("voice.mp4");
  });

  it("rejects a tiny recording locally without calling the backend", async () => {
    stubRecorderGlobals();
    FakeMediaRecorder.nextBlobSize = 256;
    const user = userEvent.setup();
    render(<VoiceCapture />);

    await tapToRecord(user);

    expect(await screen.findByText(/didn't catch that/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a silent recording using analyser levels without calling the backend", async () => {
    stubRecorderGlobals();
    vi.stubGlobal("AudioContext", FakeAudioContext);
    FakeAnalyser.sample = 128;
    const user = userEvent.setup();
    render(<VoiceCapture />);

    await user.click(screen.getByRole("button", { name: "Start recording" }));
    await screen.findByRole("button", { name: "Stop recording" });
    await waitFor(() =>
      expect(
        FakeAudioContext.instances[0]?.analyser.getByteTimeDomainData
      ).toHaveBeenCalled()
    );
    await user.click(screen.getByRole("button", { name: "Stop recording" }));

    expect(await screen.findByText(/didn't catch that/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not stop when the pointer leaves during a recording", async () => {
    stubRecorderGlobals();
    const user = userEvent.setup();
    render(<VoiceCapture />);

    await user.click(screen.getByRole("button", { name: "Start recording" }));
    const mic = await screen.findByRole("button", { name: "Stop recording" });
    fireEvent.pointerLeave(mic);

    expect(screen.getByRole("button", { name: "Stop recording" })).toBeInTheDocument();
    await user.click(mic);
  });

  it("uses the same tap-to-toggle behavior from the keyboard", async () => {
    stubRecorderGlobals();
    FakeMediaRecorder.nextBlobSize = 256;
    const user = userEvent.setup();
    render(<VoiceCapture />);
    const mic = screen.getByRole("button", { name: "Start recording" });
    mic.focus();

    await user.keyboard("{Enter}");
    await screen.findByRole("button", { name: "Stop recording" });
    await user.keyboard("{Enter}");

    expect(await screen.findByText(/didn't catch that/i)).toBeInTheDocument();
  });

  it("shows an actionable error when MediaRecorder fails", async () => {
    stubRecorderGlobals();
    const user = userEvent.setup();
    render(<VoiceCapture />);

    await user.click(screen.getByRole("button", { name: "Start recording" }));
    await screen.findByRole("button", { name: "Stop recording" });
    FakeMediaRecorder.instances[0].emitError();

    expect(await screen.findByText(/recording failed unexpectedly/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start recording" })).toBeInTheDocument();
  });

  it("prevents duplicate microphone requests while getUserMedia is pending", async () => {
    const resolveStream: { current?: (stream: MediaStream) => void } = {};
    const getUserMedia = vi.fn(
      () => new Promise<MediaStream>((resolve) => {
        resolveStream.current = resolve;
      })
    );
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia },
      geolocation: {
        getCurrentPosition: vi.fn((success: (position: unknown) => void) =>
          success({ coords: { latitude: 33.6844, longitude: 73.0479 } })
        ),
      },
    });
    const user = userEvent.setup();
    render(<VoiceCapture />);
    const mic = screen.getByRole("button", { name: "Start recording" });

    fireEvent.click(mic);
    fireEvent.click(mic);
    expect(getUserMedia).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveStream.current?.({ getTracks: () => [] } as unknown as MediaStream);
      await Promise.resolve();
    });
    expect(FakeMediaRecorder.instances).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Stop recording" }));
  });

  it("shows a non-blocking location notification when location fails and continues with results", async () => {
    stubRecorderGlobals();
    const getCurrentPosition = vi.fn(
      (_success: (position: unknown) => void, failure: (error: unknown) => void) =>
        failure({ code: 1 })
    );
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }),
      },
      geolocation: { getCurrentPosition },
    });
    const user = userEvent.setup();
    render(<VoiceCapture />);
    fetchMock.mockResolvedValueOnce(
      okResponse({ understanding: UNDERSTANDING, workers: WORKERS, source: "gemini" })
    );

    await tapToRecord(user);

    expect(await screen.findByText("Electrician")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalled();
    expect(screen.getByText(/location unavailable/i)).toBeInTheDocument();
  });

  it("aborts a hung understanding request and shows the retryable error", async () => {
    vi.useFakeTimers();
    try {
      stubRecorderGlobals();
      fetchMock.mockReturnValueOnce(new Promise<Response>(() => undefined));
      render(<VoiceCapture />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
        await Promise.resolve();
        await Promise.resolve();
      });
      const stopButton = screen.getByRole("button", { name: "Stop recording" });
      await act(async () => {
        fireEvent.click(stopButton);
        await Promise.resolve();
        await Promise.resolve();
      });
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];

      await act(async () => {
        vi.advanceTimersByTime(18_000);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect((init.signal as AbortSignal).aborted).toBe(true);
      expect(screen.getByText(/took too long|timed out/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("releases the microphone when the component unmounts during recording", async () => {
    const stopTrack = vi.fn();
    vi.stubGlobal("AudioContext", FakeAudioContext);
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] }),
      },
      geolocation: {
        getCurrentPosition: vi.fn((success: (position: unknown) => void) =>
          success({ coords: { latitude: 33.6844, longitude: 73.0479 } })
        ),
      },
    });
    const user = userEvent.setup();
    const view = render(<VoiceCapture />);

    await user.click(screen.getByRole("button", { name: "Start recording" }));
    await screen.findByRole("button", { name: "Stop recording" });
    view.unmount();

    expect(stopTrack).toHaveBeenCalled();
    expect(FakeAudioContext.instances[0]?.close).toHaveBeenCalled();
  });
});
