import {
  AnalysisResult,
  analyzeJobInput,
  CATEGORY_ESTIMATES,
  inspectionFeeFor,
} from "@/lib/job/analyze";

export const GEMINI_MODEL = "gemini-2.5-flash";

const WORKER_CATEGORIES = [
  "plumber",
  "electrician",
  "ac_technician",
  "carpenter",
];
const URGENCY_LEVELS = ["normal", "potentially_urgent", "emergency"];

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
  /** Set on round 2 when the model is still unclear -> show manual pickers. */
  manual_fallback?: boolean;
}

export type NormalizedGeminiJob = AnalysisResult & {
  clarification_question?: string;
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
}

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
  "clarification_question": "string or null"
}

Rules:
- Infer from text, voice transcript, or the attached photo of the problem.
- urgency: "emergency" if user mentions sparks (chingari), gas smell (gas ki boo), burning smell, fire (aag), exposed/bare wire, electric shock, short circuit. "potentially_urgent" for high-risk jobs (power outage, fuse, wiring, water flooding). Otherwise "normal".
- If category is "unknown" or confidence < 0.65, set clarification_required=true and ask ONE SHORT question in the user's language (Roman Urdu preferred) about category or part of the problem, then STOP (do not ask further questions).
- This is a matching/detection step, never a diagnosis or price quote. Conservative prices only as placeholder estimates.
- On the second round the user answers the clarification question; commit the best possible category even if unsure.
- If the input is not relevant, confusing, or too vague, ask a single clarifying question.`;

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
    ...(typeof job.clarification_question === "string"
      ? { clarification_question: job.clarification_question }
      : {}),
  };
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
    signal: AbortSignal.timeout(25_000),
  });

  if (!response.ok) {
    throw new Error(
      `Gemini API ${response.status}: ${await response.text().catch(() => "")}`,
    );
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const modelText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!modelText) {
    throw new Error("Gemini returned no candidates");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(modelText);
  } catch {
    throw new Error("Gemini returned malformed JSON");
  }
  return normalizeGeminiJob(parsed);
}

async function transcriptionFromAudio(
  audio: Buffer,
  mime: string,
  apiKey: string,
): Promise<string> {
  const auth = { headers: { Authorization: apiKey } };

  const upload = await fetch("https://api.assemblyai.com/v2/upload", {
    method: "POST",
    headers: {
      "Content-Type": mime || "application/octet-stream",
      ...auth.headers,
    },
    body: audio,
    signal: AbortSignal.timeout(30_000),
  });
  if (!upload.ok) {
    const errorText = await upload.text().catch(() => "");
    throw new Error(
      `AssemblyAI upload ${upload.status}: ${upload.statusText}${errorText ? ` - ${errorText}` : ""}`,
    );
  }
  const uploaded = (await upload.json()) as { upload_url?: string };
  if (!uploaded.upload_url) {
    throw new Error("AssemblyAI upload missing upload_url");
  }

  const created = await fetch("https://api.assemblyai.com/v2/transcript", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth.headers },
    body: JSON.stringify({
      audio_url: uploaded.upload_url,
      language_code: "ur",
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!created.ok) {
    throw new Error(`AssemblyAI transcript create ${created.status}`);
  }
  const createdData = (await created.json()) as { id?: string };
  const transcriptId = createdData.id;
  if (!transcriptId) {
    throw new Error("AssemblyAI transcript missing id");
  }

  const pollDeadline = Date.now() + 45_000;
  for (;;) {
    if (Date.now() > pollDeadline) {
      throw new Error("AssemblyAI transcription timed out");
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const status = await fetch(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
      { headers: { "Content-Type": "application/json", ...auth.headers } },
    );
    if (!status.ok) {
      throw new Error(`AssemblyAI status ${status.status}`);
    }
    const state = (await status.json()) as {
      status?: string;
      text?: string;
      error?: string;
    };
    if (state.status === "completed") {
      return (state.text ?? "").trim();
    }
    if (state.status === "error" || state.error) {
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
    throw new Error(
      "ASSEMBLYAI_API_KEY is not configured. Please set it in your environment variables.",
    );
  }
  return transcriptionFromAudio(audio, mime, apiKey);
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
    return fallbackResult(text);
  }

  try {
    const normalized = await geminiUnderstand(
      combined || "About the attached photo.",
      opts.image,
      apiKey,
    );

    if (opts.clarification) {
      // Round two: commit whatever came back, but flag manual fallback if still unclear.
      return {
        source: "gemini",
        understanding: normalized,
        manual_fallback: normalized.clarification_required,
      };
    }

    if (normalized.clarification_required) {
      return {
        source: "gemini",
        understanding: normalized,
        clarification_question: normalized.clarification_question,
      };
    }

    return { source: "gemini", understanding: normalized };
  } catch (error) {
    console.error(
      "[ai] Gemini understand failed, falling back to keyword engine",
      error,
    );
    return fallbackResult(text);
  }
}

function fallbackResult(text: string): AiUnderstandResult {
  return {
    source: "fallback",
    understanding: analyzeJobInput(text),
  };
}
