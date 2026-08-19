import { connectDB } from "@/lib/mongodb";
import {
  Job,
  Message,
  User,
  Worker,
  type JobDoc,
  type MessageDoc,
} from "@/models";
import { FlowError } from "./flow";

export interface ChatMessageView {
  id: string;
  sender_type: string;
  sender_name: string;
  content: string;
  media_ids: string[];
  location: { lat: number; lng: number } | null;
  created_at: string;
}

export interface SendMessageInput {
  content?: string;
  photo_ids?: string[];
  location?: { lat: number; lng: number };
}

/**
 * Resolves the job a chat belongs to. Customers may chat on their own
 * jobs; workers may chat on broadcasting jobs (clarification), jobs they
 * responded to, or jobs they were selected for. Phone numbers are never
 * part of the chat payload.
 */
export async function getAccessibleJob(
  jobId: string,
  userId: string,
  role: "customer" | "worker"
): Promise<JobDoc> {
  await connectDB();
  const filter: Record<string, unknown> = { _id: jobId };
  if (role === "customer") {
    filter.customer_id = userId;
  } else {
    filter.$or = [
      { status: "BROADCASTING" },
      { "matching.accepted_worker_ids": userId },
      { "matching.selected_worker_id": userId },
    ];
  }
  const job = await Job.findOne(filter);
  if (!job) {
    throw new FlowError("chat_access_denied", "No access to this job chat", 404);
  }
  return job;
}

export async function listJobMessages(
  jobId: string,
  userId: string,
  role: "customer" | "worker"
): Promise<ChatMessageView[]> {
  await getAccessibleJob(jobId, userId, role);
  const messages = await Message.find({ job_id: jobId })
    .sort({ created_at: 1 })
    .lean();

  const workerIds = messages
    .filter((m) => m.sender_type === "worker")
    .map((m) => m.sender_id);
  const customerIds = messages
    .filter((m) => m.sender_type === "customer")
    .map((m) => m.sender_id);

  const [workers, customers] = await Promise.all([
    workerIds.length > 0
      ? Worker.find({ _id: { $in: workerIds } }).select("_id name").lean()
      : [],
    customerIds.length > 0
      ? User.find({ _id: { $in: customerIds } }).select("_id name").lean()
      : [],
  ]);
  const names = new Map<string, string>();
  for (const w of workers) names.set(String(w._id), w.name || "Ustad");
  for (const c of customers) names.set(String(c._id), c.name || "Customer");

  return messages.map((m) => ({
    id: String(m._id),
    sender_type: m.sender_type,
    sender_name:
      m.sender_type === "system"
        ? "Ustad AI"
        : (names.get(String(m.sender_id)) ?? (m.sender_type === "worker" ? "Ustad" : "Customer")),
    content: m.content ?? "",
    media_ids: m.media_ids ?? [],
    location:
      m.location && typeof m.location.lat === "number" && typeof m.location.lng === "number"
        ? { lat: m.location.lat, lng: m.location.lng }
        : null,
    created_at: new Date(m.created_at).toISOString(),
  }));
}

export async function sendJobMessage(
  jobId: string,
  senderId: string,
  senderType: "customer" | "worker",
  input: SendMessageInput
): Promise<MessageDoc> {
  await getAccessibleJob(jobId, senderId, senderType);
  return Message.create({
    job_id: jobId,
    sender_id: senderId,
    sender_type: senderType,
    content: input.content ?? "",
    media_ids: input.photo_ids ?? [],
    location: input.location ?? undefined,
  });
}