import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { connectDB } from "../../lib/mongodb.js";
import { fail, ok } from "../../lib/api.js";
import { requireRole } from "../../lib/auth-middleware.js";
import { User } from "../../models/index.js";

const router = Router();

const profileImageSchema = z.object({
  profile_image: z.string().url().max(500).nullable(),
});

/**
 * PATCH /profile-image — update user profile image URL (Cloudinary).
 */
router.patch("/profile-image", requireRole(["customer", "worker", "admin"]), async (req: Request, res: Response) => {
  const sessionUser = res.locals.sessionUser;

  const parsed = profileImageSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, "Invalid request", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    await connectDB();
    const user = await User.findByIdAndUpdate(
      sessionUser.user._id,
      { $set: { profile_image: parsed.data.profile_image } },
      { new: true },
    ).lean();

    if (!user) {
      return fail(res, "User not found", 404);
    }

    return ok({
      profile_image: user.profile_image ?? null,
    })(res);
  } catch (error) {
    console.error("[auth/profile-image] error:", error);
    return fail(res, "Internal error", 500);
  }
});

export { router as profileRoutes };
