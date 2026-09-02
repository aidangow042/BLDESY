/**
 * Pure helpers for the public tradie profile — lifted from
 * ~/bldesy-web/components/builder/{profile-header,builder-profile-view,
 * project-gallery,reviews-section,team-members}.tsx, lib/media-url.ts and
 * lib/format.ts so the layout components stay render-only and the rules are
 * unit-tested.
 */
import { describeCanCover, describeCoverage, parseServiceAreas } from '@/lib/web/service-areas';
import { formatDeclaredResponseTime } from '@/lib/web/response-time';
import { formatTradeName } from '@/lib/web/trades';
import type { AvailabilityDisplayMode, BuilderWithProfile, ProjectItem, ProjectVideo } from '@/types';

/** Lighten (amt>0) or darken (amt<0) a #RRGGBB hex by a flat RGB delta (profile-header.tsx shadeHex). */
export function shadeHex(hex: string, amt: number): string {
  const m = hex.replace('#', '');
  if (m.length < 6) return hex;
  const ch = (i: number) => {
    const v = parseInt(m.slice(i, i + 2), 16) + amt;
    return Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
  };
  return `#${ch(0)}${ch(2)}${ch(4)}`;
}

/** The three stops of the solid-colour cover banner (135deg: +22 → base → −30). */
export function coverGradient(coverColor: string): [string, string, string] {
  return [shadeHex(coverColor, 22), coverColor, shadeHex(coverColor, -30)];
}

/** lib/format.ts str — coerce a JSONB value that may arrive in different shapes. */
export function str(val: unknown): string {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object') {
    if ('name' in val) return String((val as Record<string, unknown>).name);
    if ('text' in val) return String((val as Record<string, unknown>).text);
  }
  return String(val ?? '');
}

/** reviews-section.tsx / team-members.tsx getInitials ("?" for a missing name). */
export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** reviews-section.tsx relativeDate. */
export function relativeDate(dateStr: string, now: Date = new Date()): string {
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const w = Math.floor(diffDays / 7);
    return `${w} week${w !== 1 ? 's' : ''} ago`;
  }
  if (diffDays < 365) {
    const mo = Math.floor(diffDays / 30);
    return `${mo} month${mo !== 1 ? 's' : ''} ago`;
  }
  const y = Math.floor(diffDays / 365);
  return `${y} year${y !== 1 ? 's' : ''} ago`;
}

/**
 * lib/media-url.ts — host allowlist for media rendered from owner-writable
 * JSONB (project videos and posters). Only our storage hosts may reach a
 * video source.
 */
export function isAllowedStorageMediaUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && (hostname.endsWith('.supabase.co') || hostname.endsWith('.supabase.in'));
  } catch {
    return false;
  }
}

/** One tile in the media grid — images render directly, videos render their poster only. */
export type GalleryMedia =
  | { kind: 'image'; src: string }
  | { kind: 'video'; src: string; poster: string | null };

export function getBeforeAfter(project: ProjectItem): { before: string | null; after: string | null } {
  return { before: project.before_image ?? null, after: project.after_image ?? null };
}

/** project-gallery.tsx getGalleryMedia — videos lead, then images. */
export function getGalleryMedia(project: ProjectItem): GalleryMedia[] {
  const media: GalleryMedia[] = [];
  if (Array.isArray(project.videos)) {
    for (const video of project.videos as ProjectVideo[]) {
      if (video && isAllowedStorageMediaUrl(video.url)) {
        media.push({
          kind: 'video',
          src: video.url,
          poster: isAllowedStorageMediaUrl(video.poster) ? video.poster : null,
        });
      }
    }
  }
  if (Array.isArray(project.images)) {
    for (const img of project.images) {
      if (img) media.push({ kind: 'image', src: img });
    }
  }
  return media;
}

/** builder-card.tsx getAllImages — curated display images first, else project photos. */
export function getAllImages(builder: {
  display_images?: string[] | null;
  projects?: ProjectItem[] | null;
}): string[] {
  if (Array.isArray(builder.display_images) && builder.display_images.length > 0) {
    return builder.display_images;
  }
  const imgs: string[] = [];
  if (Array.isArray(builder.projects)) {
    for (const p of builder.projects) {
      if (Array.isArray(p.images)) {
        for (const img of p.images) {
          if (img && !imgs.includes(img)) imgs.push(img);
        }
      }
      if (p.before_image && !imgs.includes(p.before_image)) imgs.push(p.before_image);
      if (p.after_image && !imgs.includes(p.after_image)) imgs.push(p.after_image);
    }
  }
  return imgs;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | undefined): boolean {
  return typeof value === 'string' && UUID_RE.test(value);
}

/** profile-header.tsx website normalisation + validation. */
export function safeWebsiteUrl(website: string | null | undefined): string | null {
  if (!website) return null;
  const normalised = website.startsWith('http') ? website : `https://${website}`;
  try {
    const parsed = new URL(normalised);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? normalised : null;
  } catch {
    return null;
  }
}

/** "Surry Hills, NSW" — state defaults to NSW like the web header. */
export function headerLocation(builder: Pick<BuilderWithProfile, 'suburb' | 'state'>): string {
  return [builder.suburb, builder.state ?? 'NSW'].filter(Boolean).join(', ');
}

export type HeaderPill = 'next_available' | 'status' | null;

/**
 * profile-header.tsx pill rule: hidden → nothing; next_available with a
 * current date → the date pill; otherwise the quick-status pill.
 */
export function headerPillFor(
  mode: AvailabilityDisplayMode,
  nextAvailableDate: string | null,
  todayYmd: string,
): HeaderPill {
  const showNextAvailablePill =
    mode === 'next_available' && nextAvailableDate !== null && nextAvailableDate >= todayYmd;
  if (showNextAvailablePill) return 'next_available';
  const showStatusPill = mode === 'calendar' || (mode === 'next_available' && !showNextAvailablePill);
  return showStatusPill ? 'status' : null;
}

/** countVerified + hasVerifiedCredentials from public-profile-page.tsx / trust-band.tsx. */
export function isBuilderVerified(builder: Pick<BuilderWithProfile, 'credentials' | 'credentials_verified'>): boolean {
  const legacy = builder.credentials;
  const legacyCount = legacy
    ? [legacy.abn_verified, legacy.license_verified, legacy.insurance_verified].filter(Boolean).length
    : 0;
  const cv = builder.credentials_verified;
  const structured = Boolean(
    cv && (cv.abn?.verified || cv.insurance?.public_liability?.verified || cv.licences?.some((l) => l.verified)),
  );
  return legacyCount > 0 || structured;
}

export type BusinessDetailIcon = 'construct-outline' | 'location-outline' | 'map-outline' | 'globe-outline' | 'time-outline';

export interface BusinessDetail {
  label: string;
  value: string;
  icon: BusinessDetailIcon;
}

/** builder-profile-view.tsx BusinessDetails rows (Trade, Location, Primary areas, Also covers, Time to Reply). */
export function businessDetailsFor(
  builder: Pick<BuilderWithProfile, 'trade_category' | 'service_areas' | 'suburb' | 'response_time'>,
): BusinessDetail[] {
  const details: BusinessDetail[] = [];
  if (builder.trade_category) {
    details.push({ label: 'Trade', value: formatTradeName(builder.trade_category), icon: 'construct-outline' });
  }
  const coverage = parseServiceAreas((builder.service_areas as string[] | null) || []);
  const radius = coverage.radiusKm ? `${coverage.radiusKm}km radius` : null;
  details.push({
    label: 'Location',
    value: radius ? `${builder.suburb} (${radius})` : builder.suburb,
    icon: 'location-outline',
  });
  const coverageSummary = describeCoverage(coverage);
  if (coverageSummary) details.push({ label: 'Primary areas', value: coverageSummary, icon: 'map-outline' });
  const canCoverSummary = describeCanCover(coverage);
  if (canCoverSummary) details.push({ label: 'Also covers', value: canCoverSummary, icon: 'globe-outline' });
  if (builder.response_time) {
    details.push({
      label: 'Time to Reply',
      value: formatDeclaredResponseTime(builder.response_time) ?? builder.response_time,
      icon: 'time-outline',
    });
  }
  return details;
}

/**
 * builder-profile-view.tsx showEarlyProfileCard: fewer than two main-column
 * sections with content → the designed "early profile" card keeps the page selling.
 */
export function countMainSections(
  builder: Pick<BuilderWithProfile, 'bio' | 'specialisations' | 'projects' | 'team_members' | 'faqs'>,
  flags: { showServices: boolean; showReviews: boolean },
): number {
  const specialisationCount = Object.values(builder.specialisations ?? {}).reduce(
    (n, arr) => n + (arr?.length ?? 0),
    0,
  );
  return [
    Boolean(builder.bio),
    flags.showServices && specialisationCount > 0,
    (builder.projects ?? []).length > 0,
    flags.showReviews,
    (builder.team_members ?? []).length > 0,
    (builder.faqs ?? []).length > 0,
  ].filter(Boolean).length;
}

/** "4.9 avg from 12 reviews" (undefined when there are none). */
export function reviewsMeta(averageRating: number, totalReviews: number): string | undefined {
  return totalReviews > 0
    ? `${averageRating.toFixed(1)} avg from ${totalReviews} review${totalReviews !== 1 ? 's' : ''}`
    : undefined;
}

/** "(12 reviews)" beside the header stars. */
export function reviewCountLabel(totalReviews: number): string {
  return `(${totalReviews} review${totalReviews !== 1 ? 's' : ''})`;
}

/** "3 projects" meta on the Our Work section. */
export function projectsMeta(count: number): string {
  return `${count} project${count !== 1 ? 's' : ''}`;
}
