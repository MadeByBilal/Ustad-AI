"use client";

import { useState } from "react";

interface ReviewScreenProps {
  jobId: string;
  workerName: string;
  onDone: () => void;
}

export default function ReviewScreen({ jobId, workerName, onDone }: ReviewScreenProps) {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, text: text.trim() || undefined }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        throw new Error(body?.error ?? "Failed to submit review");
      }
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit review");
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="mt-6 text-2xl font-bold text-stone-900">Thank you!</h1>
        <p className="mt-2 text-center text-base text-stone-500">
          Your review helps other customers find the best workers.
        </p>
        <button type="button" onClick={onDone} className="btn-primary mt-8">
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-5">
      {/* Worker Avatar */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#0e5f44]">
        <span className="text-3xl font-bold text-white">
          {workerName.charAt(0).toUpperCase()}
        </span>
      </div>

      <h1 className="mt-6 text-2xl font-bold text-stone-900">Rate your experience</h1>
      <p className="mt-2 text-base text-stone-500">How was {workerName}?</p>

      {/* Star Rating */}
      <div className="mt-8 flex gap-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            onClick={() => setRating(star)}
            className="transition-transform hover:scale-110 active:scale-95"
          >
            <svg
              className={`h-12 w-12 ${
                star <= (hoveredStar || rating)
                  ? "text-amber-400"
                  : "text-stone-200"
              }`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        ))}
      </div>

      {/* Rating Text */}
      <p className="mt-4 text-sm text-stone-400">
        {rating === 0 && "Tap a star to rate"}
        {rating === 1 && "Poor"}
        {rating === 2 && "Fair"}
        {rating === 3 && "Good"}
        {rating === 4 && "Very Good"}
        {rating === 5 && "Excellent"}
      </p>

      {/* Review Text */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tell others about your experience (optional)"
        rows={3}
        className="input mt-8 resize-none"
      />

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={busy || rating === 0}
        className="btn-primary mt-6 w-full disabled:opacity-50"
      >
        {busy ? "Submitting..." : "Submit Review"}
      </button>

      <button
        type="button"
        onClick={onDone}
        className="mt-3 text-sm font-medium text-stone-400"
      >
        Skip for now
      </button>
    </div>
  );
}
