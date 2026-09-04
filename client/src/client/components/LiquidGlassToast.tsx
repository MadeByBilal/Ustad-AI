"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  type?: "info" | "success" | "warning";
  duration?: number;
  onClick?: () => void;
}

let toastCounter = 0;
const listeners: Array<(toast: Toast) => void> = [];

export function showToast(
  toast: Omit<Toast, "id">
) {
  const id = `toast-${++toastCounter}`;
  listeners.forEach((fn) => fn({ ...toast, id }));
}

export default function LiquidGlassToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Toast) => {
    setToasts((prev) => [...prev, toast]);
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, duration);
    }
  }, []);

  useEffect(() => {
    listeners.push(addToast);
    return () => {
      const idx = listeners.indexOf(addToast);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, [addToast]);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none w-80 max-w-[calc(100vw-2rem)]">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="pointer-events-auto"
          >
            <div
              onClick={toast.onClick}
              className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl p-4 shadow-xl ${
                toast.onClick ? "cursor-pointer" : ""
              } ${
                toast.type === "success"
                  ? "border-accent/30 bg-accent/10"
                  : toast.type === "warning"
                  ? "border-warning/30 bg-warning/10"
                  : "border-divider bg-surface/80"
              }`}
            >
              {/* Glass sheen */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent" />

              <div className="relative flex items-start gap-3">
                <img src="/logo.png" alt="" className="h-6 w-6 rounded-lg object-cover flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text leading-tight">{toast.title}</p>
                  {toast.description && (
                    <p className="text-xs text-muted mt-1 leading-relaxed">{toast.description}</p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismiss(toast.id);
                  }}
                  className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-muted hover:text-text hover:bg-white/10 transition-colors"
                >
                  <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
