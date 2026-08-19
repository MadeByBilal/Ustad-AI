import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { authError, fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { FlowError, workerUploadJobMedia } from "@/lib/job/flow";
import { Upload, Worker } from "@/models";

export const dynamic = "force-dynamic";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const mediaSchema = z.object({
  type: z.enum(["before", "after"]),
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
  note: z.string().max(500).optional(),
});

/**
 * Worker uploads a before/after work photo. Creates an Upload record and
 * attaches it to the job via workerUploadJobMedia.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let sessionUser;
  try {
    sessionUser = await requireRole(["worker"]);
  } catch (e) {
    return authError(e);
  }

  const jobId = params.id.trim();
  if (!jobId) {
    return fail("Job id is required", 400);
  }

  const parsed = mediaSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return fail("Invalid request", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    await connectDB();

    const worker = await Worker.findOne({ user_id: sessionUser.user._id }).lean();
    if (!worker) {
      return fail("Worker profile not found for this account", 404);
    }

    const upload = await Upload.create({
      customer_id: sessionUser.user._id,
      mime: parsed.data.mime,
      size: parsed.data.data.length,
      data: parsed.data.data,
    });

    const result = await workerUploadJobMedia(
      jobId,
      String(worker._id),
      {
        type: parsed.data.type,
        photo_id: String(upload._id),
        note: parsed.data.note,
      }
    );

    return ok(result);
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(e.message, e.statusCode, { code: e.code });
    }
    console.error("media upload failed:", e);
    return fail("Internal error", 500);
  }
}