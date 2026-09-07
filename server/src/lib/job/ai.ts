import {
  AnalysisResult,
  analyzeJobInput,
  CATEGORY_ESTIMATES,
  inspectionFeeFor,
} from "./analyze.js";

import type { ComplexityLevel } from "./pricing.js";
export const GEMINI_MODEL =
  process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";

const WORKER_CATEGORIES = [
  "plumber",
  "electrician",
  "ac_technician",
  "carpenter",
];
const URGENCY_LEVELS = ["normal", "potentially_urgent", "emergency"];

/** Max time (ms) for any single external API call. */
const API_TIMEOUT_MS = 10_000;
/** Max retries for transient Gemini errors (429, 5xx, network). */
const GEMINI_MAX_RETRIES = 2;
/** Base delay (ms) for exponential backoff. */
const RETRY_BASE_DELAY_MS = 500;
/** Max total time (ms) for the AssemblyAI polling loop. */
const ASSEMBLYAI_POLL_DEADLINE_MS = 20_000;
/** Interval (ms) between AssemblyAI poll attempts. */
const ASSEMBLYAI_POLL_INTERVAL_MS = 1_500;
const ASSEMBLYAI_LANGUAGE_CODE =
  (process.env.ASSEMBLYAI_LANGUAGE_CODE || "ur").trim().toLowerCase();
const VALID_ASSEMBLYAI_LANGUAGE_CODES = new Set(["en", "ur"]);

export interface AiImageInput {
  mime: string;
  data: string; // base64 (no data: prefix)
}

export interface AiUnderstandOptions {
  text?: string;
  image?: AiImageInput;
  /** Round-two answer the user gives to the clarification question. */
  clarification?: string;
}

export interface AiUnderstandResult {
  source: "gemini" | "fallback";
  understanding: AnalysisResult;
  /** Set on round 1 when the model needs more information. */
  clarification_question?: string;
  clarification_options?: string[];
  /** Set on round 2 when the model is still unclear -> show manual pickers. */
  manual_fallback?: boolean;
}

export type NormalizedGeminiJob = AnalysisResult & {
  clarification_question?: string;
  clarification_options?: string[];
};

interface GeminiRawJob {
  category?: string | null;
  subcategory?: string;
  description?: string;
  required_skills?: string[];
  urgency?: string;
  safety_flags?: string[];
  estimated_price_min?: number;
  estimated_price_max?: number;
  confidence?: number;
  clarification_required?: boolean;
  clarification_question?: string;
  clarification_options?: string[];
  complexity?: string;
}

export const DEFAULT_CLARIFICATION_OPTIONS = [
  "Bijli / electrician",
  "Pani / plumber",
  "AC / cooling",
  "Lakri / carpenter",
];

export const SYSTEM_PROMPT = `You are Ustad — an expert job-classification engine for a Pakistani home-repair marketplace. Your ONLY job is to classify the user's problem into a bookable service category, extract structured fields, and return strict JSON. No conversational text. No markdown. No explanation.

## Input
The user speaks in Roman Urdu, Urdu (نعری/اردو), or English. They may mix languages mid-sentence. Transcription may contain typos or phonetic spellings. Understand the INTENT behind colloquial phrasing.

Common Roman Urdu patterns you MUST recognize:
- "bijli" / "light" / "electricity" → electrician
- "pani" / "naala" / "nalka" / "tap" / "commode" / "geyser" → plumber
- "AC" / "air conditioner" / "cooling" / "compressor" → ac_technician
- "darwaza" / "almari" / "furniture" / "lakri" / "table" / "chair" → carpenter

## Output Schema — return ONLY this JSON, nothing else:
{
  "category": "plumber" | "electrician" | "ac_technician" | "carpenter" | "unknown",
  "subcategory": "<specific subcategory string, e.g. 'switch_sparking', 'pipe_leakage', 'ac_gas_refill', 'door_lock'>",
  "description": "<2-3 sentence summary of the problem in the user's language>",
  "required_skills": ["<canonical skill tags matching the problem — use snake_case>"],
  "urgency": "normal" | "potentially_urgent" | "emergency",
  "safety_flags": ["<only if urgency is emergency or potentially_urgent>"],
  "estimated_price_min": <integer PKR, conservative lower bound>,
  "estimated_price_max": <integer PKR, conservative upper bound>,
  "confidence": <float 0.0–1.0>,
  "clarification_required": <boolean>,
  "clarification_question": "<string or null — ONE short question in user's language>",
  "clarification_options": ["<2–5 short checkbox-friendly options>"],
  "complexity": "low" | "medium" | "high"
}

## Classification Rules

### Category Detection
1. Match the PRIMARY symptom, not secondary mentions. "AC pani se connected hai but compressor kaam nahi kar raha" → category is ac_technician (compressor is the core issue).
2. If TWO categories are plausible, pick the one that matches the PRIMARY complaint. Mentioning "bijli" in a plumbing complaint does NOT make it electrician.
3. If truly ambiguous (50/50), set category to the most likely one, confidence < 0.6, and trigger clarification.
4. NEVER return "unknown" unless the input is completely unintelligible or unrelated to home repair.

### Required Skills (canonical tags)
Use EXACT snake_case tags from this list when applicable:
- electrician: electrical_fault, switch_repair, wiring, fan_installation, breaker_issue, short_circuit, light_fitting, ups_wiring, inverter_installation, dimmer_fix
- plumber: pipe_leak, faucet_repair, tap_repair, drain_cleaning, geyser_fitting, motor_pump, tank_cleaning, commode_repair, sink_blockage, nalka_fix, pipe_fitting
- ac_technician: ac_cooling, gas_refilling, ac_service, split_ac_installation, compressor_replacement, filter_cleaning, inverter_pcb_repair, ac_installation, deep_cleaning
- carpenter: door_lock_repair, door_alignment, furniture_repair, cabinet_installation, wardrobe_hinge, wood_polishing, bed_repair, drawer_channel, table_repair

### Urgency Classification
- **emergency**: sparks/chingari, gas smell/gas ki boo, burning smell, fire/aag, exposed/bare wire, electric shock, short circuit, water flooding, burst pipe
- **potentially_urgent**: power outage/light band, fuse blowout, complete AC failure in summer, major water leak, sewage backup
- **normal**: everything else — routine repairs, maintenance, installations

### Safety Flags (only when urgency ≥ potentially_urgent)
Examples: "Electrical hazard — do not touch exposed wires", "Gas leak risk — ventilate area", "Water damage risk — shut off main valve", "Fire risk — disconnect power"

### Price Estimation (PKR, Pakistan market 2025)
Be CONSERVATIVE. These are rough placeholders; the actual price is set by the worker after inspection.
- Simple repair (faucet, switch, hinge): 800–2500 PKR
- Medium repair (pipe, wiring, AC service): 2000–5000 PKR
- Complex job (full wiring, compressor, furniture install): 4000–12000 PKR
- Emergency surcharge: add 30–50% to the above ranges

### Clarification Flow
- If confidence < 0.65 OR category is ambiguous → set clarification_required = true
- Ask ONE short, specific question in the user's language (Roman Urdu preferred)
- Provide 2–5 checkbox-friendly options that cover the most likely categories
- On round 2 (when clarification is provided): COMMIT to the best category even if still somewhat uncertain. Do NOT ask a second question.

### Complexity
- **low**: simple adjustment, cleaning, tightening, minor fix (< 30 min)
- **medium**: standard repair, part replacement, routine service (30–90 min)
- **high**: full installation, major rewiring, compressor replacement, multi-part work, renovation

## Critical Rules
1. Return ONLY the JSON object. No preamble, no "Here is", no markdown fences.
2. description must be a clear 2–3 sentence summary, not a transcript.
3. required_skills must use the canonical snake_case tags listed above.
4. This is a CLASSIFICATION step, not a diagnosis or binding price quote.
5. If the input is completely irrelevant (e.g., "hello", poetry, unrelated), set category to "unknown", confidence to 0.1, and ask one clarification question about what repair they need.`;

function geminiEndpoint(apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

function coerceToArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .map((s) => s.trim().toLowerCase())
    .filter((s, idx, arr) => arr.indexOf(s) === idx);
}

function coerceDisplayArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((s) => s.trim())
    .filter((s, idx, arr) => arr.indexOf(s) === idx);
}

function coerceNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value ?? NaN);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function normalizeGeminiJob(raw: unknown): NormalizedGeminiJob {
  const job = (raw ?? {}) as GeminiRawJob;
  const category = WORKER_CATEGORIES.includes(job.category ?? "")
    ? (job.category as NonNullable<AnalysisResult["category"]>)
    : null;
  const urgency = URGENCY_LEVELS.includes(job.urgency ?? "")
    ? (job.urgency as NonNullable<AnalysisResult["urgency"]>)
    : "normal";
  const estimates = category ? CATEGORY_ESTIMATES[category] : null;
  const complexity = ["low", "medium", "high"].includes(job.complexity ?? "")
    ? (job.complexity as ComplexityLevel)
    : "medium";
  const clarificationOptions = coerceDisplayArray(job.clarification_options).slice(0, 5);

  return {
    category,
    subcategory: typeof job.subcategory === "string" ? job.subcategory : "",
    description: typeof job.description === "string" ? job.description : "",
    required_skills: coerceToArray(job.required_skills),
    urgency,
    safety_flags: coerceToArray(job.safety_flags),
    confidence: Math.min(1, Math.max(0, coerceNumber(job.confidence, 0))),
    clarification_required: job.clarification_required === true,
    estimate_min: coerceNumber(job.estimated_price_min, estimates?.min ?? 0),
    estimate_max: coerceNumber(job.estimated_price_max, estimates?.max ?? 0),
    inspection_fee: inspectionFeeFor(category),
    complexity,
    ...(typeof job.clarification_question === "string"
      ? { clarification_question: job.clarification_question }
      : {}),
    ...(clarificationOptions.length > 0
      ? { clarification_options: clarificationOptions }
      : {}),
  };
}

/** Returns true for transient errors worth retrying (429, 5xx, network). */
function isRetryable(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "TimeoutError") return true;
  if (error instanceof TypeError) return true; // network errors
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("429") || msg.includes("rate limit")) return true;
    if (msg.includes("500") || msg.includes("502") || msg.includes("503")) return true;
    if (msg.includes("econnreset") || msg.includes("fetch")) return true;
  }
  return false;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function geminiUnderstand(
  input: string,
  image: AiImageInput | undefined,
  apiKey: string,
): Promise<NormalizedGeminiJob> {
  const parts: Array<Record<string, unknown>> = [];
  if (image) {
    parts.push({ inline_data: { mime_type: image.mime, data: image.data } });
  }
  parts.push({ text: input || "Analyze the attached photo of the problem." });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= GEMINI_MAX_RETRIES; attempt++) {
    try {
      console.log(`[gemini] Attempt ${attempt + 1}/${GEMINI_MAX_RETRIES + 1}. Calling API...`);
      const response = await fetch(geminiEndpoint(apiKey), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
          },
        }),
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error("[gemini] API error:", response.status, errorText.substring(0, 200));
        const err = new Error(
          `Gemini API ${response.status}: ${errorText}`,
        );
        // 429 and 5xx are retryable; 4xx (except 429) are not
        if (response.status === 429 || response.status >= 500) {
          lastError = err;
          if (attempt < GEMINI_MAX_RETRIES) {
            await sleep(RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
            continue;
          }
        }
        throw err;
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const modelText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!modelText) {
        console.error("[gemini] No candidates returned. Raw:", JSON.stringify(data).substring(0, 300));
        throw new Error("Gemini returned no candidates");
      }

      console.log("[gemini] Raw response:", modelText.substring(0, 200));
      let parsed: unknown;
      try {
        parsed = JSON.parse(modelText);
      } catch {
        throw new Error("Gemini returned malformed JSON");
      }
      return normalizeGeminiJob(parsed);
    } catch (error) {
      if (error instanceof Error && isRetryable(error) && attempt < GEMINI_MAX_RETRIES) {
        lastError = error;
        await sleep(RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
        continue;
      }
      throw error;
    }
  }

  // Should not reach here, but just in case
  throw lastError ?? new Error("Gemini failed after retries");
}

/**
 * Upload audio to AssemblyAI and poll for transcription.
 * Returns the transcribed text or throws on failure.
 */
async function transcriptionFromAudio(
  audio: Buffer,
  mime: string,
  apiKey: string,
): Promise<string> {
  const auth = { headers: { Authorization: apiKey } };
  console.log("[assemblyai] Starting transcription. Audio size:", audio.length, "bytes, MIME:", mime);

  // Step 1: Upload audio (10s timeout)
  const uploadBody = new Uint8Array(audio);
  console.log("[assemblyai] Uploading audio to AssemblyAI...");
  const upload = await fetch("https://api.assemblyai.com/v2/upload", {
    method: "POST",
    headers: {
      "Content-Type": mime || "application/octet-stream",
      ...auth.headers,
    },
    body: uploadBody,
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
  if (!upload.ok) {
    const errorText = await upload.text().catch(() => "");
    console.error("[assemblyai] Upload FAILED:", upload.status, errorText);
    throw new Error(
      `AssemblyAI upload ${upload.status}: ${upload.statusText}${errorText ? ` - ${errorText}` : ""}`,
    );
  }
  const uploaded = (await upload.json()) as { upload_url?: string };
  if (!uploaded.upload_url) {
    throw new Error("AssemblyAI upload missing upload_url");
  }
  console.log("[assemblyai] Upload successful. Creating transcript job...");

  // Step 2: Create transcript job with a locked language so it stays in the
  // supported app languages instead of auto-detecting unrelated speech.
  const languageCode = VALID_ASSEMBLYAI_LANGUAGE_CODES.has(
    ASSEMBLYAI_LANGUAGE_CODE,
  )
    ? ASSEMBLYAI_LANGUAGE_CODE
    : "ur";

  const created = await fetch("https://api.assemblyai.com/v2/transcript", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth.headers },
    body: JSON.stringify({
      audio_url: uploaded.upload_url,
      language_code: languageCode,
    }),
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
  if (!created.ok) {
    const errText = await created.text().catch(() => "");
    console.error("[assemblyai] Transcript create FAILED:", created.status, errText);
    throw new Error(`AssemblyAI transcript create ${created.status}`);
  }
  const createdData = (await created.json()) as { id?: string };
  const transcriptId = createdData.id;
  if (!transcriptId) {
    throw new Error("AssemblyAI transcript missing id");
  }
  console.log("[assemblyai] Transcript job created. ID:", transcriptId, "Polling...");

  // Step 3: Poll for completion (20s total deadline, 10s per poll)
  const pollDeadline = Date.now() + ASSEMBLYAI_POLL_DEADLINE_MS;
  let pollCount = 0;
  for (;;) {
    if (Date.now() > pollDeadline) {
      console.error("[assemblyai] Polling timed out after", ASSEMBLYAI_POLL_DEADLINE_MS, "ms");
      throw new Error("AssemblyAI transcription timed out");
    }
    await sleep(ASSEMBLYAI_POLL_INTERVAL_MS);
    pollCount += 1;
    const status = await fetch(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
      {
        headers: { "Content-Type": "application/json", ...auth.headers },
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      },
    );
    if (!status.ok) {
      const errText = await status.text().catch(() => "");
      console.error("[assemblyai] Poll status FAILED:", status.status, errText);
      throw new Error(`AssemblyAI status ${status.status}`);
    }
    const state = (await status.json()) as {
      status?: string;
      text?: string;
      error?: string;
    };
    console.log(`[assemblyai] Poll #${pollCount}: status=${state.status}`);
    if (state.status === "completed") {
      console.log("[assemblyai] Transcription complete:", (state.text ?? "").substring(0, 100));
      return (state.text ?? "").trim();
    }
    if (state.status === "error" || state.error) {
      console.error("[assemblyai] Transcription error:", state.error ?? state.status);
      throw new Error(
        `AssemblyAI transcription error: ${state.error ?? state.status}`,
      );
    }
  }
}

export async function transcribeAudio(
  audio: Buffer,
  mime: string,
): Promise<string> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    console.error("[assemblyai] ASSEMBLYAI_API_KEY is not set!");
    throw new Error(
      "ASSEMBLYAI_API_KEY is not configured. Please set it in your environment variables.",
    );
  }
  console.log("[assemblyai] API key found. Starting transcription...");
  const text = await transcriptionFromAudio(audio, mime, apiKey);
  console.log("[assemblyai] Final transcript:", text.substring(0, 120));
  if (!text || text.length < 2) {
    throw new Error(
      "Transcription was empty or too short. The audio may be silent or unclear.",
    );
  }
  return text;
}

/** Clean raw transcript into a readable problem description. */
function cleanDescription(raw: string): string {
  if (!raw) return raw;
  let cleaned = raw
    .replace(/\b(haan|ji|bhai|yaar|acha|theek hai|ok|okay)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned.length > 5 ? cleaned : raw;
}

export async function understandJobInput(
  opts: AiUnderstandOptions,
): Promise<AiUnderstandResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const text = (opts.text ?? "").trim();
  const combined = [
    text,
    opts.clarification ? `User clarification: ${opts.clarification}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (!apiKey || (!combined && !opts.image)) {
    console.log("[ai] No Gemini API key or empty input, using fallback engine");
    return fallbackResult(text);
  }

  try {
    console.log("[ai] Calling Gemini understand. Text:", combined.substring(0, 100), "Has image:", !!opts.image);
    let normalized = await geminiUnderstand(
      combined || "About the attached photo.",
      opts.image,
      apiKey,
    );

    // If category is unknown or confidence is low, retry ONCE with a stronger nudge
    if (!normalized.category || normalized.confidence < 0.5) {
      console.log("[ai] Low confidence or unknown category. Retrying with nudge...");
      const nudgeInput = `The user said: "${combined}". Classify this into exactly ONE category: plumber, electrician, ac_technician, or carpenter. Even if uncertain, pick the closest match. Do NOT return "unknown".`;
      try {
        const retry = await geminiUnderstand(
          nudgeInput,
          opts.image,
          apiKey,
        );
        if (retry.category) {
          normalized = retry;
        }
      } catch {
        // Keep first attempt result
      }
    }

    // Force a category if still missing — pick the best guess from the keyword engine
    if (!normalized.category) {
      console.log("[ai] Still no category after retry. Using keyword fallback for category only.");
      const keywordResult = analyzeJobInput(combined);
      if (keywordResult.category) {
        normalized = { ...normalized, category: keywordResult.category };
      }
    }

    // Clean up the description — make it a proper summary, not raw transcript
    const cleanedDesc = cleanDescription(normalized.description || combined);

    console.log("[ai] Final result. Category:", normalized.category, "Confidence:", normalized.confidence);
    return {
      source: "gemini",
      understanding: {
        ...normalized,
        description: cleanedDesc,
      },
    };
  } catch (error) {
    console.error(
      "[ai] Gemini understand failed, falling back to keyword engine",
      error,
    );
    return fallbackResult(text);
  }
}

function fallbackResult(text: string): AiUnderstandResult {
  const understanding = analyzeJobInput(text);
  return {
    source: "fallback",
    understanding,
  };
}
