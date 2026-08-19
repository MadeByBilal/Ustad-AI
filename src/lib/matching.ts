import { connectDB } from "@/lib/mongodb";
import { buildBoundingBox, haversineDistanceKm } from "@/lib/geo";
import { Worker, type UrgencyLevel, type WorkerCategory } from "@/models";

export const RANKING_WEIGHTS = {
  skill_match: 0.3,
  distance: 0.25,
  reliability: 0.2,
  ustad: 0.15,
  response: 0.1,
} as const;

/** Bonus for workers who opted into emergency service on emergency jobs. */
export const EMERGENCY_CAPABILITY_BONUS = 10;

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

function skillMatchScore(
  workerSkills: string[],
  requiredSkills: string[]
): number {
  if (requiredSkills.length === 0) {
    return 100;
  }
  const required = requiredSkills.map((s) => s.toLowerCase());
  const owned = new Set(workerSkills.map((s) => s.toLowerCase()));
  const matched = required.filter((s) => owned.has(s));
  return Math.round((matched.length / required.length) * 100);
}

export function scoreWorker(
  worker: WorkerScoreInput,
  ctx: MatchContext & { distance_km: number },
  id?: unknown,
  name?: string,
  category?: WorkerCategory
): WorkerScore {
  const matched = worker.skills.filter((s) =>
    ctx.required_skills.some(
      (r) => r.toLowerCase() === s.toLowerCase()
    )
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

  const emergencyBonus =
    ctx.urgency === "emergency" &&
    worker.emergency_available &&
    worker.emergency_capabilities.length > 0
      ? EMERGENCY_CAPABILITY_BONUS
      : 0;

  const final_score =
    RANKING_WEIGHTS.skill_match * skill_match_score +
    RANKING_WEIGHTS.distance * distance_score +
    RANKING_WEIGHTS.reliability * reliability_score +
    RANKING_WEIGHTS.ustad * ustad_score +
    RANKING_WEIGHTS.response * response_score +
    emergencyBonus;

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
    .map((w) => ({
      ...w,
      distance_km: haversineDistanceKm(
        lat,
        lng,
        w.location.coordinates[1],
        w.location.coordinates[0]
      ),
    }))
    .filter((w) => w.distance_km <= radius_km)
    .filter((w) =>
      required_skills.length === 0
        ? true
        : w.skills.some((s) =>
            required_skills.some(
              (r) => r.toLowerCase() === s.toLowerCase()
            )
          )
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
