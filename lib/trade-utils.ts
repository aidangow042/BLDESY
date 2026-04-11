/**
 * Shared trade utilities — icons, urgency config, relative time formatting.
 * Extracted from duplicated code across 12+ screen files.
 */

// ── Trade icons ──────────────────────────────────────────────────────────────

export const TRADE_ICONS: Record<string, string> = {
  builder: '🏗️', plumber: '🔧', electrician: '⚡', carpenter: '🪚',
  painter: '🎨', landscaper: '🌿', roofer: '🏠', tiler: '🧱',
  concreter: '🏢', fencer: '🪵', cleaner: '🧹', handyman: '🛠️',
  'air-conditioning': '❄️', glazier: '🪟', locksmith: '🔐',
  'asbestos-removal': '⚠️', demolition: '💥', scaffolder: '🏗️',
  waterproofer: '💧', 'gas-fitter': '🔥', plasterer: '🏛️',
  default: '🔨',
};

export function getTradeIcon(trade: string): string {
  const key = trade.toLowerCase();
  for (const [k, v] of Object.entries(TRADE_ICONS)) {
    if (key.includes(k)) return v;
  }
  return TRADE_ICONS.default;
}

// ── Urgency config ───────────────────────────────────────────────────────────

export const URGENCY_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  asap: { label: 'ASAP', icon: 'alarm', color: '#DC2626', bg: '#FEF2F2' },
  this_week: { label: 'This Week', icon: 'time-outline', color: '#D97706', bg: '#FFFBEB' },
  flexible: { label: 'Flexible', icon: 'calendar-outline', color: '#059669', bg: '#ECFDF5' },
};

// ── Relative time formatting ─────────────────────────────────────────────────

export function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const posted = new Date(dateStr).getTime();
  const diffMs = now - posted;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

// ── Display name formatting ──────────────────────────────────────────────────

export function getDisplayName(fullName: string | null): string {
  if (!fullName) return 'Customer';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export function getInitials(fullName: string | null): string {
  if (!fullName) return 'C';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Carousel image extraction ────────────────────────────────────────────────

export function getCarouselImages(builder: { projects?: any[] | null; cover_photo_url?: string | null }): string[] {
  const images: string[] = [];
  if (builder.projects?.length) {
    for (const proj of builder.projects) {
      if (proj.media?.length) {
        for (const m of proj.media) {
          if (m.type === 'image' && m.uri) images.push(m.uri);
        }
      } else if (proj.images?.length) {
        images.push(...proj.images);
      } else if (proj.image_url) {
        images.push(proj.image_url);
      }
    }
  }
  if (images.length === 0 && builder.cover_photo_url) {
    images.push(builder.cover_photo_url);
  }
  return images.slice(0, 5);
}
