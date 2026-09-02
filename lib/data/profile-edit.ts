/**
 * lib/data/profile-edit.ts — the tradie Edit Profile save path.
 *
 * Port of:
 *   ~/bldesy-web/app/portal/edit-profile/page.tsx        (populate effect → editProfileFormFrom;
 *                                                         handleSave → validate + buildBuilderProfileUpdate;
 *                                                         auto-saves for photos / cover colour / display
 *                                                         images; MAX_PROJECT_VIDEOS; RESPONSE_TIMES)
 *   ~/bldesy-web/components/profile/founding-zone-picker.tsx (splitCoverage — verbatim)
 *   ~/bldesy-web/lib/media-moderation.ts                  (queueMediaModeration → POST /api/media/moderate)
 *
 * Own-row writes go straight to builder_profiles under RLS, as the website
 * does. Credential verification (`credentials_verified`, licences, insurance,
 * White Card) is a WEB HAND-OFF in the app (CLAUDE.md §7) and is deliberately
 * not part of the payload here. Capabilities save separately through
 * lib/data/capabilities.ts, exactly as the website's CapabilitiesStep does.
 *
 * Storage: images reuse lib/storage.ts uploadImage() (bucket builder-media,
 * path `${userId}/${folder}/…` — inside the owner folder the moderation route
 * requires). Videos go to `builder-videos` like the website; poster frames are
 * not captured on device (no thumbnail dependency) so `poster` is null.
 */
import { File } from 'expo-file-system';

import { api } from '@/lib/api';
import { geocode } from '@/lib/geo';
import { uploadImage } from '@/lib/storage';
import { db, supabase } from '@/lib/supabase';
import {
  buildServiceAreas,
  getFoundingZone,
  isWithinLaunchBaseRadius,
  MAX_BASE_DISTANCE_KM,
  parseServiceAreas,
  type AuState,
} from '@/lib/web/service-areas';
import {
  sanitiseSpecialisations,
  type BuilderSpecialisations,
} from '@/lib/web/trade-specialisations';
import type {
  AvailabilityStatus,
  Database,
  FaqItem,
  ProjectItem,
  ProjectVideo,
  TeamMember,
} from '@/types/database';

import { requireUserId } from './own-session';
import type { OwnBuilderProfile } from './portal';

type BuilderUpdate = Database['public']['Tables']['builder_profiles']['Update'];

/* ── Constants (edit-profile/page.tsx) ──────────────────────────────── */

/** Default banner colour when a builder switches to "Colour" — brand teal. */
export const DEFAULT_COVER_COLOR = '#0D9B7A';

/** Caps page weight and moderation surface — max videos per project. */
export const MAX_PROJECT_VIDEOS = 3;

/** The response-time options persisted to builder_profiles.response_time. */
export const RESPONSE_TIMES: readonly string[] = [
  'Within 1 hour',
  'Within 4 hours',
  'Within 24 hours',
  'Within 2 days',
  'Within a week',
];

/** The wizard steps, for `?step=N` deep links from the status-card checklist. */
export const EDIT_PROFILE_STEPS = [
  'Business',
  'Location',
  'Credentials',
  'What you bring',
  'Projects',
  'Team & FAQs',
] as const;

/* ── Validation strings (verbatim) ──────────────────────────────────── */

export const ERR_BUSINESS_NAME_REQUIRED = 'Business name is required.';
export const ERR_TRADE_REQUIRED = 'Select at least one trade.';
export const ERR_POSTCODE_FORMAT = 'Postcode must be a 4-digit number.';
export const ERR_PRIMARY_AREA_REQUIRED =
  "Pick at least one primary area — without one you won't appear in search.";
export const ERR_MAX_PROJECT_VIDEOS = `Maximum ${MAX_PROJECT_VIDEOS} videos per project.`;

export function outsideLaunchAreaMessage(suburb: string): string {
  return `${suburb} is outside our launch area. You can be based anywhere within about ${MAX_BASE_DISTANCE_KM}km of Sydney — including the Central Coast, Blue Mountains, Illawarra and Newcastle.`;
}

/* ── Coverage split (founding-zone-picker.tsx) ──────────────────────── */

/**
 * Split saved coverage into founding-zone names vs legacy free text. Primary
 * and Can cover arrive already separated by parseServiceAreas; only the
 * Primary side can contain legacy metro/free-text names, since `cover:` is a
 * post-split namespace.
 */
export function splitCoverage(
  regions: string[],
  coverRegions: string[],
): { primaryZones: string[]; coverZones: string[]; legacy: string[] } {
  const primaryZones: string[] = [];
  const legacy: string[] = [];
  for (const r of regions) {
    const zone = getFoundingZone(r);
    if (zone) primaryZones.push(zone.name);
    else legacy.push(r);
  }
  const coverZones: string[] = [];
  for (const c of coverRegions) {
    const zone = getFoundingZone(c);
    if (zone) coverZones.push(zone.name);
    else legacy.push(c);
  }
  return { primaryZones, coverZones, legacy };
}

/* ── Form state ─────────────────────────────────────────────────────── */

/** The website page's form state, as one object. */
export interface EditProfileForm {
  businessName: string;
  /** Trades the builder offers. First entry is the primary trade. */
  selectedTrades: string[];
  /** Per-trade sub-specialisations — sanitised against selectedTrades on save. */
  specialisations: BuilderSpecialisations;
  phone: string;
  email: string;
  website: string;
  abn: string;
  bio: string;
  profilePhotoUrl: string;
  coverPhotoUrl: string;
  /** Solid banner colour; takes precedence over the photo when set. null = use the photo. */
  coverColor: string | null;
  suburb: string;
  postcode: string;
  availability: AvailabilityStatus;
  responseTime: string;
  /** Travel radius in km as typed ("" = unset). */
  serviceRadius: string;
  primaryZones: string[];
  coverZones: string[];
  /** Pre-restriction metro/free-text `region:` names — removable only. */
  legacyRegions: string[];
  /** Whole-state `state:` claims — removable only. */
  coverageStates: AuState[];
  /** Plain suburb entries carried through so a save can't silently drop them. */
  extraSuburbs: string[];
  displayImages: string[];
  projects: ProjectItem[];
  teamMembers: TeamMember[];
  faqs: FaqItem[];
}

export type EditProfileSource = Pick<
  OwnBuilderProfile,
  | 'business_name'
  | 'phone'
  | 'email'
  | 'website'
  | 'abn'
  | 'bio'
  | 'profile_photo_url'
  | 'cover_photo_url'
  | 'cover_color'
  | 'suburb'
  | 'postcode'
  | 'availability'
  | 'response_time'
  | 'service_areas'
  | 'display_images'
  | 'projects'
  | 'team_members'
  | 'faqs'
  | 'trade_category'
  | 'trade_categories'
  | 'specialisations'
>;

/** The page's populate-from-profile effect, as a pure mapping. */
export function editProfileFormFrom(profile: EditProfileSource): EditProfileForm {
  const coverage = parseServiceAreas(profile.service_areas ?? []);
  const split = splitCoverage(coverage.regions, coverage.coverRegions);
  const tradesForSpecs =
    profile.trade_categories && profile.trade_categories.length > 0
      ? profile.trade_categories
      : profile.trade_category
        ? [profile.trade_category]
        : [];
  return {
    businessName: profile.business_name || '',
    selectedTrades: tradesForSpecs,
    specialisations: sanitiseSpecialisations(profile.specialisations, tradesForSpecs),
    phone: profile.phone || '',
    email: profile.email || '',
    website: profile.website || '',
    abn: profile.abn || '',
    bio: profile.bio || '',
    profilePhotoUrl: profile.profile_photo_url || '',
    coverPhotoUrl: profile.cover_photo_url || '',
    coverColor: profile.cover_color ?? null,
    suburb: profile.suburb || '',
    postcode: profile.postcode || '',
    availability: profile.availability || 'available',
    responseTime: profile.response_time || '',
    // Read the radius through parseServiceAreas rather than a raw string slice
    // so malformed legacy values ("radius:20km radius") normalise to a number.
    serviceRadius: coverage.radiusKm ? String(coverage.radiusKm) : '',
    primaryZones: split.primaryZones,
    coverZones: split.coverZones,
    legacyRegions: split.legacy,
    coverageStates: coverage.states,
    extraSuburbs: coverage.suburbs,
    displayImages: profile.display_images || [],
    projects: profile.projects || [],
    teamMembers: profile.team_members || [],
    faqs: profile.faqs || [],
  };
}

/**
 * handleSave's pre-flight checks, in order, with the website's strings.
 * Null = valid. The base-suburb radius check needs coordinates — see
 * {@link validateBaseSuburb}.
 */
export function validateEditProfileForm(form: EditProfileForm): string | null {
  if (!form.businessName.trim()) return ERR_BUSINESS_NAME_REQUIRED;
  if (form.selectedTrades.length === 0) return ERR_TRADE_REQUIRED;
  if (form.postcode && !/^\d{4}$/.test(form.postcode)) return ERR_POSTCODE_FORMAT;
  // Onboarding requires a Primary area; legacy metro/state claims still count
  // as coverage, so only block when nothing at all is set.
  if (
    form.primaryZones.length === 0 &&
    form.legacyRegions.length === 0 &&
    form.coverageStates.length === 0
  ) {
    return ERR_PRIMARY_AREA_REQUIRED;
  }
  return null;
}

/**
 * Same 120km base-radius rule as onboarding. An unresolvable suburb PASSES,
 * matching onboarding (the quality gate and human review are the backstop).
 */
export function validateBaseSuburb(
  suburb: string,
  coords: { latitude: number; longitude: number } | null,
): string | null {
  if (coords && !isWithinLaunchBaseRadius(coords.latitude, coords.longitude)) {
    return outsideLaunchAreaMessage(suburb);
  }
  return null;
}

/** The columns handleSave writes (plus the photo/colour/display auto-saves). */
export type BuilderProfileUpdate = Pick<
  BuilderUpdate,
  | 'business_name'
  | 'trade_category'
  | 'trade_categories'
  | 'specialisations'
  | 'phone'
  | 'email'
  | 'website'
  | 'abn'
  | 'bio'
  | 'profile_photo_url'
  | 'cover_photo_url'
  | 'cover_color'
  | 'display_images'
  | 'suburb'
  | 'postcode'
  | 'latitude'
  | 'longitude'
  | 'radius_km'
  | 'availability'
  | 'response_time'
  | 'service_areas'
  | 'projects'
  | 'team_members'
  | 'faqs'
>;

/** Coverage array exactly as handleSave builds it (null when empty). */
export function buildServiceAreasFromForm(form: EditProfileForm): string[] | null {
  const entries = buildServiceAreas({
    suburbs: form.extraSuburbs,
    radiusKm: form.serviceRadius ? parseInt(form.serviceRadius, 10) || null : null,
    regions: [...form.primaryZones, ...form.legacyRegions],
    coverRegions: form.coverZones,
    states: form.coverageStates,
  });
  return entries.length > 0 ? entries : null;
}

/** The exact UPDATE payload of handleSave (empty projects/team/faqs dropped, blanks → null). */
export function buildBuilderProfileUpdate(
  form: EditProfileForm,
  coords: { latitude: number; longitude: number } | null,
): BuilderProfileUpdate {
  const cleanProjects = form.projects.filter((p) => p.title.trim());
  const cleanTeam = form.teamMembers.filter((m) => m.name.trim());
  const cleanFaqs = form.faqs.filter((f) => f.question.trim() && f.answer.trim());
  return {
    business_name: form.businessName,
    trade_category: form.selectedTrades[0] ?? '',
    trade_categories: form.selectedTrades,
    specialisations: sanitiseSpecialisations(form.specialisations, form.selectedTrades),
    phone: form.phone || null,
    email: form.email || null,
    website: form.website || null,
    abn: form.abn || null,
    bio: form.bio || null,
    profile_photo_url: form.profilePhotoUrl || null,
    cover_photo_url: form.coverPhotoUrl || null,
    cover_color: form.coverColor,
    display_images: form.displayImages.length > 0 ? form.displayImages : null,
    suburb: form.suburb,
    postcode: form.postcode,
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
    radius_km: form.serviceRadius ? parseFloat(form.serviceRadius) : null,
    availability: form.availability,
    response_time: form.responseTime || null,
    service_areas: buildServiceAreasFromForm(form),
    projects: cleanProjects,
    team_members: cleanTeam,
    faqs: cleanFaqs,
  };
}

/* ── Projects / team / FAQ helpers ──────────────────────────────────── */

/** A blank project row (addProject). */
export function emptyProject(): ProjectItem {
  return {
    title: '',
    description: '',
    images: [],
    videos: [],
    before_image: null,
    after_image: null,
    cost_range: null,
    testimonial: null,
  };
}

export type AddProjectVideoResult =
  | { ok: true; projects: ProjectItem[] }
  | { ok: false; error: string };

/** Append a video to a project, enforcing MAX_PROJECT_VIDEOS. Never mutates. */
export function addProjectVideo(
  projects: readonly ProjectItem[],
  projectIndex: number,
  video: ProjectVideo,
): AddProjectVideoResult {
  const target = projects[projectIndex];
  if (!target) return { ok: false, error: 'Project not found.' };
  if ((target.videos || []).length >= MAX_PROJECT_VIDEOS) {
    return { ok: false, error: ERR_MAX_PROJECT_VIDEOS };
  }
  const updated = [...projects];
  updated[projectIndex] = { ...target, videos: [...(target.videos || []), video] };
  return { ok: true, projects: updated };
}

/** Remove a video from a project. Never mutates. */
export function removeProjectVideo(
  projects: readonly ProjectItem[],
  projectIndex: number,
  videoIndex: number,
): ProjectItem[] {
  const updated = [...projects];
  const target = updated[projectIndex];
  if (!target) return updated;
  updated[projectIndex] = {
    ...target,
    videos: (target.videos || []).filter((_, i) => i !== videoIndex),
  };
  return updated;
}

/* ── Own-row IO ─────────────────────────────────────────────────────── */

/**
 * Patch the own builder_profiles row (RLS: owner). Throws the Postgres
 * message, which is what the website surfaces (`setError(updateError.message)`).
 */
export async function updateOwnBuilderProfile(patch: Partial<BuilderProfileUpdate>): Promise<void> {
  const uid = await requireUserId();
  const { error } = await db.from('builder_profiles').update(patch).eq('user_id', uid);
  if (error) throw new Error(error.message);
}

/** Sync the profile photo to profiles.avatar_url so it shows in nav + messages. */
export async function syncAvatar(publicUrl: string): Promise<void> {
  const uid = await requireUserId();
  const { error } = await db.from('profiles').update({ avatar_url: publicUrl }).eq('id', uid);
  if (error) throw new Error(error.message);
}

export interface SaveEditProfileOptions {
  /** Injectable for tests; defaults to the bundled AU geocoder. */
  geocodeFn?: (query: string) => Promise<{ latitude: number; longitude: number } | null>;
}

/**
 * handleSave: validate → geocode the base suburb → 120km launch-area check →
 * one UPDATE → avatar sync. Throws Error with the website's exact strings.
 * Capabilities are saved by the caller through lib/data/capabilities.ts.
 */
export async function saveEditProfile(
  form: EditProfileForm,
  opts: SaveEditProfileOptions = {},
): Promise<void> {
  const invalid = validateEditProfileForm(form);
  if (invalid) throw new Error(invalid);

  const coords = await (opts.geocodeFn ?? geocode)(form.suburb);
  const outside = validateBaseSuburb(form.suburb, coords);
  if (outside) throw new Error(outside);

  await updateOwnBuilderProfile(buildBuilderProfileUpdate(form, coords));
  if (form.profilePhotoUrl) await syncAvatar(form.profilePhotoUrl);
}

/** Auto-save a just-uploaded profile photo (and mirror it to profiles.avatar_url). */
export async function setProfilePhoto(publicUrl: string): Promise<void> {
  await updateOwnBuilderProfile({ profile_photo_url: publicUrl });
  await syncAvatar(publicUrl);
}

/** Auto-save a just-uploaded cover photo. */
export async function setCoverPhoto(publicUrl: string): Promise<void> {
  await updateOwnBuilderProfile({ cover_photo_url: publicUrl });
}

/** Switch the banner between photo and solid colour (persistCoverColor). */
export async function setCoverColor(value: string | null): Promise<void> {
  await updateOwnBuilderProfile({ cover_color: value });
}

/** Auto-save the search-result display images. */
export async function setDisplayImages(urls: string[]): Promise<void> {
  await updateOwnBuilderProfile({ display_images: urls.length > 0 ? urls : null });
}

/* ── Media moderation + storage ─────────────────────────────────────── */

export type ModeratedBucket = 'builder-media' | 'enterprise-media' | 'avatars';

/**
 * Fire-and-forget hook into the automated image moderation pipeline
 * (POST /api/media/moderate — auth'd, rate-limited, deduped per object path).
 * Must NEVER affect upload UX: not awaited, swallows every error.
 */
export function queueMediaModeration(bucket: ModeratedBucket, path: string): void {
  try {
    void api.post('/api/media/moderate', { bucket, path }).catch(() => {
      /* moderation is best-effort — never surface to the uploader */
    });
  } catch {
    /* ignore */
  }
}

/**
 * Recover the object path from a Supabase public URL
 * (`…/storage/v1/object/public/<bucket>/<path>`), for the moderation queue.
 */
export function storagePathFromPublicUrl(publicUrl: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  const rest = publicUrl.slice(idx + marker.length).split('?')[0];
  try {
    return rest ? decodeURIComponent(rest) : null;
  } catch {
    return rest || null;
  }
}

export type BuilderImageFolder = 'cover' | 'profile' | 'projects' | 'team';

export interface UploadedMedia {
  url: string;
  /** Object path inside the bucket (null only if the URL couldn't be parsed). */
  path: string | null;
}

/**
 * Upload an image to builder-media via lib/storage.ts and queue moderation.
 * Resolves null when the upload was rejected (type / size / storage error),
 * exactly like uploadImage().
 */
export async function uploadBuilderImage(
  localUri: string,
  userId: string,
  folder: BuilderImageFolder,
): Promise<UploadedMedia | null> {
  const url = await uploadImage(localUri, userId, folder);
  if (!url) return null;
  const path = storagePathFromPublicUrl(url, 'builder-media');
  if (path) queueMediaModeration('builder-media', path);
  return { url, path };
}

const VIDEO_EXTS = new Set(['mp4', 'mov', 'webm']);
/** The website's video cap (upload-validation.ts). */
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

function videoContentType(ext: string): string {
  return ext === 'mov' ? 'video/quicktime' : `video/${ext}`;
}

/**
 * Upload a project video to the `builder-videos` bucket (its own bucket so
 * the 100MB video cap never loosens the image-only rules on builder-media).
 * No poster frame is captured on device, so `poster` is null. Resolves null
 * on any rejection.
 */
export async function uploadProjectVideo(
  localUri: string,
  userId: string,
  projectIndex: number,
): Promise<ProjectVideo | null> {
  const ext = (localUri.split('.').pop()?.toLowerCase() ?? '').split('?')[0];
  if (!VIDEO_EXTS.has(ext)) return null;
  try {
    const file = new File(localUri);
    const bytes = await file.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_VIDEO_BYTES) return null;
    const path = `${userId}/project-${projectIndex}-video-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('builder-videos')
      .upload(path, bytes, { upsert: true, contentType: videoContentType(ext) });
    if (error) return null;
    const { data } = supabase.storage.from('builder-videos').getPublicUrl(path);
    return { url: data.publicUrl, poster: null };
  } catch {
    return null;
  }
}
