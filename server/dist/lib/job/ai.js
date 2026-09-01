import { analyzeJobInput, CATEGORY_ESTIMATES, inspectionFeeFor, } from "./analyze.js";
export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";
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
const ASSEMBLYAI_LANGUAGE_CODE = (process.env.ASSEMBLYAI_LANGUAGE_CODE || "ur").trim().toLowerCase();
const VALID_ASSEMBLYAI_LANGUAGE_CODES = new Set(["en", "ur"]);
export const DEFAULT_CLARIFICATION_OPTIONS = [
    "Bijli / electrician",
    "Pani / plumber",
    "AC / cooling",
    "Lakri / carpenter",
];
export const SYSTEM_PROMPT = `You are a job-assistant for a Pakistani home-repair app (Ustad). The user speaks Roman Urdu, Urdu, or English. You must respond with ONLY valid strict JSON, exactly matching this schema (no markdown, no commentary):

{
  "category": "plumber" | "electrician" | "ac_technician" | "carpenter" | "unknown",
  "subcategory": "string",
  "description": "string",
  "required_skills": ["string"],  // empty if impossible to infer
  "urgency": "normal" | "potentially_urgent" | "emergency",
  "safety_flags": ["string"],  // non-empty IF urgency is "emergency" or "potentially_urgent": examples: "short circuit", "fuse blowout", "gas leak", "fire risk", "electric shock risk", "water leak", "gas smell"; otherwise empty
  "estimated_price_min": "integer >= 0 in PKR",
  "estimated_price_max": "integer >= 0 in PKR",
  "confidence": "float 0 to 1",
  "clarification_required": "boolean",
  "clarification_question": "string or null",
  "clarification_options": ["string"] or [],
  "complexity": "low" | "medium" | "high"
}

Rules:
- Infer from text, voice transcript, or the attached photo of the problem.
- urgency: "emergency" if user mentions sparks (chingari), gas smell (gas ki boo), burning smell, fire (aag), exposed/bare wire, electric shock, short circuit. "potentially_urgent" for high-risk jobs (power outage, fuse, wiring, water flooding). Otherwise "normal".
- If category is "unknown" or confidence < 0.65, set clarification_required=true and ask ONE SHORT question in the user's language (Roman Urdu preferred) about category or part of the problem, then STOP (do not ask further questions).
- When clarification_required=true, provide 2-5 short checkbox-friendly clarification_options. Keep them mutually understandable and in the user's language.
- Set complexity to low for a simple adjustment/cleaning, medium for normal repair, and high for installation, replacement, compressor, full wiring, renovation, or multi-part work.
- This is a matching/detection step, never a diagnosis or price quote. Conservative prices only as placeholder estimates.
- On the second round the user answers the clarification question; commit the best possible category even if unsure.
- If the input is not relevant, confusing, or too vague, ask a single clarifying question.`;
function geminiEndpoint(apiKey) {
    return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
}
function coerceToArray(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .filter((v) => typeof v === "string" && v.length > 0)
        .map((s) => s.trim().toLowerCase())
        .filter((s, idx, arr) => arr.indexOf(s) === idx);
}
function coerceDisplayArray(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .filter((v) => typeof v === "string" && v.trim().length > 0)
        .map((s) => s.trim())
        .filter((s, idx, arr) => arr.indexOf(s) === idx);
}
function coerceNumber(value, fallback) {
    const n = typeof value === "number" ? value : Number(value ?? NaN);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
}
export function normalizeGeminiJob(raw) {
    const job = (raw ?? {});
    const category = WORKER_CATEGORIES.includes(job.category ?? "")
        ? job.category
        : null;
    const urgency = URGENCY_LEVELS.includes(job.urgency ?? "")
        ? job.urgency
        : "normal";
    const estimates = category ? CATEGORY_ESTIMATES[category] : null;
    const complexity = ["low", "medium", "high"].includes(job.complexity ?? "")
        ? job.complexity
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
function isRetryable(error) {
    if (error instanceof DOMException && error.name === "TimeoutError")
        return true;
    if (error instanceof TypeError)
        return true; // network errors
    if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("429") || msg.includes("rate limit"))
            return true;
        if (msg.includes("500") || msg.includes("502") || msg.includes("503"))
            return true;
        if (msg.includes("econnreset") || msg.includes("fetch"))
            return true;
    }
    return false;
}
async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export async function geminiUnderstand(input, image, apiKey) {
    const parts = [];
    if (image) {
        parts.push({ inline_data: { mime_type: image.mime, data: image.data } });
    }
    parts.push({ text: input || "Analyze the attached photo of the problem." });
    let lastError = null;
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
                const err = new Error(`Gemini API ${response.status}: ${errorText}`);
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
            const data = (await response.json());
            const modelText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!modelText) {
                console.error("[gemini] No candidates returned. Raw:", JSON.stringify(data).substring(0, 300));
                throw new Error("Gemini returned no candidates");
            }
            console.log("[gemini] Raw response:", modelText.substring(0, 200));
            let parsed;
            try {
                parsed = JSON.parse(modelText);
            }
            catch {
                throw new Error("Gemini returned malformed JSON");
            }
            return normalizeGeminiJob(parsed);
        }
        catch (error) {
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
async function transcriptionFromAudio(audio, mime, apiKey) {
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
        throw new Error(`AssemblyAI upload ${upload.status}: ${upload.statusText}${errorText ? ` - ${errorText}` : ""}`);
    }
    const uploaded = (await upload.json());
    if (!uploaded.upload_url) {
        throw new Error("AssemblyAI upload missing upload_url");
    }
    console.log("[assemblyai] Upload successful. Creating transcript job...");
    // Step 2: Create transcript job with a locked language so it stays in the
    // supported app languages instead of auto-detecting unrelated speech.
    const languageCode = VALID_ASSEMBLYAI_LANGUAGE_CODES.has(ASSEMBLYAI_LANGUAGE_CODE)
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
    const createdData = (await created.json());
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
        const status = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
            headers: { "Content-Type": "application/json", ...auth.headers },
            signal: AbortSignal.timeout(API_TIMEOUT_MS),
        });
        if (!status.ok) {
            const errText = await status.text().catch(() => "");
            console.error("[assemblyai] Poll status FAILED:", status.status, errText);
            throw new Error(`AssemblyAI status ${status.status}`);
        }
        const state = (await status.json());
        console.log(`[assemblyai] Poll #${pollCount}: status=${state.status}`);
        if (state.status === "completed") {
            console.log("[assemblyai] Transcription complete:", (state.text ?? "").substring(0, 100));
            return (state.text ?? "").trim();
        }
        if (state.status === "error" || state.error) {
            console.error("[assemblyai] Transcription error:", state.error ?? state.status);
            throw new Error(`AssemblyAI transcription error: ${state.error ?? state.status}`);
        }
    }
}
export async function transcribeAudio(audio, mime) {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey || apiKey.trim().length === 0) {
        console.error("[assemblyai] ASSEMBLYAI_API_KEY is not set!");
        throw new Error("ASSEMBLYAI_API_KEY is not configured. Please set it in your environment variables.");
    }
    console.log("[assemblyai] API key found. Starting transcription...");
    const text = await transcriptionFromAudio(audio, mime, apiKey);
    console.log("[assemblyai] Final transcript:", text.substring(0, 120));
    if (!text || text.length < 2) {
        throw new Error("Transcription was empty or too short. The audio may be silent or unclear.");
    }
    return text;
}
export async function understandJobInput(opts) {
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
        const normalized = await geminiUnderstand(combined || "About the attached photo.", opts.image, apiKey);
        if (opts.clarification) {
            // Round two: commit whatever came back, but flag manual fallback if still unclear.
            console.log("[ai] Clarification round. Category:", normalized.category, "clarification_required:", normalized.clarification_required);
            return {
                source: "gemini",
                understanding: normalized,
                manual_fallback: normalized.clarification_required,
                ...(normalized.clarification_required
                    ? {
                        clarification_question: "Choose the closest type of work to continue.",
                        clarification_options: normalized.clarification_options ?? DEFAULT_CLARIFICATION_OPTIONS,
                    }
                    : {}),
            };
        }
        if (normalized.clarification_required) {
            console.log("[ai] Clarification needed. Question:", normalized.clarification_question);
            return {
                source: "gemini",
                understanding: normalized,
                clarification_question: normalized.clarification_question,
                clarification_options: normalized.clarification_options ?? DEFAULT_CLARIFICATION_OPTIONS,
            };
        }
        console.log("[ai] Gemini success. Category:", normalized.category, "Confidence:", normalized.confidence);
        return { source: "gemini", understanding: normalized };
    }
    catch (error) {
        console.error("[ai] Gemini understand failed, falling back to keyword engine", error);
        return fallbackResult(text);
    }
}
function fallbackResult(text) {
    const understanding = analyzeJobInput(text);
    return {
        source: "fallback",
        understanding,
        ...(understanding.clarification_required
            ? {
                clarification_question: "Aap kis qisam ka kaam karwana chahte hain?",
                clarification_options: DEFAULT_CLARIFICATION_OPTIONS,
            }
            : {}),
    };
}
//# sourceMappingURL=ai.js.map