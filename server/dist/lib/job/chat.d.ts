import { type JobDoc, type MessageDoc } from "../../models/index.js";
export interface ChatMessageView {
    id: string;
    sender_type: string;
    sender_name: string;
    content: string;
    media_ids: string[];
    location: {
        lat: number;
        lng: number;
    } | null;
    created_at: string;
}
export interface SendMessageInput {
    content?: string;
    photo_ids?: string[];
    location?: {
        lat: number;
        lng: number;
    };
}
/**
 * Resolves the job a chat belongs to. Customers may chat on their own
 * jobs; workers may chat on broadcasting jobs (clarification), jobs they
 * responded to, or jobs they were selected for. Phone numbers are never
 * part of the chat payload.
 */
export declare function getAccessibleJob(jobId: string, userId: string, role: "customer" | "worker"): Promise<JobDoc>;
export declare function listJobMessages(jobId: string, userId: string, role: "customer" | "worker"): Promise<ChatMessageView[]>;
export declare function sendJobMessage(jobId: string, senderId: string, senderType: "customer" | "worker", input: SendMessageInput): Promise<MessageDoc>;
//# sourceMappingURL=chat.d.ts.map