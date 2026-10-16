import { connectDB } from "./mongodb.js";
import { buildBoundingBox, haversineDistanceKm } from "./geo.js";
import { Worker, type UrgencyLevel, type WorkerCategory } from "../models/index.js";
import { CANONICAL_SKILLS } from "./job/analyze.js";
import { calculatePredictedPrice } from "./job/pricing.js";
import type { ComplexityLevel } from "./job/pricing.js";

export const RANKING_WEIGHTS = {
  skill_match: 0.3,
  distance: 0.25,
  reliability: 0.2,
  ustad: 0.15,
  response: 0.1,
} as const;

/** Bonus for workers who opted into emergency service on emergency jobs. */
export const EMERGENCY_CAPABILITY_BONUS = 10;

/** Bonus applied to verified workers in the voice-match options path. */
export const VERIFIED_BONUS = 5;

/**
 * Weights used by getWorkerOptions when no geo context is available
 * (radius_km = 0). The 25% distance weight is redistributed to skill
 * match and reliability so it doesn't zero-out every candidate.
 */
export const NO_GEO_WEIGHTS = {
  skill_match: 0.35,
  distance: 0,
  reliability: 0.25,
  ustad: 0.2,
  response: 0.1,
  rating: 0.1,
} as const;

/**
 * Voice-match flow with the customer's location: the sweet spot between
 * quality and proximity. Distance and rating together carry 45% — a good
 * worker around the corner beats a 5-star worker across the city, but a
 * 5-star worker at the door still wins over a good one 2 km away.
 */
export const GEO_WEIGHTS = {
  skill_match: 0.35,
  distance: 0.25,
  rating: 0.2,
  reliability: 0.1,
  response: 0.1,
} as const;

/** Distance at which the proximity score reaches zero (~one city). */
export const SWEET_SPOT_RADIUS_KM = 15;

/**
 * Proximity score for the sweet-spot blend: 100 at the door, sliding to 0
 * at the horizon. Linear on purpose — predictable for the pilot.
 */
export function distanceScoreKm(
  distanceKm: number,
  radiusKm: number = SWEET_SPOT_RADIUS_KM
): number {
  if (!Number.isFinite(distanceKm) || radiusKm <= 0) return 0;
  return Number(clamp(100 * (1 - distanceKm / radiusKm), 0, 100).toFixed(2));
}

export interface ScoreComponents {
  skill_match_score: number;
  distance_score: number;
  reliability_score: number;
  response_score: number;
  rating_score: number;
  ustad_score?: number;
}

/**
 * Weighted sum of the score components, shared by every ranking path so
 * the blends stay consistent. Weights with no component (e.g. rating in
 * RANKING_WEIGHTS) simply contribute nothing.
 */
export function combineScores(
  s: ScoreComponents,
  weights: {
    skill_match: number;
    distance: number;
    reliability: number;
    response: number;
    rating?: number;
    ustad?: number;
  },
  bonus = 0
): number {
  const total =
    weights.skill_match * s.skill_match_score +
    weights.distance * s.distance_score +
    weights.reliability * s.reliability_score +
    weights.response * s.response_score +
    (weights.rating ?? 0) * s.rating_score +
    (weights.ustad ?? 0) * (s.ustad_score ?? 0) +
    bonus;
  return Number(total.toFixed(2));
}

export const LOCATION_FRESHNESS_NORMAL_MS = 5 * 60_000;
export const LOCATION_FRESHNESS_EMERGENCY_MS = 2 * 60_000;

export interface WorkerScoreInput {
  skills: string[];
  ustad_score: number;
  completed_jobs: number;
  confirmed_jobs: number;
  response_rate: number;
  cancellation_rate: number;
  average_rating: number;
  emergency_available: boolean;
  emergency_capabilities: string[];
}

export interface MatchContext {
  required_skills: string[];
  radius_km: number;
  urgency: UrgencyLevel;
}

export interface WorkerScore extends WorkerScoreInput {
  _id: unknown;
  name: string;
  category: WorkerCategory | null;
  distance_km: number;
  matched_skills: string[];
  skill_match_score: number;
  distance_score: number;
  reliability_score: number;
  response_score: number;
  rating_score: number;
  final_score: number;
}

export interface SearchFilters extends MatchContext {
  category: WorkerCategory;
  lat: number;
  lng: number;
  limit?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Common synonyms (especially Roman-Urdu) mapped to the canonical skill
 * tokens used by the keyword engine. Word-level substitution so
 * "tap repair" becomes "faucet repair" and "faucet installation" also
 * maps to the "faucet" token.
 */
const SKILL_SYNONYMS: Record<string, string> = {
  tap: "faucet",
  nalka: "faucet",
  naali: "drain",
  pani: "pipe",
  paani: "pipe",
  lakri: "wood",
  lakdi: "wood",
  darwaza: "door",
  almari: "cabinet",
  bijli: "electricity",
  cooling: "ac",
  refrigerant: "gas",
  "gas refill": "gas refilling",
  // Bridges between AI skill tags and the profile skill vocabulary.
  switchboard: "switch",
  wiring: "wire",
  bulb: "light",
  lighting: "light",
  "tube light": "light",
  pump: "motor",
  leakage: "leak",
  seepage: "leak",
};

/** Words that carry no trade signal on their own ("door repair" === "door"). */
const SKILL_STOPWORDS = new Set([
  "repair",
  "repairs",
  "installation",
  "fitting",
  "service",
  "cleaning",
  "fix",
  "finding",
  "making",
  "work",
]);

/**
 * Canonicalize a skill string so synonym and token overlap can be compared.
 * Snake_case AI tags become spaced ("switch_repair" → "switch repair") and
 * whole-string synonyms are resolved before per-word ones.
 */
export function canonicalizeSkill(skill: string): string {
  const lower = skill.toLowerCase().trim().replace(/[_-]+/g, " ");
  const whole = SKILL_SYNONYMS[lower] ?? lower;
  return whole
    .split(/\s+/)
    .map((w) => SKILL_SYNONYMS[w] ?? w)
    .join(" ");
}

function skillTokens(skill: string): Set<string> {
  const tokens = canonicalizeSkill(skill)
    .split(/\s+/)
    .filter((t) => t.length > 1 && !SKILL_STOPWORDS.has(t));
  return new Set(tokens);
}

/**
 * Two skills are "related" when they canonicalize to the same string or
 * share a meaningful token: "switch repair" ≈ "switchboard installation",
 * "switch_repair" ≈ "switch repair".  This lets AI-generated skill tags be
 * compared against the profile skill vocabulary without exact-string luck.
 */
export function skillsRelated(a: string, b: string): boolean {
  if (canonicalizeSkill(a) === canonicalizeSkill(b)) return true;
  const ta = skillTokens(a);
  const tb = skillTokens(b);
  if (ta.size === 0 || tb.size === 0) return false;
  for (const token of ta) {
    if (tb.has(token)) return true;
  }
  return false;
}

/**
 * Best-guess trade for a set of skills — a safety net for when the analysis
 * did not pin a category.  ["switch repair"] still routes the customer to
 * electricians only, never to a mixed list.
 */
export function categoryFromSkills(skills: string[]): WorkerCategory | null {
  const votes = new Map<WorkerCategory, number>();
  for (const skill of skills) {
    for (const [category, canonical] of Object.entries(CANONICAL_SKILLS) as [
      WorkerCategory,
      string[],
    ][]) {
      if (canonical.some((c) => skillsRelated(skill, c))) {
        votes.set(category, (votes.get(category) ?? 0) + 1);
      }
    }
  }
  let best: WorkerCategory | null = null;
  let bestVotes = 0;
  for (const [category, count] of votes) {
    if (count > bestVotes) {
      best = category;
      bestVotes = count;
    }
  }
  return best;
}

function skillMatchScore(
  workerSkills: string[],
  requiredSkills: string[]
): number {
  if (requiredSkills.length === 0) {
    return 100;
  }
  const matched = requiredSkills.filter((r) =>
    workerSkills.some((s) => skillsRelated(r, s))
  );
  return Math.round((matched.length / requiredSkills.length) * 100);
}

export function scoreWorker(
  worker: WorkerScoreInput,
  ctx: MatchContext & { distance_km: number },
  id?: unknown,
  name?: string,
  category?: WorkerCategory
): WorkerScore {
  const matched = worker.skills.filter((s) =>
    ctx.required_skills.some((r) => skillsRelated(r, s))
  );

  const skill_match_score = skillMatchScore(worker.skills, ctx.required_skills);
  const distance_score =
    ctx.radius_km > 0
      ? Number(clamp(100 * (1 - ctx.distance_km / ctx.radius_km), 0, 100).toFixed(2))
      : 0;
  const reliability_score = clamp(
    0.8 * worker.response_rate + 0.2 * (100 - worker.cancellation_rate),
    0,
    100
  );
  const ustad_score = clamp(worker.ustad_score, 0, 100);
  const response_score =
    worker.completed_jobs > 0
      ? clamp((worker.confirmed_jobs / worker.completed_jobs) * 100, 0, 100)
      : 0;
  const rating_score = clamp(worker.average_rating * 20, 0, 100); // 5.0 → 100

  const emergencyBonus =
    ctx.urgency === "emergency" &&
    worker.emergency_available &&
    worker.emergency_capabilities.length > 0
      ? EMERGENCY_CAPABILITY_BONUS
      : 0;

  const final_score = combineScores(
    {
      skill_match_score,
      distance_score,
      reliability_score,
      response_score,
      rating_score,
      ustad_score,
    },
    RANKING_WEIGHTS,
    emergencyBonus
  );

  return {
    ...worker,
    _id: id ?? null,
    name: name ?? "",
    category: category ?? null,
    distance_km: ctx.distance_km,
    matched_skills: matched,
    skill_match_score,
    distance_score,
    reliability_score,
    response_score,
    rating_score,
    final_score: Number(final_score.toFixed(2)),
  };
}

export function rankWorkers(workers: WorkerScore[]): WorkerScore[] {
  return [...workers].sort(
    (a, b) =>
      b.final_score - a.final_score ||
      a.distance_km - b.distance_km ||
      b.ustad_score - a.ustad_score
  );
}

function workerToScoreInput(w: {
  name: string;
  category: WorkerCategory;
  skills: string[];
  ustad_score: number;
  completed_jobs: number;
  confirmed_jobs: number;
  response_rate: number;
  cancellation_rate: number;
  average_rating: number;
  emergency_available: boolean;
  emergency_capabilities: string[];
}): WorkerScoreInput {
  return {
    skills: w.skills,
    ustad_score: w.ustad_score,
    completed_jobs: w.completed_jobs,
    confirmed_jobs: w.confirmed_jobs,
    response_rate: w.response_rate,
    cancellation_rate: w.cancellation_rate,
    average_rating: w.average_rating,
    emergency_available: w.emergency_available,
    emergency_capabilities: w.emergency_capabilities,
  };
}

/**
 * Deterministic eligible-worker search:
 *   - category + at least one required skill (enforced post-query by score)
 *   - verified, online, available, not suspended, no active job
 *   - fresh location (5 min normal / 2 min emergency)
 *   - within search_radius_km (geo box pre-filter, exact haversine post-filter)
 *   - service area covers the customer location
 *   - emergency jobs additionally require emergency_available
 *
 * A bounding-box $geoWithin pre-filter (instead of $near) is used so the
 * query stays unambiguous with the collection's two 2dsphere indexes
 * (location + service_area) — see README "Geo search" note. Exact distance
 * is enforced with haversine before ranking.
 */
export async function searchEligibleWorkers(
  filters: SearchFilters
): Promise<WorkerScore[]> {
  const { category, lat, lng, radius_km, urgency, required_skills } = filters;
  await connectDB();

  const freshnessMs =
    urgency === "emergency"
      ? LOCATION_FRESHNESS_EMERGENCY_MS
      : LOCATION_FRESHNESS_NORMAL_MS;

  const [minLng, minLat, maxLng, maxLat] = buildBoundingBox(lng, lat, radius_km);
  const ring: number[][] = [
    [minLng, minLat],
    [maxLng, minLat],
    [maxLng, maxLat],
    [minLng, maxLat],
    [minLng, minLat],
  ];

  const query: Record<string, unknown> = {
    category,
    verified: true,
    is_online: true,
    is_available: true,
    suspended: false,
    active_job_id: null,
    location_updated_at: { $gte: new Date(Date.now() - freshnessMs) },
    location: {
      $geoWithin: {
        $geometry: { type: "Polygon", coordinates: [ring] },
      },
    },
    service_area: {
      $geoIntersects: {
        $geometry: { type: "Point", coordinates: [lng, lat] },
      },
    },
  };

  if (urgency === "emergency") {
    query.emergency_available = true;
  }

  const candidates = await Worker.find(query).lean();

  const nearby = candidates
    .filter((w): w is typeof w & { location: NonNullable<typeof w.location> } =>
      Boolean(w.location?.coordinates)
    )
    .filter((w) => w.location?.coordinates)
    .map((w) => {
      const coords = w.location!.coordinates!;
      return {
        ...w,
        distance_km: haversineDistanceKm(
          lat,
          lng,
          coords[1],
          coords[0]
        ),
      };
    })
    .filter((w) => w.distance_km <= radius_km)
    .filter((w) =>
      required_skills.length === 0
        ? true
        : w.skills.some((s) => required_skills.some((r) => skillsRelated(r, s)))
    );

  const ctx: MatchContext = { required_skills, radius_km, urgency };
  const ranked = nearby
    .map((w) =>
      scoreWorker(
        workerToScoreInput(w),
        { ...ctx, distance_km: w.distance_km },
        w._id,
        w.name,
        w.category
      )
    )
    .sort(
      (a, b) =>
        b.final_score - a.final_score ||
        a.distance_km - b.distance_km ||
        b.ustad_score - a.ustad_score
    );

  const limit = filters.limit ?? 15;
  return ranked.slice(0, limit);
}

/** Minimal public metadata about an eligible worker for the results UI. */
export interface WorkerResult {
  id: string;
  name: string;
  category: WorkerCategory;
  skills: string[];
  matched_skills: string[];
  verification_level: string;
  verified: boolean;
  completeness_pct: number;
  ustad_score: number;
  completed_jobs: number;
  average_rating: number;
  distance_km: number;
  skills_match: number;
  final_score: number;
}

export const FRESH_LOCATION_DAYS = 7;

interface CompletenessSignals {
  name?: string;
  skills?: string[];
  location_updated_at?: Date | string;
  verification_level?: string;
}

/**
 * How complete a worker's public profile is, as a percent. Used by the
 * results UI to nudge workers to finish onboarding.
 */
export function workerCompletenessPct(
  signals: CompletenessSignals,
  now: Date = new Date()
): number {
  let pct = 0;
  if (signals.name && signals.name.trim().length >= 3) pct += 25;
  if (signals.skills && signals.skills.length >= 3) pct += 25;
  const locationUpdated = signals.location_updated_at
    ? new Date(signals.location_updated_at)
    : null;
  if (
    locationUpdated &&
    now.getTime() - locationUpdated.getTime() <= FRESH_LOCATION_DAYS * 24 * 3600 * 1000
  ) {
    pct += 25;
  }
  if (signals.verification_level === "documents_verified") pct += 25;
  return Math.min(pct, 100);
}

export async function getWorkerResults(
  filters: SearchFilters
): Promise<WorkerResult[]> {
  const ranked = await searchEligibleWorkers(filters);
  const byId = await Worker.find({ _id: { $in: ranked.map((r) => r._id) } })
    .select("_id name verification_level location_updated_at skills verified")
    .lean();

  const meta = new Map(byId.map((w) => [String(w._id), w]));
  return ranked.map((r) => {
    const m = meta.get(String(r._id));
    return {
      id: String(r._id),
      name: r.name || "Ustad",
      category: r.category ?? ("plumber" as WorkerCategory),
      skills: r.skills,
      matched_skills: r.matched_skills,
      verification_level: m?.verification_level ?? "identity_reviewed",
      verified: Boolean(m?.verified),
      completeness_pct: workerCompletenessPct({
        name: m?.name ?? r.name,
        skills: m?.skills,
        location_updated_at: m?.location_updated_at,
        verification_level: m?.verification_level,
      }),
      ustad_score: r.ustad_score,
      completed_jobs: r.completed_jobs,
      average_rating: r.average_rating,
      distance_km: Number(r.distance_km.toFixed(2)),
      skills_match: r.skill_match_score,
      final_score: r.final_score,
    };
  });
}

/** Lightweight public worker profile for the landing flow (no geo required). */
export interface WorkerOption {
  id: string;
  name: string;
  category: WorkerCategory;
  skills: string[];
  verified: boolean;
  verification_level: string;
  ustad_score: number;
  completed_jobs: number;
  average_rating: number;
  /** % of jobs the worker responds to (0-100). Closest honest signal to "responsiveness". */
  response_rate?: number;
  skills_match: number;
  final_score: number;
  distance_km?: number | null;
  predicted_price?: number;
  /** Work portion of the estimate (AI range × complexity). */
  predicted_work_pkr?: number;
  travel_cost_pkr?: number;
}

export interface WorkerOptionsFilters {
  category: WorkerCategory | null;
  required_skills: string[];
  urgency: UrgencyLevel;
  limit?: number;
  location?: { lat: number; lng: number };
  estimate_min?: number;
  estimate_max?: number;
  complexity?: ComplexityLevel;
}

/**
 * Splits a ranked worker list into the single best match plus the
 * alternative options shown below it. The best is the first item; others
 * are capped at `limit - 1`.
 */
export function pickBestAndOthers(
  ranked: WorkerOption[],
  limit: number
): { best: WorkerOption | null; others: WorkerOption[] } {
  if (ranked.length === 0) {
    return { best: null, others: [] };
  }
  const ordered = [...ranked].sort(
    (a, b) => b.final_score - a.final_score || b.ustad_score - a.ustad_score
  );
  const [best, ...rest] = ordered;
  return { best, others: rest.slice(0, Math.max(0, limit - 1)) };
}

/**
 * Whole-catalogue match for the landing and dashboard experiences:
 * finds currently-available workers of ONE trade and ranks them by fit.
 * Results never mix categories: when neither the analysis nor the skill
 * list pins a trade, the caller gets an empty set and the UI asks the
 * customer which ustad they need instead of showing everyone.
 *
 * Unverified workers are included so self-registered technicians are
 * discoverable immediately.  Verified workers receive a bonus.
 */
export async function getWorkerOptions(
  filters: WorkerOptionsFilters
): Promise<{ best: WorkerOption | null; others: WorkerOption[]; ranked: WorkerOption[] }> {
  await connectDB();

  const category =
    filters.category ?? categoryFromSkills(filters.required_skills);
  if (!category) {
    return { best: null, others: [], ranked: [] };
  }

  const query: Record<string, unknown> = {
    is_available: true,
    suspended: false,
    active_job_id: null,
    category,
  };

  const candidates = await Worker.find(query)
      .select(
        "_id name profile_image category skills ustad_score completed_jobs confirmed_jobs response_rate cancellation_rate average_rating emergency_available emergency_capabilities verification_level verified location"
      )
    .lean();

  const hasLocation = Boolean(filters.location);
  const ctx: MatchContext = {
    required_skills: filters.required_skills,
    radius_km: hasLocation ? SWEET_SPOT_RADIUS_KM : 0,
    urgency: filters.urgency,
  };
  const weights = hasLocation ? GEO_WEIGHTS : NO_GEO_WEIGHTS;

  const distanceToCustomer = (w: (typeof candidates)[number]): number | null => {
    const coordinates = w.location?.coordinates;
    if (!filters.location || !coordinates || coordinates.length !== 2) {
      return null;
    }
    return Number(
      haversineDistanceKm(
        filters.location.lat,
        filters.location.lng,
        coordinates[1],
        coordinates[0]
      ).toFixed(2)
    );
  };

  const ranked = candidates
    .map((w) => {
      const distanceKm = distanceToCustomer(w);
      const s = scoreWorker(
        workerToScoreInput(w),
        { ...ctx, distance_km: distanceKm ?? 0 },
        w._id,
        w.name,
        w.category
      );
      // Blend with the path's weights — with geo, distance and rating
      // decide together (the sweet spot), then verified adds a bonus.
      const verified = w.verified === true;
      const finalScore = combineScores(
        s,
        weights,
        verified ? VERIFIED_BONUS : 0
      );
      return {
        doc: w,
        score: { ...s, final_score: finalScore },
        verified,
        distanceKm,
      };
    })
    .sort(
      (a, b) =>
        b.score.final_score - a.score.final_score ||
        b.score.ustad_score - a.score.ustad_score
    );

  const options: WorkerOption[] = ranked.map(({ doc, score, distanceKm }) => {
    const predicted = calculatePredictedPrice({
      estimateMin: filters.estimate_min ?? 0,
      estimateMax: filters.estimate_max ?? 0,
      complexity: filters.complexity,
      distanceKm,
    });

    return {
      id: String(doc._id),
      name: doc.name || "Ustad",
      profile_image: (doc as any).profile_image ?? null,
      category: (doc.category ?? "plumber") as WorkerCategory,
      skills: doc.skills,
      verified: doc.verified === true,
      verification_level: doc.verification_level ?? "identity_reviewed",
      ustad_score: score.ustad_score,
      completed_jobs: doc.completed_jobs,
      average_rating: doc.average_rating,
      response_rate: doc.response_rate,
      skills_match: score.skill_match_score,
      final_score: score.final_score,
      distance_km: distanceKm,
      predicted_price: predicted.predicted_price_pkr,
      predicted_work_pkr: predicted.work_price_pkr,
      travel_cost_pkr: predicted.travel_cost_pkr,
    };
  });

  const limit = filters.limit ?? 10;
  return { ...pickBestAndOthers(options, limit), ranked: options };
}
