import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { authError, fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { FlowError } from "@/lib/job/flow";
import { listJobMessages, sendJobMessage } from "@/lib/job/chat";
import { Worker } from "@/models";

export const dynamic = "force-dynamic";

const postSchema = z
  .object({
    content: z.string().trim().max(1000).optional(),
    photo_ids: z.array(z.string().min(1)).max(6).optional(),
    location: z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      })
      .optional(),
  })
  .refine(
    (v) =>
      Boolean(v.content && v.content.length > 0) ||
      Boolean(v.photo_ids && v.photo_ids.length > 0) ||
      v.location != null,
    { message: "Send text, a photo or a location" }
  );

/** Message history for the job chat (customer or worker side). */
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

  const jobId = params.id.trim();
  if (!jobId) {
    return fail("Job id is required", 400);
  }

  try {
    await connectDB();
    let senderId = String(sessionUser.user._id);
    let role: "customer" | "worker" = "customer";
    if (sessionUser.user.role === "worker") {
      const worker = await Worker.findOne({ user_id: sessionUser.user._id }).lean();
      if (!worker) {
        return fail("Worker profile not found for this account", 404);
      }
      senderId = String(worker._id);
      role = "worker";
    }
    const messages = await listJobMessages(jobId, senderId, role);
    return ok({ messages });
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(e.message, e.statusCode, { code: e.code });
    }
    console.error("list messages failed:", e);
    return fail("Internal error", 500);
  }
}

/**
 * Sends a chat message (text, photos and/or a live location). Workers can
 * also ask clarification on broadcasting jobs before they respond.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let sessionUser;
  try {
    sessionUser = await requireRole(["customer", "worker"]);
  } catch (e) {
    return authError(e);
  }

  const jobId = params.id.trim();
  if (!jobId) {
    return fail("Job id is required", 400);
  }

  const parsed = postSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return fail("Invalid message", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    await connectDB();
    let senderId = String(sessionUser.user._id);
    let role: "customer" | "worker" = "customer";
    if (sessionUser.user.role === "worker") {
      const worker = await Worker.findOne({ user_id: sessionUser.user._id }).lean();
      if (!worker) {
        return fail("Worker profile not found for this account", 404);
      }
      senderId = String(worker._id);
      role = "worker";
    }
    const message = await sendJobMessage(jobId, senderId, role, parsed.data);
    return ok(
      {
        message: {
          id: String(message._id),
          sender_type: message.sender_type,
          content: message.content,
          media_ids: message.media_ids,
          location: message.location ?? null,
          created_at: new Date(message.created_at).toISOString(),
        },
      },
      201
    );
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(e.message, e.statusCode, { code: e.code });
    }
    console.error("send message failed:", e);
    return fail("Internal error", 500);
  }
}