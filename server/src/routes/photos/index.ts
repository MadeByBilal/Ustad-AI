import { Router, type Request, type Response } from "express";
import { connectDB } from "../../lib/mongodb.js";
import { fail } from "../../lib/api.js";
import { requireRole } from "../../lib/auth-middleware.js";
import { Upload } from "../../models/index.js";

const router = Router();

/**
 * GET /:id — serves a stored photo by id.
 * Any signed-in user may view photos.
 */
router.get("/:id", requireRole(["customer", "worker"]), async (req: Request, res: Response) => {
  try {
    const photoId = String(req.params.id).trim();
    if (!photoId) {
      return fail(res, "Photo id is required", 400);
    }

    await connectDB();
    const upload = await Upload.findById(photoId).lean();
    if (!upload) {
      return fail(res, "Photo not found", 404);
    }

    const source = upload.data as unknown as
      | { value: () => Buffer }
      | (Uint8Array & { buffer: ArrayBufferLike });
    const bytes = new Uint8Array(
      "value" in source
        ? Buffer.from(source.value())
        : Buffer.from(source.buffer, source.byteOffset, source.byteLength)
    );

    res.set({
      "Content-Type": upload.mime,
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=300",
    });
    return res.send(Buffer.from(bytes));
  } catch (error) {
    console.error("[photos/:id] error:", error);
    return fail(res, "Internal error", 500);
  }
});

export { router as photoRoutes };
