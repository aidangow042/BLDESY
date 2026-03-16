/**
 * Geocoding + distance utilities for location-based search.
 * Uses a bundled Australian suburb/postcode database for instant,
 * reliable lookups. Falls back to OpenStreetMap Nominatim if no local match.
 */

import auLocations from './au-locations.json';

const localities: Record<string, [number, number]> = (auLocations as any).l;
const postcodes: Record<string, [number, number]> = (auLocations as any).p;

type GeoResult = {
  latitude: number;
  longitude: number;
} | null;

/**
 * Look up coordinates for an Australian suburb or postcode.
 * Tries the local bundled database first (instant), then Nominatim as fallback.
 */
export async function geocode(query: string): Promise<GeoResult> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  // Try local lookup first
  const local = localLookup(trimmed);
  if (local) return local;

  // Fallback to Nominatim for anything not in the local DB
  return nominatimGeocode(trimmed);
}

/**
 * Instant local lookup against bundled AU suburb/postcode data.
 * Handles formats: "Surry Hills", "2010", "Surry Hills 2010", "2010 Surry Hills"
 */
function localLookup(query: string): GeoResult {
  const lower = query.toLowerCase().trim();

  // Direct suburb match
  if (localities[lower]) {
    const [lat, lon] = localities[lower];
    return { latitude: lat, longitude: lon };
  }

  // Direct postcode match
  if (postcodes[lower]) {
    const [lat, lon] = postcodes[lower];
    return { latitude: lat, longitude: lon };
  }

  // Try splitting "Surry Hills 2010" or "2010 Surry Hills"
  const parts = lower.split(/\s+/);
  // Check if last token is a 4-digit postcode
  const last = parts[parts.length - 1];
  if (/^\d{4}$/.test(last) && postcodes[last]) {
    const suburb = parts.slice(0, -1).join(' ');
    if (suburb && localities[suburb]) {
      const [lat, lon] = localities[suburb];
      return { latitude: lat, longitude: lon };
    }
    // Use postcode coords
    const [lat, lon] = postcodes[last];
    return { latitude: lat, longitude: lon };
  }

  // Check if first token is a 4-digit postcode
  const first = parts[0];
  if (/^\d{4}$/.test(first) && postcodes[first]) {
    const suburb = parts.slice(1).join(' ');
    if (suburb && localities[suburb]) {
      const [lat, lon] = localities[suburb];
      return { latitude: lat, longitude: lon };
    }
    const [lat, lon] = postcodes[first];
    return { latitude: lat, longitude: lon };
  }

  return null;
}

/**
 * Fallback: geocode via OpenStreetMap Nominatim (network call).
 */
async function nominatimGeocode(query: string): Promise<GeoResult> {
  try {
    const encoded = encodeURIComponent(`${query}, Australia`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=au`,
      {
        headers: {
          'User-Agent': 'BLDESY-App/1.0',
        },
      },
    );

    if (!res.ok) return null;

    const data = await res.json();
    if (data.length === 0) return null;

    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    };
  } catch {
    return null;
  }
}

/**
 * Haversine distance between two lat/lng points in kilometres.
 */
export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
