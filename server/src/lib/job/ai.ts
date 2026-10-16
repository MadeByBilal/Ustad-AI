import {
  AnalysisResult,
  analyzeJobInput,
  CATEGORY_ESTIMATES,
  inspectionFeeFor,
} from "./analyze.js";

import type { ComplexityLevel } from "./pricing.js";

/**
 * OpenCode inference (OpenAI-compatible chat completions).
 * Accepts either the API root or the full chat-completions URL.
 */
export const OPENCODE_BASE_URL =
  process.env.OPENCODE_BASE_URL?.trim() ||
  "https://opencode.ai/inference/openai/v1/chat/completions";
export const OPENCODE_MODEL =
  process.env.OPENCODE_MODEL?.trim() || "deepseek-v4.1-flash";

const WORKER_CATEGORIES = [
  "plumber",
  "electrician",
  "ac_technician",
  "carpenter",
];
const URGENCY_LEVELS = ["normal", "potentially_urgent", "emergency"];

/** Max time (ms) for any single external API call. */
const API_TIMEOUT_MS = 10_000;
/** Max time (ms) for a single OpenCode chat-completion (models can think long). */
const OPENCODE_TIMEOUT_MS = 15_000;
/** Max retries for transient OpenCode errors (429, 5xx, network). */
const OPENCODE_MAX_RETRIES = 2;
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
  source: "opencode" | "fallback";
  understanding: AnalysisResult;
  /** Set on round 1 when the model needs more information. */
  clarification_question?: string;
  clarification_options?: string[];
  /** Set on round 2 when the model is still unclear -> show manual pickers. */
  manual_fallback?: boolean;
}

export type NormalizedAiJob = AnalysisResult & {
  clarification_question?: string;
  clarification_options?: string[];
};

interface RawAiJob {
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

export const SYSTEM_PROMPT = `You are Ustad — the job-classification engine for a Pakistani home-services marketplace. A customer described a problem (usually by voice, in Roman Urdu, Urdu script, or English, often mixed). Classify it into EXACTLY ONE bookable trade so only the right technicians are shown. Return strict JSON only. No markdown, no explanation.

## The only four trades
- "plumber" — water, drainage and gas-line work.
- "electrician" — electrical work: lights, fans, switches, wiring, breakers, meters, shock/sparks.
- "ac_technician" — air conditioners and cooling appliances: AC units, air coolers, compressors, AC gas.
- "carpenter" — wood and furniture work: doors, windows, cabinets, wardrobes, beds, tables, locks on wood.

## Routing table — decide WHO MUST PHYSICALLY VISIT to fix the PRIMARY complaint
- plumber: tap, nalka, faucet, pipe, leak, leakage, tapak, seepage, drain, naali, commode, toilet, flush, basin, shower, sink, tanki, water tank, motor (water pump), pump, geyser/gizer (water heating), bathroom fittings, gas pipeline/regulator/stove line.
- electrician: light, bulb, tube light, fan, pankha, ceiling fan, exhaust fan, switch, socket, plug, wiring, wire, fuse, breaker, main switch, DB, meter, inverter wiring, UPS, generator, doorbell (ghanti), shock, sparks, chingari, "bijli nahi aa rahi", power outage, regulator.
- ac_technician: AC, split AC, window AC, air conditioner, cooling, "thanda nahi kar raha", compressor, AC gas, gas refill (AC), refrigerant, air cooler, cooler.
- carpenter: door, darwaza, window, khidki, wooden frame, furniture, sofa, table, chair, bed, takht, almari, cabinet, wardrobe, kitchen cabinet, shelf, tala, lock, hinge, drawer, plywood, polish.

## Disambiguation — apply in order
1. The PRIMARY complaint wins. Ask: what is broken, and who fixes THAT? Ignore side mentions of other trades ("bijli ka masla tha, ab pani tapak raha hai" → the active problem is water → plumber).
2. Water vs electricity: if the fix is water flow/leak/blockage → plumber even when electricity is nearby. If the fix is current/light/shock/sparks → electrician even in a wet area.
3. "motor": a water pump / water not rising → plumber. A fan or appliance motor, winding, or burning smell from a fan → electrician.
4. "gas": geyser, kitchen gas pipeline, stove/cylinder regulator → plumber. "AC ki gas"/refrigerant/cooling gas → ac_technician. Gas smell with no appliance named → plumber, urgency emergency, gas-leak safety flag.
5. "pipe": water or drain pipe → plumber. AC copper pipe or AC drain pipe → ac_technician.
6. "fan"/"pankha" → electrician. "cooler"/"air cooler" → ac_technician. Decide by the appliance noun, not by the word "fan".
7. "window": wooden window/frame/lock → carpenter. "window AC" → ac_technician.
8. "light" as a lamp/fixture (light jal gayi, light chali gayi) → electrician, never plumber.
9. "meter", "main board", "DB", "breaker trip" (electricity) → electrician. "meter" is NEVER plumbing.
10. Appliances outside the four trades (fridge, freezer, washing machine, TV, microwave, mobile) → category "unknown" + clarification_required = true + options: the four trades plus "Other / not sure".
11. Never output "unknown" for anything that clearly belongs to one of the four trades. Only "unknown" for out-of-scope appliances or unintelligible input.

## Language coverage
Understand Roman Urdu, Urdu script (بجلی، پانی، نل، پائپ، پنکھا، لائٹ، گیزر، دروازہ، الماری، موٹر، ٹنکی، فلش، کولر، چنگاری، شارٹ سرکٹ), English and mixtures. Transcription typos are normal — match phonetically: gizer/geaser = geyser, pankha = fan, nalka/nal = tap, tanki = tank, naali = drain.

## Output schema — return ONLY this JSON object:
{
  "category": "plumber" | "electrician" | "ac_technician" | "carpenter" | "unknown",
  "subcategory": "<short snake_case label, e.g. 'pipe_leakage', 'switch_sparking', 'ac_gas_refill', 'door_lock'>",
  "description": "<2–3 sentence summary of the problem in the customer's own language>",
  "required_skills": ["<EXACT strings copied from the chosen trade's vocabulary below>"],
  "urgency": "normal" | "potentially_urgent" | "emergency",
  "safety_flags": ["<only when urgency is emergency or potentially_urgent>"],
  "estimated_price_min": <integer PKR>,
  "estimated_price_max": <integer PKR>,
  "confidence": <0.0–1.0>,
  "clarification_required": <boolean>,
  "clarification_question": "<ONE short question in the customer's language, or null>",
  "clarification_options": ["<2–5 short options in the customer's language>"],
  "complexity": "low" | "medium" | "high"
}

## Required-skills vocabulary — copy strings EXACTLY as written, only from the chosen category's list
- plumber: "faucet repair", "pipe fitting", "drain cleaning", "geyser installation", "water tank installation"
- electrician: "wiring", "fault finding", "switchboard installation", "inverter installation", "lighting"
- ac_technician: "ac repair", "compressor service", "gas refilling", "ac installation", "deep cleaning"
- carpenter: "door repair", "furniture making", "cabinet repair", "wardrobe installation", "kitchen cabinets"
Never invent skill strings outside this vocabulary.

## Urgency
- emergency: sparks/chingari, gas smell, burning smell, fire, exposed wire, electric shock, short circuit, flooding, burst pipe.
- potentially_urgent: total power failure, fuse blowout, complete AC failure in summer, fast water leak, sewage backup.
- normal: everything else — routine repairs, maintenance, installations.

## Confidence calibration
- 0.85–0.95: explicit words for a single trade.
- 0.65–0.84: implied but unambiguous.
- 0.40–0.64: two trades plausible — commit to the most likely one AND ask a clarification question.
- below 0.40: unintelligible or out of scope — category "unknown" + clarification.

## Clarification rules
- Round 1: ask ONE short question only when confidence < 0.65, or two trades are plausible, or the appliance is out of scope. Options must be short trade-or-work choices in the customer's language (Roman Urdu preferred).
- If confidence ≥ 0.65: clarification_required = false, clarification_question = null, clarification_options = [].
- Round 2: the input contains a line "User clarification: ..." → COMMIT. Choose the best category now, set clarification_required = false, and never ask another question.

## Prices (PKR, conservative — a placeholder until the ustad inspects)
- Simple repair (faucet, switch, hinge): 800–2500
- Medium repair (pipe, wiring, AC service): 2000–5000
- Complex job (full wiring, compressor, furniture install): 4000–12000
- Emergency: add 30–50%

## Hard rules
1. Return ONLY the JSON object — no preamble, no markdown fences.
2. description is a clean 2–3 sentence summary, not a transcript.
3. required_skills must come from the chosen category's vocabulary above.
4. Keep category, urgency and complexity strictly to the allowed values.
5. This is a classification step, not a diagnosis or binding price quote.`;

/** Accepts either the full chat-completions URL or the API root. */
function opencodeEndpoint(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/chat/completions")
    ? trimmed
    : `${trimmed}/chat/completions`;
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

export function normalizeAiJob(raw: unknown): NormalizedAiJob {
  const job = (raw ?? {}) as RawAiJob;
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

/** Strips markdown code fences some models wrap JSON responses in. */
function parseModelJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

export async function opencodeUnderstand(
  input: string,
  image: AiImageInput | undefined,
  apiKey: string,
): Promise<NormalizedAiJob> {
  // OpenAI chat format: a plain string for text, content parts when an image
  // is attached (data URLs — no upload step needed).
  const userContent = image
    ? [
        {
          type: "image_url",
          image_url: { url: `data:${image.mime};base64,${image.data}` },
        },
        { type: "text", text: input || "Analyze the attached photo of the problem." },
      ]
    : input || "Analyze the attached photo of the problem.";

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= OPENCODE_MAX_RETRIES; attempt++) {
    try {
      console.log(`[opencode] Attempt ${attempt + 1}/${OPENCODE_MAX_RETRIES + 1}. Calling API...`);
      const response = await fetch(opencodeEndpoint(OPENCODE_BASE_URL), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: OPENCODE_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],
          temperature: 0.3,
          response_format: { type: "json_object" },
        }),
        signal: AbortSignal.timeout(OPENCODE_TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error("[opencode] API error:", response.status, errorText.substring(0, 200));
        const err = new Error(
          `OpenCode API ${response.status}: ${errorText}`,
        );
        // 429 and 5xx are retryable; 4xx (except 429) are not
        if (response.status === 429 || response.status >= 500) {
          lastError = err;
          if (attempt < OPENCODE_MAX_RETRIES) {
            await sleep(RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
            continue;
          }
        }
        throw err;
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const modelText = data.choices?.[0]?.message?.content;
      if (!modelText) {
        console.error("[opencode] No choices returned. Raw:", JSON.stringify(data).substring(0, 300));
        throw new Error("OpenCode returned no choices");
      }

      console.log("[opencode] Raw response:", modelText.substring(0, 200));
      let parsed: unknown;
      try {
        parsed = parseModelJson(modelText);
      } catch {
        throw new Error("OpenCode returned malformed JSON");
      }
      return normalizeAiJob(parsed);
    } catch (error) {
      if (error instanceof Error && isRetryable(error) && attempt < OPENCODE_MAX_RETRIES) {
        lastError = error;
        await sleep(RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
        continue;
      }
      throw error;
    }
  }

  // Should not reach here, but just in case
  throw lastError ?? new Error("OpenCode failed after retries");
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
  const apiKey = process.env.OPENCODE_API_KEY;
  const text = (opts.text ?? "").trim();
  const clarification = (opts.clarification ?? "").trim();
  const combined = [
    text,
    clarification ? `User clarification: ${clarification}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (!apiKey || (!combined && !opts.image)) {
    console.log("[ai] No OpenCode API key or empty input, using fallback engine");
    return fallbackResult(text);
  }

  try {
    console.log("[ai] Calling OpenCode understand. Text:", combined.substring(0, 100), "Has image:", !!opts.image);
    let normalized = await opencodeUnderstand(
      combined || "About the attached photo.",
      opts.image,
      apiKey,
    );

    const isRoundTwo = clarification.length > 0;
    const asksForClarification = (n: NormalizedAiJob): boolean =>
      n.clarification_required === true &&
      typeof n.clarification_question === "string" &&
      n.clarification_question.trim().length > 0;

    // Round 1 with a weak result gets one retry under a stronger nudge — but
    // never when the model already has a real question for the customer.
    if (
      !isRoundTwo &&
      !asksForClarification(normalized) &&
      (!normalized.category || normalized.confidence < 0.5)
    ) {
      console.log("[ai] Low confidence or unknown category. Retrying with nudge...");
      const nudgeInput = `The customer said: "${combined}". Pick the ONE trade that must physically visit to fix this: plumber, electrician, ac_technician, or carpenter. Pick the closest match even if uncertain. Do NOT answer "unknown" unless the text is not about home repair at all.`;
      try {
        const retry = await opencodeUnderstand(
          nudgeInput,
          opts.image,
          apiKey,
        );
        if (retry.category || asksForClarification(retry)) {
          normalized = retry;
        }
      } catch {
        // Keep first attempt result
      }
    }

    // Ask the customer only when the model is genuinely unsure: no committed
    // category and a real question. Showing "which trade?" beats showing
    // workers from the wrong trade.
    let willAsk =
      !isRoundTwo &&
      asksForClarification(normalized) &&
      (!normalized.category || normalized.confidence < 0.65);

    // Commit to a category when nobody is going to be asked — the keyword
    // engine is the last-resort guess (and it never mixes categories later).
    if (!willAsk && !normalized.category) {
      console.log("[ai] Still no category. Using keyword fallback for category only.");
      const keywordResult = analyzeJobInput(combined);
      if (keywordResult.category) {
        normalized = {
          ...normalized,
          category: keywordResult.category,
          required_skills:
            normalized.required_skills.length > 0
              ? normalized.required_skills
              : keywordResult.required_skills,
        };
      }
    }

    // Round 2 always commits — asking a second time is a dead end.
    if (isRoundTwo) {
      willAsk = false;
      normalized = { ...normalized, clarification_required: false };
    }

    // Clean up the description — make it a proper summary, not raw transcript
    const cleanedDesc = cleanDescription(normalized.description || combined);
    const clarificationOptions =
      normalized.clarification_options && normalized.clarification_options.length > 0
        ? normalized.clarification_options
        : DEFAULT_CLARIFICATION_OPTIONS;

    console.log(
      "[ai] Final result. Category:",
      normalized.category,
      "Confidence:",
      normalized.confidence,
      "Asking:",
      willAsk,
    );
    return {
      source: "opencode",
      understanding: {
        ...normalized,
        clarification_required: willAsk,
        description: cleanedDesc,
      },
      ...(willAsk && normalized.clarification_question
        ? {
            clarification_question: normalized.clarification_question.trim(),
            clarification_options: clarificationOptions,
          }
        : {}),
    };
  } catch (error) {
    console.error(
      "[ai] OpenCode understand failed, falling back to keyword engine",
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
