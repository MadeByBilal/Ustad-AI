import { describe, expect, it } from "vitest";
import {
  GEO_WEIGHTS,
  NO_GEO_WEIGHTS,
  canonicalizeSkill,
  categoryFromSkills,
  combineScores,
  distanceScoreKm,
  skillsRelated,
} from "./matching.js";

describe("canonicalizeSkill", () => {
  it("turns snake_case AI tags into spaced words", () => {
    expect(canonicalizeSkill("switch_repair")).toBe("switch repair");
  });

  it("resolves whole-string synonyms before per-word ones", () => {
    expect(canonicalizeSkill("gas refill")).toBe("gas refilling");
  });

  it("maps trade synonyms", () => {
    expect(canonicalizeSkill("Switchboard Installation")).toBe(
      "switch installation"
    );
    expect(canonicalizeSkill("nalka")).toBe("faucet");
  });
});

describe("skillsRelated", () => {
  it("relates AI tags to profile skill vocabulary", () => {
    expect(skillsRelated("switch_repair", "switchboard installation")).toBe(
      true
    );
    expect(skillsRelated("gas refill", "gas refilling")).toBe(true);
    expect(skillsRelated("tap repair", "faucet repair")).toBe(true);
    expect(skillsRelated("pipe_leak", "pipe fitting")).toBe(true);
  });

  it("keeps unrelated skills apart", () => {
    expect(skillsRelated("drain cleaning", "wiring")).toBe(false);
    expect(skillsRelated("door repair", "compressor service")).toBe(false);
    expect(skillsRelated("repair", "installation")).toBe(false);
  });
});

describe("categoryFromSkills", () => {
  it("infers the trade from AI skill tags", () => {
    expect(categoryFromSkills(["switch_repair"])).toBe("electrician");
    expect(categoryFromSkills(["wiring"])).toBe("electrician");
    expect(categoryFromSkills(["pipe_leak", "water tank cleaning"])).toBe(
      "plumber"
    );
    expect(categoryFromSkills(["gas_refilling"])).toBe("ac_technician");
    expect(categoryFromSkills(["door lock repair"])).toBe("carpenter");
  });

  it("returns null when nothing is recognizable", () => {
    expect(categoryFromSkills([])).toBeNull();
    expect(categoryFromSkills(["xyzzy"])).toBeNull();
  });
});

describe("distanceScoreKm", () => {
  it("slides from 100 at the door to 0 at the horizon", () => {
    expect(distanceScoreKm(0)).toBe(100);
    expect(distanceScoreKm(7.5)).toBe(50);
    expect(distanceScoreKm(15)).toBe(0);
    expect(distanceScoreKm(40)).toBe(0);
  });

  it("never scores missing distance", () => {
    expect(distanceScoreKm(Number.NaN)).toBe(0);
  });
});

describe("geo sweet-spot blend", () => {
  const base = {
    skill_match_score: 100,
    reliability_score: 80,
    response_score: 80,
    ustad_score: 80,
  };
  const score = (distance: number, rating: number) =>
    combineScores(
      {
        ...base,
        distance_score: distanceScoreKm(distance),
        rating_score: rating,
      },
      GEO_WEIGHTS
    );

  it("a good nearby worker beats a 5-star worker across the city", () => {
    // 4.6★ at 3 km vs 5.0★ at 12 km
    expect(score(3, 92)).toBeGreaterThan(score(12, 100));
  });

  it("a 5-star worker at the door still wins over the sweet spot", () => {
    expect(score(1, 100)).toBeGreaterThan(score(3, 92));
    expect(score(1, 100)).toBeGreaterThan(score(12, 100));
  });

  it("verified bonus breaks ties for an equally-ranked worker", () => {
    const s = {
      ...base,
      distance_score: distanceScoreKm(4),
      rating_score: 90,
    };
    expect(combineScores(s, GEO_WEIGHTS, 5)).toBeGreaterThan(
      combineScores(s, GEO_WEIGHTS)
    );
  });

  it("no-geo blend still ranks on quality when location is missing", () => {
    const s = {
      ...base,
      distance_score: 0,
      rating_score: 90,
    };
    const good = combineScores(s, NO_GEO_WEIGHTS);
    const weak = combineScores({ ...s, rating_score: 50 }, NO_GEO_WEIGHTS);
    expect(good).toBeGreaterThan(weak);
  });
});
