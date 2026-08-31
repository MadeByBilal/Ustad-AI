import { NextRequest } from "next/server";
import { connectDB } from "@/server/lib/mongodb";
import { authError, fail, ok } from "@/server/lib/api";
import { requireRole } from "@/server/lib/auth";
import { Upload } from "@/server/models";
import { photoUploadSchema } from "@/client/lib/photos";

export const dynamic = "force-dynamic";

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
  const parsed = photoUploadSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return fail("Invalid photo upload", 400, parsed.error.flatten().fieldErrors);
  }

  await connectDB();

  try {
    const upload = await Upload.create({
      owner_id: sessionUser.user._id,
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
