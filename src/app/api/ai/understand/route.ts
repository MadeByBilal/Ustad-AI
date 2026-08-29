import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { understandJobInput } from "@/lib/job/ai";
import { getWorkerOptions } from "@/lib/matching";
import type { WorkerCategory, UrgencyLevel } from "@/models";

export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 12 * 1024 * 1024; // 12MB
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_TEXT_LENGTH = 2000;

/**
 * Public, pre-login endpoint for the landing page:
 *   - voice  -> POST form-data with an `audio` file
 *   - photo  -> POST form-data with an `image` file
 *   - text   -> POST JSON `{ text, clarification? }` (or form-data `text`)
 *
 * Runs the AssemblyAI Urdu transcription (voice) + Gemini job understanding,
 * falls back to the built-in keyword engine when no API keys are set, and
 * returns the best worker option plus alternatives so the homepage can show
 * results with zero manual steps.
 */
export async function POST(req: NextRequest) {
  let payload: {
    text?: string;
    clarification?: string;
    audio?: { mime: string; buffer: Buffer };
    image?: { mime: string; data: string };
    location?: { lat: number; lng: number };
  };

  function parseLocation(lat: unknown, lng: unknown): { lat: number; lng: number } | undefined {
    if (
      lat === null ||
      lat === undefined ||
      lng === null ||
      lng === undefined ||
      lat === "" ||
      lng === ""
    ) {
      return undefined;
    }
    const parsedLat = Number(lat);
    const parsedLng = Number(lng);
    if (
      !Number.isFinite(parsedLat) ||
      !Number.isFinite(parsedLng) ||
      parsedLat < -90 ||
      parsedLat > 90 ||
      parsedLng < -180 ||
      parsedLng > 180
    ) {
      return undefined;
    }
    return { lat: parsedLat, lng: parsedLng };
  }

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const audio = form.get("audio");
      const image = form.get("image");
      const text = form.get("text");
      const clarification = form.get("clarification");

      payload = {
        text: typeof text === "string" ? text : undefined,
        clarification:
          typeof clarification === "string" ? clarification : undefined,
        location: parseLocation(form.get("lat"), form.get("lng")),
        ...(audio instanceof File
          ? {
              audio: {
                mime: audio.type || "audio/webm",
                buffer: Buffer.from(await audio.arrayBuffer()),
              },
            }
          : {}),
        ...(image instanceof File
          ? {
              image: {
                mime: image.type || "image/jpeg",
                data: Buffer.from(await image.arrayBuffer()).toString("base64"),
              },
            }
          : {}),
      };
    } else {
      const body = await req.json().catch(() => null);
      payload = {
        text: typeof body?.text === "string" ? body.text : undefined,
        clarification:
          typeof body?.clarification === "string"
            ? body.clarification
            : undefined,
        location: parseLocation(body?.lat, body?.lng),
      };
    }
  } catch {
    return fail("Invalid request body", 400);
  }

  if (!payload.text && !payload.audio && !payload.image) {
    return fail("Send text, audio, or an image", 400);
  }

  if (payload.text && payload.text.length > MAX_TEXT_LENGTH) {
    return fail("Text is too long", 400);
  }
  if (payload.audio && payload.audio.buffer.length > MAX_AUDIO_BYTES) {
    return fail("Audio is too large", 400);
  }
  if (payload.image && payload.image.data.length * 0.75 > MAX_IMAGE_BYTES) {
    return fail("Image is too large", 400);
  }

  try {
    let transcript: string | undefined;
    if (payload.audio) {
      try {
        transcript = await import("@/lib/job/ai").then((m) =>
          m.transcribeAudio(payload.audio!.buffer, payload.audio!.mime)
        );
      } catch {
        // Short audio, network issues, or API errors — fall back to
        // asking the user to type their request instead of 500-ing.
        return fail(
          "Could not understand the audio — it may be too short or unclear. Please type your request instead.",
          422
        );
      }
    }

    const text = payload.text || transcript || "";
    if (!text && !payload.image) {
      return fail("Sorry, I could not hear anything. Please try again.", 422);
    }

    const understood = await understandJobInput({
      text,
      image: payload.image,
      clarification: payload.clarification,
    });

    const category = understood.understanding.category as WorkerCategory | null;
    const workers = await getWorkerOptions({
      category,
      required_skills: understood.understanding.required_skills,
      urgency: (understood.understanding.urgency ?? "normal") as UrgencyLevel,
      limit: 4,
      location: payload.location,
      estimate_min: understood.understanding.estimate_min,
      estimate_max: understood.understanding.estimate_max,
      complexity: understood.understanding.complexity,
    });

    return ok({
      source: understood.source,
      understanding: understood.understanding,
      clarification_question: understood.clarification_question,
      clarification_options: understood.clarification_options,
      manual_fallback: understood.manual_fallback ?? false,
      transcript,
      workers,
    });
  } catch (error) {
    console.error("[ai/understand] failed:", error);
    return fail("Something went wrong while understanding your request. Please try again.", 500);
  }
}
