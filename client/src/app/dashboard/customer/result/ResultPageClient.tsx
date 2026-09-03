"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import MatchResults from "@/client/components/MatchResults";
import type { MatchResultsData } from "@/client/components/MatchResults";

interface StoredResult {
  data: MatchResultsData;
  location: { lat: number; lng: number } | null;
}

export default function ResultPageClient() {
  const [stored, setStored] = useState<StoredResult | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("voiceResult");
      if (raw) {
        const parsed = JSON.parse(raw) as StoredResult;
        setStored(parsed);
      }
    } catch {
      // corrupted data, ignore
    }
  }, []);

  if (!stored) {
    return (
      <div className="relative bg-bg">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/6 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-warning/4 blur-3xl" />
        <div className="page-header">
          <Link
            href="/dashboard/customer"
            className="flex items-center gap-2 text-sm font-medium text-muted hover:text-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
        <div className="page-content">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <p className="text-center text-muted">
              No results found. Try recording again.
            </p>
            <Link
              href="/dashboard/customer"
              className="btn-primary mt-4"
            >
              Go back
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-bg">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/6 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-warning/4 blur-3xl" />
      <div className="page-header">
        <Link
          href="/dashboard/customer"
          className="flex items-center gap-2 text-sm font-medium text-muted hover:text-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>
      <div className="page-content">
        <MatchResults
          data={stored.data}
          location={stored.location}
        />
        <div className="mt-4 flex gap-3 pb-4">
          <Link
            href="/dashboard/customer"
            className="btn-secondary flex-1 text-center"
          >
            New request
          </Link>
        </div>
      </div>
    </div>
  );
}
