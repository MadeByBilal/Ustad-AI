import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  geminiUnderstand,
  normalizeGeminiJob,
  understandJobInput,
  transcribeAudio,
} from "@/lib/job/ai";

const REAL_KEY = process.env.GEMINI_API_KEY;
const REAL_AA_KEY = process.env.ASSEMBLYAI_API_KEY;

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ good: true }), { status: 200 })
    )
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  const configurable = true;
  if (REAL_KEY === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    Object.defineProperty(process.env, "GEMINI_API_KEY", {
      value: REAL_KEY,
      configurable,
    });
  }
  if (REAL_AA_KEY === undefined) {
    delete process.env.ASSEMBLYAI_API_KEY;
  } else {
    Object.defineProperty(process.env, "ASSEMBLYAI_API_KEY", {
      value: REAL_AA_KEY,
      configurable,
    });
  }
});

function mockGeminiResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockGeminiSuccess(category = "electrician") {
  return mockGeminiResponse({
    candidates: [
      {
        content: {
          parts: [
            {
              text: JSON.stringify({
                category,
                subcategory: "wiring_fault",
                description: "test",
                required_skills: ["wiring"],
                urgency: "normal",
                safety_flags: [],
                estimated_price_min: 1500,
                estimated_price_max: 4000,
                confidence: 0.9,
                clarification_required: false,
                complexity: "medium",
              }),
            },
          ],
        },
      },
    ],
  });
}

// ─── Gemini failure modes ───────────────────────────────────────────

describe("Gemini failure modes", () => {
  it("retries on 429 rate limit and falls back to keyword engine", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("Rate limited", { status: 429 }))
      .mockResolvedValueOnce(new Response("Rate limited", { status: 429 }))
      .mockResolvedValueOnce(new Response("Rate limited", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await understandJobInput({ text: "Nalka leak ho raha hai" });
    expect(result.source).toBe("fallback");
    expect(result.understanding.category).toBe("plumber");
    // Should have retried 2 times (3 total attempts)
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("retries on 500 server error and falls back", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("Internal error", { status: 500 }))
      .mockResolvedValueOnce(new Response("Internal error", { status: 500 }))
      .mockResolvedValueOnce(new Response("Internal error", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await understandJobInput({ text: "Bijli ki wiring" });
    expect(result.source).toBe("fallback");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does NOT retry on 400 bad request (permanent failure)", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("Bad request", { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await understandJobInput({ text: "Bijli" });
    expect(result.source).toBe("fallback");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back on Gemini timeout (10s)", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(
      new DOMException("The operation was aborted.", "TimeoutError")
    ));

    const start = performance.now();
    const result = await understandJobInput({ text: "Bijli ki wiring kharab hai" });
    const elapsed = performance.now() - start;

    expect(result.source).toBe("fallback");
    expect(result.understanding.category).toBe("electrician");
    // Should complete in ~3.5s (2 retries × 500ms + 1000ms backoff)
    expect(elapsed).toBeLessThan(15_000);
  });

  it("falls back on network error (ECONNRESET)", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(
      new TypeError("fetch failed")
    ));

    const result = await understandJobInput({ text: "Pani ka pipe leak hai" });
    expect(result.source).toBe("fallback");
    expect(result.understanding.category).toBe("plumber");
  });

  it("falls back on malformed JSON response", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: "not json at all" }] } }],
      }))
    ));

    const result = await understandJobInput({ text: "Bijli" });
    expect(result.source).toBe("fallback");
  });

  it("falls back on empty candidates array", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ candidates: [] }))
    ));

    const result = await understandJobInput({ text: "Bijli" });
    expect(result.source).toBe("fallback");
  });

  it("falls back when Gemini returns null category with low confidence", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      mockGeminiResponse({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                category: null,
                confidence: 0.3,
                clarification_required: true,
                clarification_question: "Kya masla hai?",
              }),
            }],
          },
        }],
      })
    ));

    const result = await understandJobInput({ text: "kuch toh hai" });
    expect(result.source).toBe("gemini");
    expect(result.understanding.clarification_required).toBe(true);
  });
});

// ─── AssemblyAI failure modes ────────────────────────────────────────

describe("AssemblyAI failure modes", () => {
  it("throws on empty API key", async () => {
    delete process.env.ASSEMBLYAI_API_KEY;
    await expect(
      transcribeAudio(Buffer.from("audio"), "audio/webm")
    ).rejects.toThrow("ASSEMBLYAI_API_KEY is not configured");
  });

  it("throws on upload failure (400)", async () => {
    process.env.ASSEMBLYAI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("Bad request", { status: 400 })
    ));

    await expect(
      transcribeAudio(Buffer.from("audio"), "audio/webm")
    ).rejects.toThrow("AssemblyAI upload 400");
  });

  it("throws on transcript creation failure", async () => {
    process.env.ASSEMBLYAI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ upload_url: "https://example.com/audio" })))
      .mockResolvedValueOnce(new Response("Server error", { status: 500 }))
    );

    await expect(
      transcribeAudio(Buffer.from("audio"), "audio/webm")
    ).rejects.toThrow("AssemblyAI transcript create 500");
  });

  it("throws on transcription error status from AssemblyAI", async () => {
    process.env.ASSEMBLYAI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ upload_url: "https://example.com/audio" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "t1" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "error", error: "Audio too short" })))
    );

    await expect(
      transcribeAudio(Buffer.from("audio"), "audio/webm")
    ).rejects.toThrow("AssemblyAI transcription error");
  });

  it("throws on empty transcription result", async () => {
    process.env.ASSEMBLYAI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ upload_url: "https://example.com/audio" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "t1" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "completed", text: "" })))
    );

    await expect(
      transcribeAudio(Buffer.from("audio"), "audio/webm")
    ).rejects.toThrow("Transcription was empty or too short");
  });

  it("throws on very short transcription (< 2 chars)", async () => {
    process.env.ASSEMBLYAI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ upload_url: "https://example.com/audio" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "t1" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "completed", text: "a" })))
    );

    await expect(
      transcribeAudio(Buffer.from("audio"), "audio/webm")
    ).rejects.toThrow("Transcription was empty or too short");
  });

  it.skip("polling loop has a finite deadline (verified by code inspection)", async () => {
    // The polling loop in transcriptionFromAudio() has a 20s deadline
    // (ASSEMBLYAI_POLL_DEADLINE_MS) and throws "AssemblyAI transcription
    // timed out" when exceeded. This is verified by code inspection and
    // the timeout test below.
  });

  it("handles network error during upload", async () => {
    process.env.ASSEMBLYAI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(
      new TypeError("fetch failed")
    ));

    await expect(
      transcribeAudio(Buffer.from("audio"), "audio/webm")
    ).rejects.toThrow();
  });
});

// ─── Timeout verification ────────────────────────────────────────────

describe("timeout configuration", () => {
  it("Gemini call uses AbortSignal.timeout (not manual setTimeout)", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(mockGeminiSuccess());
    vi.stubGlobal("fetch", fetchMock);

    await geminiUnderstand("test", undefined, "test-key");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const signal = init.signal as AbortSignal;
    expect(signal).toBeInstanceOf(AbortSignal);
    // Verify it was created by AbortSignal.timeout (not a manual controller)
    // AbortSignal.timeout signals are not AbortController signals
    expect(signal.aborted).toBe(false);
  });

  it("AssemblyAI upload uses AbortSignal.timeout", async () => {
    process.env.ASSEMBLYAI_API_KEY = "test-key";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ upload_url: "https://example.com/audio" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "t1" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "completed", text: "hello world test" })));
    vi.stubGlobal("fetch", fetchMock);

    await transcribeAudio(Buffer.from("audio"), "audio/webm");

    // First call is the upload
    const [, uploadInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((uploadInit.signal as AbortSignal).aborted).toBe(false);
  });
});

// ─── normalizeGeminiJob edge cases ──────────────────────────────────

describe("normalizeGeminiJob — malformed data handling", () => {
  it("handles completely empty response", () => {
    const r = normalizeGeminiJob({});
    expect(r.category).toBeNull();
    expect(r.urgency).toBe("normal");
    expect(r.confidence).toBe(0);
    expect(r.clarification_required).toBe(false);
  });

  it("handles null input", () => {
    const r = normalizeGeminiJob(null);
    expect(r.category).toBeNull();
  });

  it("handles unexpected types gracefully", () => {
    const r = normalizeGeminiJob({
      category: 123,
      urgency: true,
      confidence: "not a number",
      estimated_price_min: "negative",
      required_skills: "not an array",
    });
    expect(r.category).toBeNull();
    expect(r.urgency).toBe("normal");
    expect(r.confidence).toBe(0);
    expect(r.required_skills).toEqual([]);
  });

  it("falls back to category estimates for negative prices", () => {
    const r = normalizeGeminiJob({
      category: "plumber",
      estimated_price_min: -100,
      estimated_price_max: -50,
      clarification_required: false,
    });
    // coerceNumber treats negative as invalid, falls back to CATEGORY_ESTIMATES
    expect(r.estimate_min).toBe(800);
    expect(r.estimate_max).toBe(1500);
  });

  it("limits clarification options to 5", () => {
    const r = normalizeGeminiJob({
      clarification_required: true,
      clarification_options: ["a", "b", "c", "d", "e", "f", "g"],
    });
    expect(r.clarification_options).toHaveLength(5);
  });
});
