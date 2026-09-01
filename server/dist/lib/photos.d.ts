import { z } from "zod";
export declare const MAX_PHOTO_BYTES: number;
export declare const photoUploadSchema: z.ZodObject<{
    mime: z.ZodEnum<{
        "image/jpeg": "image/jpeg";
        "image/png": "image/png";
    }>;
    data: z.ZodPipe<z.ZodString, z.ZodTransform<Buffer<ArrayBuffer>, string>>;
}, z.core.$strip>;
export type PhotoUploadInput = z.infer<typeof photoUploadSchema>;
//# sourceMappingURL=photos.d.ts.map