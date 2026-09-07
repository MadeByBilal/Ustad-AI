"use client";

import { cn } from "@/client/lib/cn";

interface ProfileAvatarProps {
  src: string | null | undefined;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-2xl",
};

function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "U";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function ProfileAvatar({ src, name, size = "md", className }: ProfileAvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(
          "shrink-0 rounded-full object-cover",
          sizeClasses[size],
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-success",
        sizeClasses[size],
        className,
      )}
    >
      <span className="font-bold text-success-fg">{initials(name)}</span>
    </div>
  );
}
