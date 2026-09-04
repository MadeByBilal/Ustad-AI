"use client";

import { useState } from "react";
import Link from "next/link";
import TrackingMap from "@/client/components/tracking/dynamicTrackingMap";

const MOCK_WORKER = {
  name: "Ahmed Raza",
  category: "Electrician",
};

const MOCK_DESTINATION = {
  lat: 33.6844,
  lng: 73.0479,
  label: "F-8 Market, Islamabad",
};

const MOCK_WORKER_LOCATION = {
  lat: 33.6941,
  lng: 73.0385,
};

const MOCK_ROUTE: [number, number][] = [
  [73.0385, 33.6941],
  [73.0400, 33.6920],
  [73.0420, 33.6895],
  [73.0440, 33.6870],
  [73.0460, 33.6850],
  [73.0479, 33.6844],
];

type MockStatus = "ACCEPTED" | "EN_ROUTE" | "ARRIVED";

export default function TrackingDemoPage() {
  const [status, setStatus] = useState<MockStatus>("EN_ROUTE");
  const [distanceKm, setDistanceKm] = useState(2.4);
  const [etaMinutes, setEtaMinutes] = useState(8);
  const [workerLocation, setWorkerLocation] = useState(MOCK_WORKER_LOCATION);

  function simulate(status: MockStatus, dist: number, eta: number, loc: { lat: number; lng: number }) {
    setStatus(status);
    setDistanceKm(dist);
    setEtaMinutes(eta);
    setWorkerLocation(loc);
  }

  const isArrived = status === "ARRIVED";
  const isAccepted = status === "ACCEPTED";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-3 sm:p-4 md:p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/customer"
          className="flex items-center gap-1 text-sm font-medium text-muted hover:text-accent"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back
        </Link>
        <span
          className={`badge ${
            isArrived
              ? "!bg-accent/15 !text-accent"
              : isAccepted
                ? "!bg-success !text-white"
                : "!bg-accent/15 !text-accent"
          }`}
        >
          {isArrived ? "Arrived" : isAccepted ? "Accepted" : "On the way"}
        </span>
      </div>

      {/* Status Card */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full ${
              isArrived ? "bg-accent/15" : isAccepted ? "bg-success" : "bg-accent/15"
            }`}
          >
            {isArrived ? (
              <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            ) : isAccepted ? (
              <svg className="h-6 w-6 text-success-fg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-urdu text-sm font-bold text-text">{MOCK_WORKER.name}</p>
            <p className="text-xs text-muted">
              {isArrived ? "Has arrived at your location" : isAccepted ? "Worker accepted your job" : "On the way to you"}
            </p>
          </div>
        </div>

        {/* Distance & ETA */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-bg p-3 text-center">
            <p className="text-2xl font-bold text-text">
              {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}` : distanceKm.toFixed(1)}
            </p>
            <p className="text-xs text-muted">{distanceKm < 1 ? "meters" : "km"}</p>
          </div>
          <div className="rounded-xl bg-bg p-3 text-center">
            <p className="text-2xl font-bold text-text">{etaMinutes}</p>
            <p className="text-xs text-muted">min ETA</p>
          </div>
        </div>

        <p className="mt-2 text-center text-xs text-muted">
          Last updated: {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      </div>

      {/* Map */}
      <TrackingMap
        workerLocation={workerLocation}
        destination={MOCK_DESTINATION}
        distanceKm={distanceKm}
        perspective="customer"
        className="h-[400px]"
        precomputedRoute={MOCK_ROUTE}
      />

      {/* Job Info */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2">
          <span className="badge bg-accent text-bg">{MOCK_WORKER.category}</span>
        </div>
        <p className="mt-2 font-urdu text-sm text-text">مرغی کا فرن بند ہے — بجلی نہیں آ رہی</p>
        <p className="mt-2 flex items-center gap-1 text-xs text-muted">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          {MOCK_DESTINATION.label}
        </p>
      </div>

      {/* Demo controls */}
      <div className="glass-card p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Demo Controls</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => simulate("ACCEPTED", 5.2, 15, { lat: 33.6990, lng: 73.0300 })}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              status === "ACCEPTED" ? "bg-success text-white" : "bg-bg text-muted hover:text-text"
            }`}
          >
            Accepted
          </button>
          <button
            type="button"
            onClick={() => simulate("EN_ROUTE", 2.4, 8, MOCK_WORKER_LOCATION)}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              status === "EN_ROUTE" ? "bg-accent text-bg" : "bg-bg text-muted hover:text-text"
            }`}
          >
            En route
          </button>
          <button
            type="button"
            onClick={() => simulate("ARRIVED", 0.05, 0, { lat: 33.6846, lng: 73.0480 })}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              status === "ARRIVED" ? "bg-accent text-bg" : "bg-bg text-muted hover:text-text"
            }`}
          >
            Arrived
          </button>
        </div>
      </div>

      {/* Cancel */}
      <div className="rounded-xl border border-warning bg-warning/10 p-4 text-center">
        <p className="text-sm font-semibold text-warning">Cancel Job</p>
      </div>
    </div>
  );
}
