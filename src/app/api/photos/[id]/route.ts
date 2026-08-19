import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { authError, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { Upload } from "@/models";

export const dynamic = "force-dynamic";

/**
 * Serves a stored photo (job input photos, before/after shots, chat
 * media) by id. Any signed-in user may view photos.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(["customer", "worker"]);
  } catch (e) {
    return authError(e);
  }

  const photoId = params.id.trim();
  if (!photoId) {
    return fail("Photo id is required", 400);
  }

  await connectDB();
  const upload = await Upload.findById(photoId).lean();
  if (!upload) {
    return fail("Photo not found", 404);
  }

  const source = upload.data as unknown as
    | { value: () => Buffer }
    | (Uint8Array & { buffer: ArrayBufferLike });
  const bytes = new Uint8Array(
    typeof source.value === "function"
      ? Buffer.from(source.value())
      : Buffer.from(source.buffer, source.byteOffset, source.byteLength)
  );
  return new Response(bytes, {
    headers: {
      "Content-Type": upload.mime,
      "Content-Length": String(upload.data.length),
      "Cache-Control": "public, max-age=300",
    },
  });
}