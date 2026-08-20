import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  GEMINI_MODEL,
  normalizeGeminiJob,
  understandJobInput,
} from "@/lib/job/ai";
import { INSPECTION_FEES } from "@/lib/job/analyze";

const REAL_KEY = process.env.GEMINI_API_KEY;

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
  // restore/delete the key so tests do not leak state
  if (REAL_KEY === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    Object.defineProperty(process.env, "GEMINI_API_KEY", {
      value: REAL_KEY,
      configurable,
    });
  }
});

describe("normalizeGeminiJob", () => {
  it("maps the snake_case Gemini payload onto an AnalysisResult", () => {
    const r = normalizeGeminiJob({
      category: "electrician",
      subcategory: "wiring_fault",
      description: "Ghar ki wiring kharab hai",
      required_skills: ["wiring", "fault finding"],
      urgency: "emergency",
      safety_flags: ["short circuit"],
      estimated_price_min: 1500,
      estimated_price_max: 4000,
      confidence: 0.92,
      clarification_required: false,
    });

    expect(r.category).toBe("electrician");
    expect(r.estimate_min).toBe(1500);
    expect(r.estimate_max).toBe(4000);
    expect(r.urgency).toBe("emergency");
    expect(r.clarification_required).toBe(false);
    expect(r.inspection_fee).toBe(INSPECTION_FEES.electrician);
  });

  it("nulls an unknown category and zeroes the inspection fee", () => {
    const r = normalizeGeminiJob({
      category: "astrologer",
      urgency: "normal",
      estimated_price_min: 100,
      estimated_price_max: 200,
      clarification_required: false,
    } as unknown as object);
    expect(r.category).toBeNull();
    expect(r.inspection_fee).toBe(0);
  });

  it("falls back to category estimates when prices are missing", () => {
    const r = normalizeGeminiJob({
      category: "plumber",
      subcategory: "leak",
      urgency: "normal",
      clarification_required: false,
    } as unknown as object);
    expect(r.estimate_min).toBeGreaterThan(0);
    expect(r.estimate_max).toBeGreaterThan(r.estimate_min);
    expect(r.confidence).toBe(0);
  });

  it("clamps confidence and keeps the clarification question", () => {
    const r = normalizeGeminiJob({
      category: null,
      urgency: "normal",
      confidence: 2.5,
      clarification_required: true,
      clarification_question: "Pani se related masla hai?",
    });
    expect(r.confidence).toBe(1);
    expect(r.clarification_required).toBe(true);
    expect(r.clarification_question).toBe("Pani se related masla hai?");
  });
});

describe("understandJobInput", () => {
  it("falls back to the keyword engine when no GEMINI_API_KEY is set", async () => {
    delete process.env.GEMINI_API_KEY;
    const r = await understandJobInput({ text: "Bathroom ka tap leak ho raha hai" });
    expect(r.source).toBe("fallback");
    expect(r.understanding.category).toBe("plumber");
  });

  it("returns a clarification question on the first unclear round", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        category: null,
                        subcategory: "",
                        description: "samajh nahi aya",
                        required_skills: [],
                        urgency: "normal",
                        safety_flags: [],
                        estimated_price_min: 0,
                        estimated_price_max: 0,
                        confidence: 0.4,
                        clarification_required: true,
                        clarification_question: "Kya masla hai? Bijli ya paani?",
                      }),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200 }
        )
      )
    );

    const r = await understandJobInput({ text: "kuch toh masla hai" });
    expect(r.source).toBe("gemini");
    expect(r.understanding.clarification_required).toBe(true);
    expect(r.clarification_question).toBe("Kya masla hai? Bijli ya paani?");
  });

  it("commits on round two even when the model is still unsure", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        category: null,
                        urgency: "normal",
                        confidence: 0.3,
                        clarification_required: true,
                      }),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200 }
        )
      )
    );

    const r = await understandJobInput({ text: "kuchbhi", clarification: "bijli" });
    expect(r.source).toBe("gemini");
    expect(r.manual_fallback).toBe(true);
    expect(r.clarification_question).toBeUndefined();
  });

  it("falls back to the keyword engine when Gemini errors out", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );

    const r = await understandJobInput({ text: "Nalka leak ho raha hai" });
    expect(r.source).toBe("fallback");
    expect(r.understanding.category).toBe("plumber");
  });

  it("includes the clarify answer in the round-two prompt to the model", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const send = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      category: "electrician",
                      urgency: "normal",
                      confidence: 0.9,
                      clarification_required: false,
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", send);

    await understandJobInput({ text: "kuchbhi", clarification: "bijli" });

    expect(send).toHaveBeenCalledTimes(1);
    const [, init] = send.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.contents[0].parts[0].text).toContain("User clarification: bijli");
    expect(GEMINI_MODEL).toMatch(/gemini/);
  });
});