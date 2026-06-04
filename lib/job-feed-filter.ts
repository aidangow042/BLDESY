/**
 * Tradie job-feed location filter (mobile).
 *
 * The builder's edit-profile collects `latitude`, `longitude`, and `radius_km`
 * (their service radius — how far they're willing to travel for work). The
 * builder dashboard feeds should only surface jobs within that radius so a
 * Sydney electrician doesn't get spammed with Perth project jobs.
 *
 * Jobs don't store geo coords directly — only suburb + postcode — so we
 * geocode each unique suburb via lib/geo's bundled AU lookup (~16k suburbs
 * in memory, instant; Nominatim only as a fallback for anything unknown).
 * One lookup per unique suburb on a feed page, parallelised + deduped.
 *
 * Mirrors ~/bldesy-web/lib/job-feed-filter.ts so the app and website feeds
 * behave identically (same DEFAULT_RADIUS_KM, same graceful failures).
 *
 * Graceful failures:
 *   - Builder has no lat/lng → return jobs unchanged (no filter)
 *   - Suburb can't be geocoded → include the job by default (don't hide a
 *     legitimate posting just because of a typo)
 */
import { distanceKm, geocode } from '@/lib/geo';

const DEFAULT_RADIUS_KM = 30;

interface JobLike {
  suburb: string;
}

interface BuilderGeo {
  latitude: number | null;
  longitude: number | null;
  radius_km: number | null;
}

export async function filterJobsByBuilderRadius<T extends JobLike>(
  jobs: T[],
  builder: BuilderGeo | null | undefined,
): Promise<T[]> {
  if (!builder || builder.latitude == null || builder.longitude == null) {
    return jobs;
  }
  const radius = builder.radius_km ?? DEFAULT_RADIUS_KM;
  const lat = builder.latitude;
  const lng = builder.longitude;

  const uniqueSuburbs = Array.from(
    new Set(jobs.map((j) => j.suburb).filter(Boolean)),
  );
  const coords = new Map<string, { latitude: number; longitude: number } | null>();
  await Promise.all(
    uniqueSuburbs.map(async (s) => {
      coords.set(s, await geocode(s));
    }),
  );

  return jobs.filter((j) => {
    const c = coords.get(j.suburb);
    if (!c) return true;
    return distanceKm(lat, lng, c.latitude, c.longitude) <= radius;
  });
}
