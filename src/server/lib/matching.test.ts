import { describe, expect, it } from "vitest";
import {
  EMERGENCY_CAPABILITY_BONUS,
  NO_GEO_WEIGHTS,
  RANKING_WEIGHTS,
  VERIFIED_BONUS,
  canonicalizeSkill,
  pickBestAndOthers,
  rankWorkers,
  scoreWorker,
  workerCompletenessPct,
  type WorkerOption,
  type WorkerScoreInput,
} from "@/server/lib/matching";

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

describe("pickBestAndOthers", () => {
  function opt(id: string, score: number, category = "plumber" as const): WorkerOption {
    return {
      id,
      name: `Worker ${id}`,
      category,
      skills: [],
      verified: true,
      verification_level: "identity_reviewed",
      ustad_score: 80,
      completed_jobs: 10,
      average_rating: 4.5,
      skills_match: 100,
      final_score: score,
    };
  }

  it("returns the top worker as best and the rest as others", () => {
    const ranked = [opt("b", 95), opt("a", 99), opt("c", 80)];
    const { best, others } = pickBestAndOthers(ranked, 3);
    expect(best?.id).toBe("a");
    expect(others.map((o) => o.id)).toEqual(["b", "c"]);
  });

  it("caps the others list to limit - 1", () => {
    const ranked = [opt("1", 90), opt("2", 80), opt("3", 70), opt("4", 60)];
    const { best, others } = pickBestAndOthers(ranked, 3);
    expect(best?.id).toBe("1");
    expect(others.map((o) => o.id)).toEqual(["2", "3"]);
  });

  it("handles an empty list", () => {
    const { best, others } = pickBestAndOthers([], 3);
    expect(best).toBeNull();
    expect(others).toEqual([]);
  });
});

describe("canonicalizeSkill", () => {
  it("lowercases and trims", () => {
    expect(canonicalizeSkill("  Faucet Repair  ")).toBe("faucet repair");
  });

  it("replaces Roman-Urdu synonyms with canonical tokens", () => {
    expect(canonicalizeSkill("tap repair")).toBe("faucet repair");
    expect(canonicalizeSkill("naali cleaning")).toBe("drain cleaning");
    expect(canonicalizeSkill("nalka fitting")).toBe("faucet fitting");
    expect(canonicalizeSkill("lakri door")).toBe("wood door");
    expect(canonicalizeSkill("darwaza repair")).toBe("door repair");
  });

  it("leaves canonical skills unchanged", () => {
    expect(canonicalizeSkill("faucet repair")).toBe("faucet repair");
    expect(canonicalizeSkill("wiring")).toBe("wiring");
  });
});

describe("skill matching with synonyms", () => {
  const CTX_SYNONYM = {
    required_skills: ["faucet repair"],
    radius_km: 5,
    urgency: "normal" as const,
  };

  it("gives full credit when worker skill matches via synonym", () => {
    const s = scoreWorker(
      makeWorker({ skills: ["tap repair"] }),
      { ...CTX_SYNONYM, distance_km: 1 }
    );
    expect(s.skill_match_score).toBe(100);
  });

  it("gives full credit when worker skill is the canonical form", () => {
    const s = scoreWorker(
      makeWorker({ skills: ["faucet repair"] }),
      { ...CTX_SYNONYM, distance_km: 1 }
    );
    expect(s.skill_match_score).toBe(100);
  });

  it("gives zero when no synonym or canonical match exists", () => {
    const s = scoreWorker(
      makeWorker({ skills: ["wiring", "fault finding"] }),
      { ...CTX_SYNONYM, distance_km: 1 }
    );
    expect(s.skill_match_score).toBe(0);
  });
});

describe("rating_score", () => {
  it("scales average_rating to 0-100 (5.0 → 100, 4.0 → 80)", () => {
    const s5 = scoreWorker(makeWorker({ average_rating: 5.0 }), {
      ...CTX,
      distance_km: 1,
    });
    const s4 = scoreWorker(makeWorker({ average_rating: 4.0 }), {
      ...CTX,
      distance_km: 1,
    });
    expect(s5.rating_score).toBe(100);
    expect(s4.rating_score).toBe(80);
  });
});

describe("no-geo weights", () => {
  it("sum to 1.0", () => {
    const sum =
      NO_GEO_WEIGHTS.skill_match +
      NO_GEO_WEIGHTS.distance +
      NO_GEO_WEIGHTS.reliability +
      NO_GEO_WEIGHTS.ustad +
      NO_GEO_WEIGHTS.response +
      NO_GEO_WEIGHTS.rating;
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it("has distance weight of 0", () => {
    expect(NO_GEO_WEIGHTS.distance).toBe(0);
  });
});

describe("verified bonus", () => {
  it("is a positive constant", () => {
    expect(VERIFIED_BONUS).toBeGreaterThan(0);
  });
});
