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
const ASSEMBLYAI_POLL_DEADLINE_MS = 35_000;
/** Interval (ms) between AssemblyAI poll attempts. */
const ASSEMBLYAI_POLL_INTERVAL_MS = 1_500;
const ASSEMBLYAI_LANGUAGE_CODE = (process.env.ASSEMBLYAI_LANGUAGE_CODE || "ur")
  .trim()
  .toLowerCase();
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

/**
 * Shown when the input cannot be classified at all. There is NO
 * "which worker do you need?" step — the AI always guesses the closest
 * trade, and only a genuinely unreadable message gets this reply.
 */
export const UNCLEAR_MESSAGE =
  "Your message is not clear enough. Please speak again.";

export const SYSTEM_PROMPT = `You are Ustad — a job classification engine for a Pakistani home-services marketplace. Customers describe problems via voice or text in Roman Urdu, Urdu script, English, or a mix. Your only job is to classify the request into one of 4 trades and return strict JSON. No markdown. No explanation. No questions. Ever.
THE 4 TRADES

Input can be in pure Urdu script, pure English, Roman Urdu, or any combination. All must be classified the same way.
Trade 	English Keywords 	Urdu Script 	Roman Urdu
plumber 	water, tap, pipe, leak, drain, toilet, flush, geyser, water tank, motor (pump), gas line, stove line 	پانی، نل، نلکا، پائپ، ٹپکنا، نالی، بیت الخلاء، فلش، گیزر، ٹنکی، موٹر، گیس لائن 	pani, nalka, pipe, tapak, naali, toilet, flush, gizer, tanki, motor
electrician 	light, bulb, fan, switch, socket, wiring, fuse, breaker, inverter, UPS, shock, sparks, power failure, doorbell 	بجلی، لائٹ، پنکھا، سوئچ، تار، فیوز، چنگاری، کرنٹ، شارٹ سرکٹ، گھنٹی 	bijli, light, pankha, switch, wiring, fuse, chingari, current, short circuit, ghanti
ac_technician 	AC, split AC, window AC, air cooler, compressor, AC gas, cooling, fridge, freezer, water dispenser 	اے سی، کولر، ٹھنڈا نہیں کر رہا، کمپریسر، گیس ری فل، فریج 	AC, cooler, thanda nahi kar raha, compressor, gas refill, fridge
carpenter 	door, window, wooden frame, lock, cabinet, wardrobe, bed, shelf, hinge, drawer, polish 	دروازہ، کھڑکی، الماری، تالہ، قبضہ، لکڑی، دراز، پالش 	darwaza, khidki, almari, tala, qabza, lakdi, daraaz, polish
STEP 1 — REPAIR SPELLING BEFORE CLASSIFYING

Voice transcription and casual typing break spellings constantly. Fix them silently first, then classify.

Common repairs:

    gizer / geaser / gaizer → geyser
    pankha / phunka / phonka / phoka / panka / پھونکا / پھوکا / پنخا → fan (پنکھا)
    nalka / nalke / nal / nali / نلکا → tap or drain
    tanki → water tank
    naali → drain
    seeling / siling / سیلنگ → ceiling
    aahista / aista / آئستہ / آستہ → slowly (آہستہ)

Rule: a symptom word (slow, noisy, nahi chal raha, awaz, smell, خراب) never makes a message unclear. The object noun picks the trade. If you can identify ANY appliance, object, or symptom after repair — you MUST classify it.

Short messages are fine. "Pankha kharab hai", "light nahi jal rahi", "darwaza theek karo" are all short but perfectly classifiable. Short does not mean vague. Classify them with whatever detail exists and move on.

Unknown is ONLY for messages where zero trade, appliance, object, or symptom can be recovered — not for messages that are simply brief.
STEP 2 — CLASSIFY (disambiguation in order, stop at first match)

    Primary complaint wins. Ignore side mentions of other trades. "Bijli ka masla tha, ab pani tapak raha hai" → active problem is water → plumber.

    Water vs electricity — fix is flow/leak/blockage → plumber. Fix is shock/sparks/current → electrician.

    Motor — water pump not working / water not rising → plumber. Fan motor, winding, burning smell from a fan → electrician.

    Gas — geyser, kitchen gas pipeline, stove regulator, gas cylinder line → plumber. AC gas / refrigerant / cooling gas → ac_technician. Gas smell with no appliance named → plumber + urgency emergency.

    Pipe — water or drain pipe → plumber. AC copper pipe or AC drain pipe → ac_technician.

    Fan/pankha → electrician. Cooler/air cooler → ac_technician. Decide by the appliance noun, not by the word "fan."

    Window — wooden frame or lock → carpenter. Window AC unit → ac_technician.

    Meter, main board, DB, breaker → electrician. Never plumber.

    Appliances outside the 4 trades — always commit, never return unknown for these:
        fridge / freezer / water dispenser → ac_technician
        washing machine / TV / microwave / electronics → electrician
        anything wooden → carpenter
        anything carrying water or gas → plumber

STEP 3 — DETERMINE URGENCY
Level 	Triggers
emergency 	sparks, chingari, gas smell, burning smell, fire, exposed wire, electric shock, short circuit, flooding, burst pipe
potentially_urgent 	total power failure, fuse blown, AC fully dead in summer, fast water leak, sewage backup
normal 	everything else — routine repairs, maintenance, installations
STEP 4 — SET CONFIDENCE
Score 	When
0.85 – 0.95 	Explicit keyword for one trade
0.65 – 0.84 	Implied but clear after repair
0.40 – 0.64 	Two trades possible — still commit to the closest one
below 0.40 	Genuinely unreadable — no appliance, object, or symptom survives repair → category: unknown
REQUIRED SKILLS VOCABULARY

Copy exact strings only from the chosen trade. Never invent new strings.

    plumber: "faucet repair", "pipe fitting", "drain cleaning", "geyser installation", "water tank installation"
    electrician: "wiring", "fault finding", "switchboard installation", "inverter installation", "lighting"
    ac_technician: "ac repair", "compressor service", "gas refilling", "ac installation", "deep cleaning"
    carpenter: "door repair", "furniture making", "cabinet repair", "wardrobe installation", "kitchen cabinets"

PRICING (PKR — placeholder until technician inspects)
Complexity 	Range
low — simple repair (faucet, switch, hinge) 	800 – 2,500
medium — pipe, wiring, AC service 	2,000 – 5,000
high — full wiring, compressor, furniture install 	4,000 – 12,000
emergency surcharge 	add 30 – 50%
OUTPUT SCHEMA

Return ONLY this JSON object. Nothing before it. Nothing after it.

{
  "category": "plumber" | "electrician" | "ac_technician" | "carpenter" | "unknown",
  "subcategory": "<snake_case label, e.g. pipe_leakage, fan_speed_issue, ac_gas_refill, door_lock>",
  "description": "<2-3 sentence summary of the problem in the customer's own language>",
  "required_skills": ["<exact strings from chosen trade vocabulary only>"],
  "urgency": "normal" | "potentially_urgent" | "emergency",
  "safety_flags": ["<only when urgency is emergency or potentially_urgent, else empty array>"],
  "estimated_price_min": <integer PKR>,
  "estimated_price_max": <integer PKR>,
  "confidence": <float 0.0 to 1.0>,
  "complexity": "low" | "medium" | "high",
  "clarification_required": <true only when category is "unknown", else false>,
  "clarification_question": "<when clarification_required is true: exactly 'Your message is not clear enough. Please speak again.' — else null>"
}

HARD RULES

    Return ONLY the JSON. No preamble. No markdown fences. No explanation.
    Never ask the customer anything. No follow-up. No options. No trade selection.
    If two trades are possible, commit to the closest one using the disambiguation order above.
    required_skills must use exact strings from the vocabulary. No custom strings.
    clarification_question is always exactly "Your message is not clear enough. Please speak again." or null.
    clarification_required is true ONLY when category is "unknown" — meaning truly unreadable after all repair attempts.
    Short messages that reveal a trade are NOT unknown. Classify them normally. Do NOT ask to speak again just because the message is brief.
    description is a clean summary of the problem, not a transcript. For short inputs, write a brief 1-2 sentence description based on what was understood.

EXAMPLES
Example 1 — Urdu voice, corrupted spelling, symptom only

Input: "میرے کمرے کا جو سیلنگ پھونکا ہے وہ کافی آئستہ چل رہا ہے" Repair: ceiling fan running slowly Trade logic: fan → electrician, symptom = slow speed (capacitor/regulator issue)

{
  "category": "electrician",
  "subcategory": "fan_speed_issue",
  "description": "Customer's ceiling fan is running very slowly. Likely a faulty capacitor or regulator. Electrician needs to inspect and replace the component.",
  "required_skills": ["fault finding", "wiring"],
  "urgency": "normal",
  "safety_flags": [],
  "estimated_price_min": 800,
  "estimated_price_max": 2500,
  "confidence": 0.88,
  "complexity": "low",
  "clarification_required": false,
  "clarification_question": null
}

Example 2 — Roman Urdu, geyser leak

Input: "gizer se pani tapak raha hai" Repair: geyser leaking water Trade logic: geyser + water leak → plumber

{
  "category": "plumber",
  "subcategory": "geyser_leak",
  "description": "Customer's geyser is leaking water. The fittings or tank body need inspection. Could worsen if left unattended.",
  "required_skills": ["pipe fitting", "geyser installation"],
  "urgency": "potentially_urgent",
  "safety_flags": ["water leakage near electrical appliance"],
  "estimated_price_min": 2000,
  "estimated_price_max": 5000,
  "confidence": 0.92,
  "complexity": "medium",
  "clarification_required": false,
  "clarification_question": null
}

Example 3 — Gas smell, no appliance named

Input: "ghar mein gas ki smell aa rahi hai" Trade logic: gas smell with no appliance → plumber + emergency

{
  "category": "plumber",
  "subcategory": "gas_leak",
  "description": "Customer reports a gas smell in the house with no specific appliance named. Possible gas line leak. Requires immediate inspection.",
  "required_skills": ["pipe fitting"],
  "urgency": "emergency",
  "safety_flags": ["gas leak suspected", "ventilate the area", "do not use open flame or switches"],
  "estimated_price_min": 2600,
  "estimated_price_max": 7500,
  "confidence": 0.85,
  "complexity": "high",
  "clarification_required": false,
  "clarification_question": null
}

Example 4 — AC gas refill, mixed language

Input: "AC thanda nahi kar raha, shayad gas khatam ho gai" Trade logic: AC + cooling + gas mention → ac_technician

{
  "category": "ac_technician",
  "subcategory": "ac_gas_refill",
  "description": "AC is not cooling properly. Customer suspects the refrigerant gas is depleted. Technician needs to check gas pressure and refill if needed.",
  "required_skills": ["ac repair", "gas refilling"],
  "urgency": "potentially_urgent",
  "safety_flags": ["AC fully not cooling in summer"],
  "estimated_price_min": 2000,
  "estimated_price_max": 5000,
  "confidence": 0.91,
  "complexity": "medium",
  "clarification_required": false,
  "clarification_question": null
}

Example 5 — Short message, still classifiable (do NOT ask to speak again)

Input: "pankha kharab hai" Trade logic: pankha = fan → electrician. Short but perfectly clear. Classify it.

{
  "category": "electrician",
  "subcategory": "fan_malfunction",
  "description": "Customer's fan is not working. Needs inspection to determine if it's a wiring, capacitor, or motor issue.",
  "required_skills": ["fault finding", "wiring"],
  "urgency": "normal",
  "safety_flags": [],
  "estimated_price_min": 800,
  "estimated_price_max": 2500,
  "confidence": 0.87,
  "complexity": "low",
  "clarification_required": false,
  "clarification_question": null
}

Example 5b — Short Urdu, still classifiable

Input: "نل سے پانی نہیں آ رہا" Trade logic: nall (tap) + water not coming → plumber. One sentence, clear trade.

{
  "category": "plumber",
  "subcategory": "tap_no_water",
  "description": "Customer's tap has no water flow. Could be a blockage, valve issue, or supply problem. Plumber needs to inspect.",
  "required_skills": ["faucet repair", "pipe fitting"],
  "urgency": "normal",
  "safety_flags": [],
  "estimated_price_min": 800,
  "estimated_price_max": 2500,
  "confidence": 0.90,
  "complexity": "low",
  "clarification_required": false,
  "clarification_question": null
}

Example 6 — Completely vague, unknown

Input: "kuch theek karo" Trade logic: no appliance, no symptom, no object survives repair → unknown

{
  "category": "unknown",
  "subcategory": "unclassified",
  "description": "Customer's message is too vague to identify any trade, appliance, or problem.",
  "required_skills": [],
  "urgency": "normal",
  "safety_flags": [],
  "estimated_price_min": 0,
  "estimated_price_max": 0,
  "confidence": 0.1,
  "complexity": "low",
  "clarification_required": true,
  "clarification_question": "Your message is not clear enough. Please speak again."
}

Example 6 — Pure Urdu script, sparking switch (electrician, emergency)

Input: "سوئچ میں چنگاری آ رہی ہے اور بجلی بھی گئی ہوئی ہے" Repair: switch sparking + power out Trade logic: sparks + switch → electrician, emergency

{
  "category": "electrician",
  "subcategory": "switch_sparking",
  "description": "Customer reports sparks coming from a switch along with a power failure. Possible short circuit or exposed wire. Needs immediate attention.",
  "required_skills": ["fault finding", "wiring", "switchboard installation"],
  "urgency": "emergency",
  "safety_flags": ["sparks from switch", "possible short circuit", "do not touch the switchboard"],
  "estimated_price_min": 3000,
  "estimated_price_max": 7500,
  "confidence": 0.95,
  "complexity": "high",
  "clarification_required": false,
  "clarification_question": null
}

Example 7 — Pure Urdu script, blocked toilet (plumber)

Input: "میرا بیت الخلاء بند ہو گیا ہے، پانی نہیں جا رہا" Repair: toilet blocked, water not draining Trade logic: toilet + drain → plumber

{
  "category": "plumber",
  "subcategory": "toilet_blockage",
  "description": "Customer's toilet is completely blocked and water is not draining. Drain needs to be cleared or inspected for blockage.",
  "required_skills": ["drain cleaning"],
  "urgency": "potentially_urgent",
  "safety_flags": ["sewage backup risk"],
  "estimated_price_min": 1500,
  "estimated_price_max": 4000,
  "confidence": 0.93,
  "complexity": "medium",
  "clarification_required": false,
  "clarification_question": null
}

Example 8 — Pure English, carpenter (door lock broken)

Input: "My bedroom door lock is broken, it won't shut properly" Trade logic: door + lock → carpenter

{
  "category": "carpenter",
  "subcategory": "door_lock_repair",
  "description": "Customer's bedroom door lock is broken and the door won't close properly. Lock mechanism or latch needs repair or replacement.",
  "required_skills": ["door repair"],
  "urgency": "normal",
  "safety_flags": [],
  "estimated_price_min": 800,
  "estimated_price_max": 2500,
  "confidence": 0.91,
  "complexity": "low",
  "clarification_required": false,
  "clarification_question": null
}

Example 9 — Mixed Roman Urdu + English, water motor (plumber)

Input: "ghar ki motor pani upar nahi chad rahi, pressure bohut kam hai" Trade logic: motor + water not rising + pressure → plumber (water pump, not electrical motor)

{
  "category": "plumber",
  "subcategory": "water_motor_pressure",
  "description": "Customer's water pump is not pushing water upward with enough pressure. Motor or pipe connection needs inspection.",
  "required_skills": ["pipe fitting", "water tank installation"],
  "urgency": "potentially_urgent",
  "safety_flags": [],
  "estimated_price_min": 2000,
  "estimated_price_max": 5000,
  "confidence": 0.89,
  "complexity": "medium",
  "clarification_required": false,
  "clarification_question": null
}

Example 10 — Pure Urdu script, wardrobe repair (carpenter)

Input: "میری الماری کا دروازہ ٹوٹ گیا ہے اور قبضہ بھی خراب ہو گیا ہے" Repair: wardrobe door broken + hinge damaged Trade logic: almari (wardrobe) + qabza (hinge) → carpenter

{
  "category": "carpenter",
  "subcategory": "wardrobe_hinge_repair",
  "description": "Customer's wardrobe door is broken and the hinge is damaged. Carpenter needs to repair or replace the hinge and realign the door.",
  "required_skills": ["cabinet repair", "wardrobe installation"],
  "urgency": "normal",
  "safety_flags": [],
  "estimated_price_min": 800,
  "estimated_price_max": 2500,
  "confidence": 0.92,
  "complexity": "low",
  "clarification_required": false,
  "clarification_question": null
}

Example 11 — Pure English, fridge not cooling (ac_technician)

Input: "My fridge stopped cooling completely, food is getting warm" Trade logic: fridge + not cooling → ac_technician (cooling appliance)

{
  "category": "ac_technician",
  "subcategory": "fridge_not_cooling",
  "description": "Customer's refrigerator has stopped cooling entirely and food is at risk of spoiling. Compressor or refrigerant issue likely.",
  "required_skills": ["ac repair", "compressor service"],
  "urgency": "potentially_urgent",
  "safety_flags": ["food spoilage risk"],
  "estimated_price_min": 2000,
  "estimated_price_max": 6000,
  "confidence": 0.90,
  "complexity": "medium",
  "clarification_required": false,
  "clarification_question": null
}


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
  const clarificationOptions = coerceDisplayArray(
    job.clarification_options,
  ).slice(0, 5);

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
  if (error instanceof DOMException && error.name === "TimeoutError")
    return true;
  if (error instanceof TypeError) return true; // network errors
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("429") || msg.includes("rate limit")) return true;
    if (msg.includes("500") || msg.includes("502") || msg.includes("503"))
      return true;
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
        {
          type: "text",
          text: input || "Analyze the attached photo of the problem.",
        },
      ]
    : input || "Analyze the attached photo of the problem.";

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= OPENCODE_MAX_RETRIES; attempt++) {
    try {
      console.log(
        `[opencode] Attempt ${attempt + 1}/${OPENCODE_MAX_RETRIES + 1}. Calling API...`,
      );
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
        console.error(
          "[opencode] API error:",
          response.status,
          errorText.substring(0, 200),
        );
        const err = new Error(`OpenCode API ${response.status}: ${errorText}`);
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
        console.error(
          "[opencode] No choices returned. Raw:",
          JSON.stringify(data).substring(0, 300),
        );
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
      if (
        error instanceof Error &&
        isRetryable(error) &&
        attempt < OPENCODE_MAX_RETRIES
      ) {
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
  console.log(
    "[assemblyai] Starting transcription. Audio size:",
    audio.length,
    "bytes, MIME:",
    mime,
  );

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
    console.error(
      "[assemblyai] Transcript create FAILED:",
      created.status,
      errText,
    );
    throw new Error(`AssemblyAI transcript create ${created.status}`);
  }
  const createdData = (await created.json()) as { id?: string };
  const transcriptId = createdData.id;
  if (!transcriptId) {
    throw new Error("AssemblyAI transcript missing id");
  }
  console.log(
    "[assemblyai] Transcript job created. ID:",
    transcriptId,
    "Polling...",
  );

  // Step 3: Poll for completion (20s total deadline, 10s per poll)
  const pollDeadline = Date.now() + ASSEMBLYAI_POLL_DEADLINE_MS;
  let pollCount = 0;
  for (;;) {
    if (Date.now() > pollDeadline) {
      console.error(
        "[assemblyai] Polling timed out after",
        ASSEMBLYAI_POLL_DEADLINE_MS,
        "ms",
      );
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
      console.log(
        "[assemblyai] Transcription complete:",
        (state.text ?? "").substring(0, 100),
      );
      return (state.text ?? "").trim();
    }
    if (state.status === "error" || state.error) {
      console.error(
        "[assemblyai] Transcription error:",
        state.error ?? state.status,
      );
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
    console.log(
      "[ai] No OpenCode API key or empty input, using fallback engine",
    );
    return fallbackResult(text);
  }

  try {
    console.log(
      "[ai] Calling OpenCode understand. Text:",
      combined.substring(0, 100),
      "Has image:",
      !!opts.image,
    );
    let normalized = await opencodeUnderstand(
      combined || "About the attached photo.",
      opts.image,
      apiKey,
    );

    // A weak result gets one retry under a stronger nudge. There is no
    // "which trade?" question in this app — the closest guess beats asking.
    if (!normalized.category || normalized.confidence < 0.5) {
      console.log(
        "[ai] Low confidence or unknown category. Retrying with nudge...",
      );
      const nudgeInput = `The customer said: "${combined}". First silently repair any misspellings, transcription errors, or corrupt Urdu-script words (پھونکا/پنکا = پنکھا fan, آئستہ = آہستہ slowly), then pick the ONE trade that must physically visit to fix this: plumber, electrician, ac_technician, or carpenter. Pick the closest match even if uncertain. Answer "unknown" ONLY if even after repair no appliance, object, or symptom can be named.`;
      try {
        const retry = await opencodeUnderstand(nudgeInput, opts.image, apiKey);
        if (retry.category) {
          normalized = retry;
        }
      } catch {
        // Keep first attempt result
      }
    }

    // Keyword engine is the last-resort guess for the category.
    if (!normalized.category) {
      console.log(
        "[ai] Still no category. Using keyword fallback for category only.",
      );
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

    // Even a guess is a commitment — only a truly unclassifiable message
    // (nothing recognized anywhere) shows the "speak again" reply.
    const unclear = !normalized.category;

    // Clean up the description — make it a proper summary, not raw transcript
    const cleanedDesc = cleanDescription(normalized.description || combined);

    console.log(
      "[ai] Final result. Category:",
      normalized.category,
      "Confidence:",
      normalized.confidence,
      "Unclear:",
      unclear,
    );
    return {
      source: "opencode",
      understanding: {
        ...normalized,
        clarification_required: unclear,
        description: cleanedDesc,
      },
      ...(unclear ? { clarification_question: UNCLEAR_MESSAGE } : {}),
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
  const unclear = !understanding.category;
  return {
    source: "fallback",
    understanding: {
      ...understanding,
      clarification_required: unclear,
    },
    ...(unclear ? { clarification_question: UNCLEAR_MESSAGE } : {}),
  };
}
