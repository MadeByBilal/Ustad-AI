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
      <div className="relative" style={{ background: "#0B0F0C" }}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl" style={{ background: "rgba(38,166,80,0.06)" }} />
        <div className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full blur-3xl" style={{ background: "rgba(212,162,74,0.04)" }} />
        <div className="page-header">
          <Link
            href="/dashboard/customer"
            className="flex items-center gap-2 text-sm font-medium text-[#93A396] hover:text-[#26A650] transition-colors"
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
            <p className="text-center text-[#93A396]">
              No results found. Try recording again.
            </p>
            <Link
              href="/dashboard/customer"
              className="mt-4 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-200"
              style={{ background: "#26A650", color: "#08240F", boxShadow: "0 4px 16px rgba(38,166,80,0.3)" }}
            >
              Go back
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" style={{ background: "#0B0F0C" }}>
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl" style={{ background: "rgba(38,166,80,0.06)" }} />
      <div className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full blur-3xl" style={{ background: "rgba(212,162,74,0.04)" }} />
      <div className="page-header">
        <Link
          href="/dashboard/customer"
          className="flex items-center gap-2 text-sm font-medium text-[#93A396] hover:text-[#26A650] transition-colors"
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
            className="flex-1 rounded-xl py-2.5 text-center text-sm font-semibold text-[#93A396] transition-all duration-200 hover:text-[#F1F4F1]"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            New request
          </Link>
        </div>
      </div>
    </div>
  );
}
