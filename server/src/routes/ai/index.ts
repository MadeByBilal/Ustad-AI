import { Router, type Request, type Response } from "express";
import multer from "multer";
import { ok, fail } from "../../lib/api.js";
import { understandJobInput } from "../../lib/job/ai.js";
import { getWorkerOptions } from "../../lib/matching.js";
import type { WorkerCategory, UrgencyLevel } from "../../models/index.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

const MAX_AUDIO_BYTES = 12 * 1024 * 1024; // 12MB
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_TEXT_LENGTH = 2000;

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

/**
 * POST /understand — public, pre-login endpoint for the landing page.
 * Handles multipart form-data (audio/image) and JSON (text, clarification).
 *
 * NOTE: For multipart form-data uploads (audio/image), configure multer
 * middleware or equivalent before this route. This handler supports:
 *   - voice  -> form-data with an `audio` file
 *   - photo  -> form-data with an `image` file
 *   - text   -> JSON `{ text, clarification? }` (or form-data `text`)
 */
router.post("/understand", upload.single("audio"), async (req: Request, res: Response) => {
  let payload: {
    text?: string;
    clarification?: string;
    audio?: { mime: string; buffer: Buffer };
    image?: { mime: string; data: string };
    location?: { lat: number; lng: number };
  };

  try {
    const contentType = req.headers["content-type"] ?? "";

    if (contentType.includes("multipart/form-data")) {
      // Multipart form-data handling
      // NOTE: In production, configure multer middleware on this route:
      //   router.post("/understand", multer().none(), async (req, res) => { ... })
      // For now, attempt to extract from req.body (multer populates this)
      const body = req.body as Record<string, unknown>;
      const audio = (req as any).file;
      const text = typeof body?.text === "string" ? body.text : undefined;
      const clarification = typeof body?.clarification === "string" ? body.clarification : undefined;

      payload = {
        text,
        clarification,
        location: parseLocation(body?.lat, body?.lng),
        ...(audio
          ? {
              audio: {
                mime: audio.mimetype || "audio/webm",
                buffer: audio.buffer,
              },
            }
          : {}),
      };
    } else {
      // JSON body handling
      const body = req.body as Record<string, unknown> | null;
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
    return fail(res, "Invalid request body", 400);
  }

  if (!payload.text && !payload.audio && !payload.image) {
    return fail(res, "Send text, audio, or an image", 400);
  }

  if (payload.text && payload.text.length > MAX_TEXT_LENGTH) {
    return fail(res, "Text is too long", 400);
  }
  if (payload.audio && payload.audio.buffer.length > MAX_AUDIO_BYTES) {
    return fail(res, "Audio is too large", 400);
  }
  if (payload.image && payload.image.data.length * 0.75 > MAX_IMAGE_BYTES) {
    return fail(res, "Image is too large", 400);
  }

  try {
    let transcript: string | undefined;
    if (payload.audio) {
      try {
        const { transcribeAudio } = await import("../../lib/job/ai.js");
        transcript = await transcribeAudio(payload.audio.buffer, payload.audio.mime);
      } catch {
        return fail(
          res,
          "Could not understand the audio — it may be too short or unclear. Please type your request instead.",
          422
        );
      }
    }

    const text = payload.text || transcript || "";
    if (!text && !payload.image) {
      return fail(res, "Sorry, I could not hear anything. Please try again.", 422);
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
    })(res);
  } catch (error) {
    console.error("[ai/understand] failed:", error);
    return fail(res, "Something went wrong while understanding your request. Please try again.", 500);
  }
});

export { router as aiRoutes };
