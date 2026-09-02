import { describe, expect, it } from 'vitest';

import {
  businessDetailsFor,
  countMainSections,
  coverGradient,
  getAllImages,
  getGalleryMedia,
  headerLocation,
  headerPillFor,
  initials,
  isAllowedStorageMediaUrl,
  isBuilderVerified,
  isUuid,
  projectsMeta,
  relativeDate,
  reviewCountLabel,
  reviewsMeta,
  safeWebsiteUrl,
  shadeHex,
  str,
} from '@/components/builder/profile-helpers';
import { hslToHex, tileGradient } from '@/components/home/gradients';
import type { ProjectItem } from '@/types';

describe('colours', () => {
  it('shades a hex by a flat delta and clamps', () => {
    expect(shadeHex('#0D9B7A', 22)).toBe('#23b190');
    expect(shadeHex('#0D9B7A', -30)).toBe('#007d5c');
    expect(shadeHex('#fff', 10)).toBe('#fff');
    expect(coverGradient('#0D9B7A')).toEqual(['#23b190', '#0D9B7A', '#007d5c']);
  });

  it('converts hsl to hex and cycles the tile gradients', () => {
    expect(hslToHex({ h: 0, s: 100, l: 50 })).toBe('#ff0000');
    expect(hslToHex({ h: 120, s: 100, l: 25 })).toBe('#008000');
    expect(hslToHex({ h: 0, s: 0, l: 100 })).toBe('#ffffff');
    expect(tileGradient(0)).toEqual(tileGradient(8));
    expect(tileGradient(1)).toHaveLength(3);
  });
});

describe('strings', () => {
  it('str coerces JSONB shapes', () => {
    expect(str('a')).toBe('a');
    expect(str({ name: 'n' })).toBe('n');
    expect(str({ text: 't' })).toBe('t');
    expect(str(null)).toBe('');
  });

  it('initials handles missing names', () => {
    expect(initials('Harbour City Plumbing')).toBe('HC');
    expect(initials(null)).toBe('?');
  });

  it('relativeDate follows the web thresholds', () => {
    const now = new Date('2026-09-02T00:00:00Z');
    expect(relativeDate('2026-09-02T00:00:00Z', now)).toBe('Today');
    expect(relativeDate('2026-09-01T00:00:00Z', now)).toBe('Yesterday');
    expect(relativeDate('2026-08-30T00:00:00Z', now)).toBe('3 days ago');
    expect(relativeDate('2026-08-19T00:00:00Z', now)).toBe('2 weeks ago');
    expect(relativeDate('2026-07-01T00:00:00Z', now)).toBe('2 months ago');
    expect(relativeDate('2024-01-01T00:00:00Z', now)).toBe('2 years ago');
  });

  it('pluralises review + project labels', () => {
    expect(reviewsMeta(4.9, 1)).toBe('4.9 avg from 1 review');
    expect(reviewsMeta(4.9, 12)).toBe('4.9 avg from 12 reviews');
    expect(reviewsMeta(0, 0)).toBeUndefined();
    expect(reviewCountLabel(1)).toBe('(1 review)');
    expect(projectsMeta(2)).toBe('2 projects');
  });
});

describe('media', () => {
  it('allows only https supabase storage hosts for video', () => {
    expect(isAllowedStorageMediaUrl('https://abc.supabase.co/storage/v1/x.mp4')).toBe(true);
    expect(isAllowedStorageMediaUrl('http://abc.supabase.co/x.mp4')).toBe(false);
    expect(isAllowedStorageMediaUrl('https://evil.com/x.mp4')).toBe(false);
    expect(isAllowedStorageMediaUrl(null)).toBe(false);
  });

  const project: ProjectItem = {
    title: 'Deck',
    description: '',
    images: ['https://img/1.jpg', '', 'https://img/2.jpg'],
    videos: [
      { url: 'https://abc.supabase.co/v.mp4', poster: 'https://abc.supabase.co/p.jpg' },
      { url: 'https://evil.com/v.mp4', poster: null },
    ],
    before_image: 'https://img/b.jpg',
    after_image: 'https://img/a.jpg',
    cost_range: null,
    testimonial: null,
  };

  it('getGalleryMedia leads with allowed videos then images', () => {
    expect(getGalleryMedia(project)).toEqual([
      { kind: 'video', src: 'https://abc.supabase.co/v.mp4', poster: 'https://abc.supabase.co/p.jpg' },
      { kind: 'image', src: 'https://img/1.jpg' },
      { kind: 'image', src: 'https://img/2.jpg' },
    ]);
  });

  it('getAllImages prefers curated display images, else dedupes project photos incl. before/after', () => {
    expect(getAllImages({ display_images: ['x'], projects: [project] })).toEqual(['x']);
    expect(getAllImages({ display_images: [], projects: [project] })).toEqual(['https://img/1.jpg', 'https://img/2.jpg', 'https://img/b.jpg', 'https://img/a.jpg']);
  });
});

describe('header rules', () => {
  it('isUuid + safeWebsiteUrl + headerLocation', () => {
    expect(isUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(isUuid('harbour-city-plumbing')).toBe(false);
    expect(safeWebsiteUrl('example.com')).toBe('https://example.com');
    expect(safeWebsiteUrl('https://example.com')).toBe('https://example.com');
    expect(safeWebsiteUrl('javascript:alert(1)')).toBeNull();
    expect(safeWebsiteUrl(null)).toBeNull();
    expect(headerLocation({ suburb: 'Newtown', state: null })).toBe('Newtown, NSW');
    expect(headerLocation({ suburb: 'Brisbane', state: 'QLD' })).toBe('Brisbane, QLD');
  });

  it('headerPillFor follows the mode rule', () => {
    expect(headerPillFor('hidden', '2026-09-10', '2026-09-02')).toBeNull();
    expect(headerPillFor('next_available', '2026-09-10', '2026-09-02')).toBe('next_available');
    expect(headerPillFor('next_available', '2026-08-10', '2026-09-02')).toBe('status');
    expect(headerPillFor('next_available', null, '2026-09-02')).toBe('status');
    expect(headerPillFor('calendar', null, '2026-09-02')).toBe('status');
  });

  it('isBuilderVerified accepts legacy flags or structured verification', () => {
    expect(isBuilderVerified({ credentials: null, credentials_verified: null })).toBe(false);
    expect(isBuilderVerified({ credentials: { abn_verified: true, license_verified: false, insurance_verified: false, memberships: [] }, credentials_verified: null })).toBe(true);
    expect(isBuilderVerified({ credentials: null, credentials_verified: { licences: [{ verified: true } as never] } })).toBe(true);
  });
});

describe('business details + section count', () => {
  it('builds the rows from service_areas + response time', () => {
    const rows = businessDetailsFor({
      trade_category: 'plumber',
      suburb: 'Newtown',
      service_areas: ['radius:50', 'region:Lower Inner West', 'cover:Balmain', 'state:NSW'],
      response_time: 'Within 2 hours',
    });
    expect(rows.map((r) => [r.label, r.value])).toEqual([
      ['Trade', 'Plumber'],
      ['Location', 'Newtown (50km radius)'],
      ['Primary areas', 'Lower Inner West · all of NSW'],
      ['Also covers', 'Balmain'],
      ['Time to Reply', 'Typically within 2 hours'],
    ]);
  });

  it('counts the main-column sections the early-profile card keys off', () => {
    const sparse = { bio: null, specialisations: {}, projects: null, team_members: null, faqs: null };
    expect(countMainSections(sparse, { showServices: true, showReviews: true })).toBe(1);
    expect(countMainSections({ ...sparse, bio: 'hi', specialisations: { plumber: ['x'] } }, { showServices: true, showReviews: false })).toBe(2);
    expect(countMainSections({ ...sparse, bio: 'hi', specialisations: { plumber: ['x'] } }, { showServices: false, showReviews: false })).toBe(1);
  });
});
