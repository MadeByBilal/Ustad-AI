"use client";

import { useRef, useState } from "react";
import { fileToPhotoBase64 } from "@/lib/image";
import { motion } from "framer-motion";
import { Loader2, Camera, X } from "lucide-react";

interface PhotoUpload {
  id: string;
  previewUrl: string;
}

export default function PhotoPicker({ onPhotos }: { onPhotos: (ids: string[]) => void }) {
  const [photos, setPhotos] = useState<PhotoUpload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photosRef = useRef<PhotoUpload[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function update(next: PhotoUpload[]) {
    photosRef.current = next;
    setPhotos(next);
    onPhotos(next.map((photo) => photo.id));
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const added: PhotoUpload[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          setError("Only images are allowed");
          continue;
        }
        const { mime, data } = await fileToPhotoBase64(file);
        const response = await fetch("/api/jobs/photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mime, data }),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.success) {
          setError("Upload failed");
          continue;
        }
        added.push({ id: body.data.photo_id, previewUrl: URL.createObjectURL(file) });
      }
      if (added.length > 0) {
        update([...photosRef.current, ...added]);
      }
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function remove(photoId: string) {
    const remaining = photosRef.current.filter((photo) => photo.id !== photoId);
    photosRef.current.forEach((photo) => {
      if (photo.id === photoId) URL.revokeObjectURL(photo.previewUrl);
    });
    update(remaining);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <motion.button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          whileTap={{ scale: 0.95 }}
          whileHover={{ y: -1 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="btn btn-outline"
        >
          {uploading ? <><Loader2 className="h-4 w-4 inline mr-1 animate-spin" /> Uploading…</> : <><Camera className="h-4 w-4 inline mr-1" /> Take a photo</>}
        </motion.button>
        <input
          ref={inputRef}
          id="photo-input"
          type="file"
          accept="image/*"
          aria-label="Photo"
          className="hidden"
          onChange={(event) => void handleFiles(event.target.files)}
        />
        {photos.map((photo) => (
          <span key={photo.id} title={photo.id} className="relative inline-block">
            <img
              src={photo.previewUrl}
              alt={`photo-${photo.id}`}
          className="h-16 w-16 rounded-lg object-cover ring-1 ring-divider"
            />
            <motion.button
              type="button"
              aria-label="Remove photo"
              className="absolute -right-2 -top-2 rounded-full bg-warning px-1.5 text-xs font-bold text-bg"
              onClick={() => remove(photo.id)}
              whileTap={{ scale: 0.95 }}
              whileHover={{ y: -1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <X className="h-3 w-3" />
            </motion.button>
          </span>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-warning">{error}</p>}
    </div>
  );
}
