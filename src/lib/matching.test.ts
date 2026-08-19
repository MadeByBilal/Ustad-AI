import { describe, expect, it } from "vitest";
import {
  EMERGENCY_CAPABILITY_BONUS,
  RANKING_WEIGHTS,
  rankWorkers,
  scoreWorker,
  workerCompletenessPct,
  type WorkerScoreInput,
} from "@/lib/matching";

function makeWorker(overrides: Partial<WorkerScoreInput> = {}): WorkerScoreInput {
  return {
    skills: ["wiring", "fault finding"],
    ustad_score: 80,
    completed_jobs: 50,
    confirmed_jobs: 45,
    response_rate: 90,
    cancellation_rate: 5,
    average_rating: 4.5,
    emergency_available: false,
    emergency_capabilities: [],
    ...overrides,
  };
}

const CTX = {
  required_skills: ["wiring", "fault finding"],
  radius_km: 5,
  urgency: "normal" as const,
};

describe("scoreWorker", () => {
  it("awards a perfect skill match 100 points", () => {
    const s = scoreWorker(makeWorker(), { ...CTX, distance_km: 1 });
    expect(s.skill_match_score).toBe(100);
  });

  it("awards partial credit for a partial skill match", () => {
    const s = scoreWorker(
      makeWorker({ skills: ["wiring"] }),
      { ...CTX, distance_km: 1 }
    );
    expect(s.skill_match_score).toBe(50);
  });

  it("awards 100 to every worker when no skills are required", () => {
    const s = scoreWorker(makeWorker({ skills: [] }), {
      ...CTX,
      required_skills: [],
      distance_km: 2,
    });
    expect(s.skill_match_score).toBe(100);
  });

  it("scales distance score down with distance", () => {
    const at1 = scoreWorker(makeWorker(), { ...CTX, distance_km: 1 });
    const at4 = scoreWorker(makeWorker(), { ...CTX, distance_km: 4 });
    expect(at1.distance_score).toBe(80);
    expect(at4.distance_score).toBe(20);
  });

  it("clamps distance score at zero beyond the radius", () => {
    const s = scoreWorker(makeWorker(), { ...CTX, distance_km: 9 });
    expect(s.distance_score).toBe(0);
  });

  it("computes reliability from response rate and cancellations", () => {
    const s = scoreWorker(makeWorker(), { ...CTX, distance_km: 1 });
    expect(s.reliability_score).toBe(0.8 * 90 + 0.2 * 95);
  });

  it("keeps ustad_score as-is", () => {
    const s = scoreWorker(makeWorker({ ustad_score: 77 }), {
      ...CTX,
      distance_km: 1,
    });
    expect(s.ustad_score).toBe(77);
  });

  it("derives response score from the confirmation ratio", () => {
    const s = scoreWorker(makeWorker(), { ...CTX, distance_km: 1 });
    expect(s.response_score).toBe(90);
  });

  it("never divides by zero when completed_jobs is 0", () => {
    const s = scoreWorker(makeWorker({ completed_jobs: 0, confirmed_jobs: 0 }), {
      ...CTX,
      distance_km: 1,
    });
    expect(s.response_score).toBe(0);
  });

  it("applies the emergency capability bonus for emergencies", () => {
    const base = scoreWorker(makeWorker(), { ...CTX, distance_km: 1, urgency: "emergency" });
    const capable = scoreWorker(
      makeWorker({ emergency_available: true, emergency_capabilities: ["short circuit"] }),
      { ...CTX, distance_km: 1, urgency: "emergency" }
    );
    expect(capable.final_score - base.final_score).toBe(EMERGENCY_CAPABILITY_BONUS);
  });

  it("combines sub-scores with the documented weights", () => {
    const s = scoreWorker(makeWorker(), { ...CTX, distance_km: 1 });
    const expected =
      RANKING_WEIGHTS.skill_match * s.skill_match_score +
      RANKING_WEIGHTS.distance * s.distance_score +
      RANKING_WEIGHTS.reliability * s.reliability_score +
      RANKING_WEIGHTS.ustad * s.ustad_score +
      RANKING_WEIGHTS.response * s.response_score;
    expect(s.final_score).toBeCloseTo(expected, 5);
  });
});

describe("rankWorkers", () => {
  it("sorts by final score descending", () => {
    const weak = scoreWorker(makeWorker({ ustad_score: 40, response_rate: 60 }), {
      ...CTX,
      distance_km: 4,
    });
    const strong = scoreWorker(makeWorker(), { ...CTX, distance_km: 1 });
    const ranked = rankWorkers([weak, strong]);
    expect(ranked[0].final_score).toBeGreaterThanOrEqual(ranked[1].final_score);
    expect(ranked[0]).toBe(strong);
  });

  it("returns an empty list for no workers", () => {
    expect(rankWorkers([])).toEqual([]);
  });
});

describe("workerCompletenessPct", () => {
  const NOW = new Date("2026-01-01T10:00:00.000Z");

  it("returns 0 for a worker with no profile signals", () => {
    expect(workerCompletenessPct({}, NOW)).toBe(0);
  });

  it("credits a real name", () => {
    expect(workerCompletenessPct({ name: "Imran" }, NOW)).toBe(25);
  });

  it("credits three or more skills", () => {
    expect(
      workerCompletenessPct({ name: "Imran", skills: ["wiring", "fault finding", "meter"] }, NOW)
    ).toBe(50);
  });

  it("does not count a single skill", () => {
    expect(workerCompletenessPct({ skills: ["wiring"] }, NOW)).toBe(0);
  });

  it("credits a location updated within a week", () => {
    const recent = new Date("2025-12-30T10:00:00.000Z");
    expect(workerCompletenessPct({ location_updated_at: recent }, NOW)).toBe(25);
  });

  it("ignores a stale location", () => {
    const stale = new Date("2025-12-01T10:00:00.000Z");
    expect(workerCompletenessPct({ location_updated_at: stale }, NOW)).toBe(0);
  });

  it("credits document verification", () => {
    expect(workerCompletenessPct({ verification_level: "documents_verified" }, NOW)).toBe(25);
  });

  it("identity review alone does not count as documents", () => {
    expect(workerCompletenessPct({ verification_level: "identity_reviewed" }, NOW)).toBe(0);
  });

  it("caps at 100 when everything is present", () => {
    expect(
      workerCompletenessPct(
        {
          name: "Imran",
          skills: ["wiring", "fault finding", "meter"],
          location_updated_at: new Date("2025-12-30T10:00:00.000Z"),
          verification_level: "documents_verified",
        },
        NOW
      )
    ).toBe(100);
  });
});
