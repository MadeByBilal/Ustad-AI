const CACHE_PREFIX = "route:";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_ENTRIES = 50;

interface CachedRoute {
  coordinates: [number, number][];
  distance_meters: number | null;
  duration_seconds: number | null;
  expires_at: number;
}

function cacheKey(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): string {
  const r = (n: number) => Math.round(n * 100) / 100;
  return `${CACHE_PREFIX}${r(fromLat)},${r(fromLng)}_${r(toLat)},${r(toLng)}`;
}

export function getCachedRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): CachedRoute | null {
  try {
    const key = cacheKey(fromLat, fromLng, toLat, toLng);
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const entry: CachedRoute = JSON.parse(raw);
    if (entry.expires_at < Date.now()) {
      sessionStorage.removeItem(key);
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

export function setCachedRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  data: Omit<CachedRoute, "expires_at">
): void {
  try {
    const keys = Object.keys(sessionStorage).filter((k) =>
      k.startsWith(CACHE_PREFIX)
    );
    if (keys.length >= CACHE_MAX_ENTRIES) {
      sessionStorage.removeItem(keys[0]);
    }
    const key = cacheKey(fromLat, fromLng, toLat, toLng);
    sessionStorage.setItem(
      key,
      JSON.stringify({ ...data, expires_at: Date.now() + CACHE_TTL_MS })
    );
  } catch {
    // SessionStorage full or unavailable — silent fail
  }
}
