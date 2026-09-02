// AUTO-SYNCED from ~/bldesy-web/lib/locations.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

export interface Location {
  name: string;
  slug: string;
  state: string;
}

export const MAJOR_LOCATIONS: Location[] = [
  { name: "Sydney", slug: "sydney", state: "NSW" },
  { name: "Newcastle", slug: "newcastle", state: "NSW" },
  { name: "Wollongong", slug: "wollongong", state: "NSW" },
  { name: "Central Coast", slug: "central-coast", state: "NSW" },
  { name: "Parramatta", slug: "parramatta", state: "NSW" },
  { name: "Penrith", slug: "penrith", state: "NSW" },
  { name: "Liverpool", slug: "liverpool", state: "NSW" },
  { name: "Coffs Harbour", slug: "coffs-harbour", state: "NSW" },
  { name: "Wagga Wagga", slug: "wagga-wagga", state: "NSW" },
  { name: "Albury", slug: "albury", state: "NSW" },
  { name: "Melbourne", slug: "melbourne", state: "VIC" },
  { name: "Geelong", slug: "geelong", state: "VIC" },
  { name: "Ballarat", slug: "ballarat", state: "VIC" },
  { name: "Bendigo", slug: "bendigo", state: "VIC" },
  { name: "Frankston", slug: "frankston", state: "VIC" },
  { name: "Dandenong", slug: "dandenong", state: "VIC" },
  { name: "Brisbane", slug: "brisbane", state: "QLD" },
  { name: "Gold Coast", slug: "gold-coast", state: "QLD" },
  { name: "Sunshine Coast", slug: "sunshine-coast", state: "QLD" },
  { name: "Townsville", slug: "townsville", state: "QLD" },
  { name: "Cairns", slug: "cairns", state: "QLD" },
  { name: "Toowoomba", slug: "toowoomba", state: "QLD" },
  { name: "Ipswich", slug: "ipswich", state: "QLD" },
  { name: "Mackay", slug: "mackay", state: "QLD" },
  { name: "Rockhampton", slug: "rockhampton", state: "QLD" },
  { name: "Perth", slug: "perth", state: "WA" },
  { name: "Fremantle", slug: "fremantle", state: "WA" },
  { name: "Mandurah", slug: "mandurah", state: "WA" },
  { name: "Bunbury", slug: "bunbury", state: "WA" },
  { name: "Geraldton", slug: "geraldton", state: "WA" },
  { name: "Adelaide", slug: "adelaide", state: "SA" },
  { name: "Mount Gambier", slug: "mount-gambier", state: "SA" },
  { name: "Whyalla", slug: "whyalla", state: "SA" },
  { name: "Hobart", slug: "hobart", state: "TAS" },
  { name: "Launceston", slug: "launceston", state: "TAS" },
  { name: "Devonport", slug: "devonport", state: "TAS" },
  { name: "Canberra", slug: "canberra", state: "ACT" },
  { name: "Darwin", slug: "darwin", state: "NT" },
  { name: "Alice Springs", slug: "alice-springs", state: "NT" },
];

const BY_SLUG: Record<string, Location> = Object.fromEntries(
  MAJOR_LOCATIONS.map((l) => [l.slug, l]),
);

export function getLocationBySlug(slug: string): Location | undefined {
  return BY_SLUG[slug];
}

export function getAllMajorLocations(): Location[] {
  return MAJOR_LOCATIONS;
}
