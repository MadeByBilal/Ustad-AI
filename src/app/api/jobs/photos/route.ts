import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { authError, fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { Upload } from "@/models";

export const dynamic = "force-dynamic";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const photoSchema = z.object({
  mime: z.enum(["image/jpeg", "image/png"]),
  data: z
    .string()
    .regex(/^[A-Za-z0-9+/=\s]+$/, "Expected base64 encoded image data")
    .transform((b64) => {
      const buf = Buffer.from(b64.replace(/\s/g, ""), "base64");
      return buf;
    })
    .refine((buf) => buf.length > 0 && buf.length <= MAX_PHOTO_BYTES, {
      message: "Image must be between 1 byte and 2MB after decoding",
    }),
});

/**
 * Customer photo upload for job descriptions. The browser downscales the
 * capture to a JPEG/PNG <= 2MB and sends it as base64; we store it in
 * MongoDB and hand back a photo_id the job references in input.photo_ids.
 */
export async function POST(req: NextRequest) {
  let sessionUser;
  try {
    sessionUser = await requireRole(["customer"]);
  } catch (e) {
    return authError(e);
  }

  const body = await req.json().catch(() => null);
  const parsed = photoSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return fail("Invalid photo upload", 400, parsed.error.flatten().fieldErrors);
  }

  await connectDB();

  try {
    const upload = await Upload.create({
      customer_id: sessionUser.user._id,
      mime: parsed.data.mime,
      size: parsed.data.data.length,
      data: parsed.data.data,
    });
    return ok({ photo_id: String(upload._id) }, 201);
  } catch (e) {
    console.error("photo upload failed:", e);
    return fail("Internal error", 500);
  }
}