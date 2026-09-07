"use client";

import MatchResults from "@/client/components/MatchResults";
import type { MatchResultsData } from "@/client/components/MatchResults";

const mockData: MatchResultsData = {
  source: "gemini",
  understanding: {
    category: "electrician",
    subcategory: "wiring",
    description: "Lights flickering in the kitchen, one outlet not working",
    required_skills: ["wiring", "troubleshooting"],
    urgency: "normal",
    safety_flags: [],
    confidence: 0.92,
    clarification_required: false,
    estimate_min: 500,
    estimate_max: 1500,
    inspection_fee: 350,
    complexity: "low",
  },
  workers: {
    best: {
      id: "w1",
      name: "Ahmed Khan",
      profile_image: null,
      category: "electrician",
      skills: ["wiring", "inverter installation", "appliance repair"],
      verified: true,
      verification_level: "nid",
      ustad_score: 88,
      completed_jobs: 47,
      average_rating: 4.8,
      response_rate: 95,
      skills_match: 90,
      final_score: 92,
      distance_km: 1.2,
      predicted_price: 800,
      travel_cost_pkr: 100,
    },
    others: [
      {
        id: "w2",
        name: "Usman Ali",
        profile_image: null,
        category: "electrician",
        skills: ["wiring", "lighting"],
        verified: true,
        verification_level: "nid",
        ustad_score: 75,
        completed_jobs: 32,
        average_rating: 4.5,
        response_rate: 88,
        skills_match: 78,
        final_score: 79,
        distance_km: 2.8,
        predicted_price: 900,
        travel_cost_pkr: 150,
      },
      {
        id: "w3",
        name: "Bilal Ahmed",
        profile_image: null,
        category: "electrician",
        skills: ["wiring", "ceiling fan", "switch board"],
        verified: false,
        verification_level: "none",
        ustad_score: 60,
        completed_jobs: 15,
        average_rating: 4.2,
        response_rate: 72,
        skills_match: 65,
        final_score: 66,
        distance_km: 4.1,
        predicted_price: 700,
        travel_cost_pkr: 200,
      },
    ],
  },
};

export default function DemoPage() {
  return (
    <div className="page-content bg-bg">
      <div className="mx-auto max-w-lg">
        <MatchResults data={mockData} />
      </div>
    </div>
  );
}
