/**
 * Reads an image File from the camera/gallery and returns base64 JPEG/PNG
 * data ready for the photo upload API. Photos larger than 2MB are
 * downscaled on a canvas (browser-side) to keep uploads small; if the
 * result is still too large we refuse.
 */

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export interface PhotoBase64 {
  mime: "image/jpeg" | "image/png";
  data: string;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the image"));
    reader.readAsDataURL(file);
  });
}

function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

async function downscale(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not load the image"));
      img.src = url;
    });

    const MAX_SIDE = 1600;
    const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process the image");
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function fileToPhotoBase64(file: File): Promise<PhotoBase64> {
  let dataUrl = await readAsDataUrl(file);
  let data = dataUrlToBase64(dataUrl);
  let mime: PhotoBase64["mime"] = file.type === "image/png" ? "image/png" : "image/jpeg";

  if (Buffer.byteLength(data, "base64") > MAX_PHOTO_BYTES) {
    dataUrl = await downscale(file);
    data = dataUrlToBase64(dataUrl);
    mime = "image/jpeg";
  }

  if (Buffer.byteLength(data, "base64") > MAX_PHOTO_BYTES) {
    throw new Error("Image is too large even after compression");
  }

  return { mime, data };
}