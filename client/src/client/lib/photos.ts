"use client";

import { z } from "zod";

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export const photoUploadSchema = z.object({
  mime: z.enum(["image/jpeg", "image/png"]),
  data: z
    .string()
    .regex(/^[A-Za-z0-9+/=\s]+$/, "Expected base64 encoded image data")
    .transform((b64) => base64ToBytes(b64.replace(/\s/g, "")))
    .refine((buf) => buf.length > 0 && buf.length <= MAX_PHOTO_BYTES, {
      message: "Image must be between 1 byte and 2MB after decoding",
    }),
});

export type PhotoUploadInput = z.infer<typeof photoUploadSchema>;
