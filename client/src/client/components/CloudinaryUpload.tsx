"use client";

import { useCallback, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera, faSpinner, faXmark } from "@fortawesome/free-solid-svg-icons";
import ProfileAvatar from "./ProfileAvatar";

interface CloudinaryUploadProps {
  currentImage: string | null | undefined;
  name: string;
  onUploaded: (url: string) => void;
  onRemoved: () => void;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function CloudinaryUpload({
  currentImage,
  name,
  onUploaded,
  onRemoved,
  size = "lg",
}: CloudinaryUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  const handleFile = useCallback(
    async (file: File) => {
      if (!cloudName || !uploadPreset) {
        setError("Cloudinary not configured");
        return;
      }

      // Validate file
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be under 5MB");
        return;
      }

      setUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);
        formData.append("folder", "profile-images");

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          { method: "POST", body: formData },
        );

        if (!res.ok) {
          throw new Error("Upload failed");
        }

        const data = await res.json();
        onUploaded(data.secure_url);
      } catch {
        setError("Failed to upload image. Try again.");
      } finally {
        setUploading(false);
      }
    },
    [cloudName, uploadPreset, onUploaded],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so re-selecting the same file triggers change
      e.target.value = "";
    },
    [handleFile],
  );

  const configured = Boolean(cloudName && uploadPreset);

  return (
    <div className="relative inline-flex flex-col items-center">
      <button
        type="button"
        onClick={() => (configured ? inputRef.current?.click() : null)}
        className={`group relative ${configured ? "cursor-pointer" : "cursor-default"}`}
        title={configured ? "Change profile photo" : "Cloudinary not configured"}
      >
        <ProfileAvatar src={currentImage} name={name} size={size} />

        {/* Camera overlay */}
        {configured && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            {uploading ? (
              <FontAwesomeIcon icon={faSpinner} className="h-5 w-5 text-white animate-spin" />
            ) : (
              <FontAwesomeIcon icon={faCamera} className="h-5 w-5 text-white" />
            )}
          </div>
        )}
      </button>

      {/* Remove button */}
      {currentImage && configured && !uploading && (
        <button
          type="button"
          onClick={onRemoved}
          className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-warning text-white shadow-md transition-colors hover:bg-warning/80"
          title="Remove photo"
        >
          <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />

      {error && <p className="mt-1 text-xs text-warning">{error}</p>}
    </div>
  );
}
