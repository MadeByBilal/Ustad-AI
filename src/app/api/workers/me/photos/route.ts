import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { authError, fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { Upload } from "@/models";
import { photoUploadSchema } from "@/lib/photos";

export const dynamic = "force-dynamic";

/**
 * Worker photo upload (before/after shots and chat media). Mirrors the
 * customer upload: base64 JPEG/PNG <= 2MB, stored in MongoDB.
 */
export async function POST(req: NextRequest) {
  let sessionUser;
  try {
    sessionUser = await requireRole(["worker"]);
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
    console.error("worker photo upload failed:", e);
    return fail("Internal error", 500);
  }
}