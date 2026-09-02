import { describe, expect, it, vi } from 'vitest';

import {
  MAX_DOC_BYTES,
  MAX_IMAGE_BYTES,
  avatarPath,
  contentTypeFor,
  extensionOf,
  jobMediaPath,
  validateDocFile,
  validateImageFile,
} from '@/components/jobs/job-media';

vi.mock('expo-file-system', () => ({ File: class {} }));
vi.mock('@/lib/supabase', () => import('../data/mocks/supabase-mock'));
vi.mock('@/lib/data/profile-edit', () => ({ queueMediaModeration: vi.fn() }));

describe('extensionOf', () => {
  it('lower-cases and ignores query strings / paths', () => {
    expect(extensionOf('IMG_0001.JPG')).toBe('jpg');
    expect(extensionOf('file:///tmp/photo.heic?x=1')).toBe('heic');
    expect(extensionOf('https://x/y/plans.PDF#page=2')).toBe('pdf');
    expect(extensionOf('noext')).toBe('');
  });
});

describe('validateImageFile (upload-validation.ts)', () => {
  it('accepts jpg/png/webp under 5MB', () => {
    expect(validateImageFile({ uri: 'file:///a.jpg', size: 1024 })).toBeNull();
    expect(validateImageFile({ uri: 'file:///a', name: 'shot.PNG', size: MAX_IMAGE_BYTES })).toBeNull();
    expect(validateImageFile({ uri: 'file:///a.webp', mimeType: 'image/webp' })).toBeNull();
  });

  it('rejects other types with the web message', () => {
    expect(validateImageFile({ uri: 'file:///a.heic' })).toBe('Invalid file type. Allowed: jpg, jpeg, png, gif, webp');
    expect(validateImageFile({ uri: 'file:///a.png', mimeType: 'image/heic' })).toBe('Invalid file type: image/heic');
  });

  it('rejects oversize files with the size readout', () => {
    expect(validateImageFile({ uri: 'file:///a.jpg', size: 6 * 1024 * 1024 })).toBe(
      'File too large. Maximum size: 5MB (yours: 6.0MB)',
    );
  });
});

describe('validateDocFile', () => {
  it('accepts pdf/doc/docx/xls/xlsx under 10MB', () => {
    expect(validateDocFile({ uri: 'file:///plans.pdf', size: MAX_DOC_BYTES })).toBeNull();
    expect(validateDocFile({ uri: 'file:///x', name: 'spec.docx' })).toBeNull();
  });

  it('rejects other types and oversize files', () => {
    expect(validateDocFile({ uri: 'file:///a.dwg' })).toBe('Invalid file type. Allowed: pdf, doc, docx, xls, xlsx');
    expect(validateDocFile({ uri: 'file:///a.pdf', size: 11 * 1024 * 1024 })).toBe(
      'File too large. Maximum size: 10MB (yours: 11.0MB)',
    );
  });
});

describe('storage paths', () => {
  it('mirror the web wizard and profile section', () => {
    expect(jobMediaPath('u1', 'photo', 'jpg', 1700000000000)).toBe('u1/job-photo-1700000000000.jpg');
    expect(jobMediaPath('u1', 'doc', 'pdf', 42)).toBe('u1/job-doc-42.pdf');
    expect(avatarPath('u1', 'png', 7)).toBe('u1/avatar-7.png');
  });

  it('content types', () => {
    expect(contentTypeFor('jpg')).toBe('image/jpeg');
    expect(contentTypeFor('pdf')).toBe('application/pdf');
    expect(contentTypeFor('bin')).toBe('application/octet-stream');
  });
});
