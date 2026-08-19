// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VoiceCapture from "./VoiceCapture";

class FakeSpeechRecognition {
  static instances: FakeSpeechRecognition[] = [];
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  start = vi.fn();
  stop = vi.fn();

  constructor() {
    FakeSpeechRecognition.instances.push(this);
  }

  fireResult(transcript: string, isFinal: boolean): void {
    const event = {
      results: {
        0: { 0: { transcript, confidence: 1 }, isFinal },
        length: 1,
      },
    };
    this.onresult?.(event);
  }

  fireError(error: string): void {
    this.onerror?.({ error });
  }

  fireEnd(): void {
    this.onend?.();
  }
}

beforeEach(() => {
  FakeSpeechRecognition.instances = [];
  vi.stubGlobal("SpeechRecognition", FakeSpeechRecognition);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("VoiceCapture", () => {
  it("shows a disabled note when speech recognition is unsupported", () => {
    vi.unstubAllGlobals();
    render(<VoiceCapture onFinal={vi.fn()} />);
    expect(screen.getByText(/voice not supported/i)).toBeDisabled();
  });

  it("starts listening in Urdu and toggles the button on click", async () => {
    const user = userEvent.setup();
    render(<VoiceCapture onFinal={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /voice note/i }));

    const rec = FakeSpeechRecognition.instances[0];
    expect(rec).toBeDefined();
    expect(rec.lang).toBe("ur-PK");
    expect(rec.continuous).toBe(true);
    expect(rec.interimResults).toBe(true);
    expect(rec.start).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /stop listening/i })).toBeInTheDocument();
  });

  it("shows interim transcript while speaking", async () => {
    const user = userEvent.setup();
    render(<VoiceCapture onFinal={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /voice note/i }));

    const rec = FakeSpeechRecognition.instances[0];
    act(() => rec.fireResult("geyser", false));
    act(() => rec.fireResult("geyser on", false));

    expect(screen.getByText("geyser on", { exact: false })).toBeInTheDocument();
  });

  it("delivers the final transcript and appends it visibly", async () => {
    const user = userEvent.setup();
    const onFinal = vi.fn();
    render(<VoiceCapture onFinal={onFinal} />);
    await user.click(screen.getByRole("button", { name: /voice note/i }));

    const rec = FakeSpeechRecognition.instances[0];
    act(() => rec.fireResult("geyser on nahi ho rahi", true));
    act(() => rec.fireEnd());

    expect(onFinal).toHaveBeenCalledWith("geyser on nahi ho rahi");
    expect(screen.getByText(/geyser on nahi ho rahi/)).toBeInTheDocument();
  });

  it("stops listening when the stop button is clicked", async () => {
    const user = userEvent.setup();
    render(<VoiceCapture onFinal={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /voice note/i }));

    const rec = FakeSpeechRecognition.instances[0];
    await user.click(screen.getByRole("button", { name: /stop listening/i }));

    expect(rec.stop).toHaveBeenCalledTimes(1);
  });

  it("shows a message on recognition errors and resets the button", async () => {
    const user = userEvent.setup();
    render(<VoiceCapture onFinal={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /voice note/i }));

    const rec = FakeSpeechRecognition.instances[0];
    act(() => rec.fireError("no-speech"));
    act(() => rec.fireEnd());

    expect(screen.getByText(/couldn't hear anything/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /voice note/i })).toBeInTheDocument();
  });
});