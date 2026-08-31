import { z } from "zod";

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export const photoUploadSchema = z.object({
  mime: z.enum(["image/jpeg", "image/png"]),
  data: z
    .string()
    .regex(/^[A-Za-z0-9+/=\s]+$/, "Expected base64 encoded image data")
    .transform((b64) => {
      const buf = Buffer.from(b64.replace(/\s/g, ""), "base64");
      return buf;
    })
    .refine((buf) => buf.length > 0 && buf.length <= MAX_PHOTO_BYTES, {
      message: "Image must be between 1 byte and 2MB after decoding",
    }),
});

export type PhotoUploadInput = z.infer<typeof photoUploadSchema>;
