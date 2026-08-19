import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { authError, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { Upload } from "@/models";

export const dynamic = "force-dynamic";

/**
 * Serves an uploaded photo by ID. Auth-gated (customer or worker).
 * Returns the raw image bytes with the correct content-type.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  let sessionUser;
  try {
    sessionUser = await requireRole(["customer", "worker"]);
  } catch (e) {
    return authError(e);
  }

  const uploadId = params.id.trim();
  if (!uploadId) {
    return fail("Upload id is required", 400);
  }

  try {
    await connectDB();

    const upload = await Upload.findById(uploadId);
    if (!upload) {
      return fail("Photo not found", 404);
    }

    const headers = new Headers();
    headers.set("Content-Type", upload.mime);
    headers.set("Cache-Control", "private, max-age=31536000, immutable");
    return new Response(upload.data as Buffer, { headers });
  } catch (e) {
    console.error("photo serve failed:", e);
    return fail("Internal error", 500);
  }
}