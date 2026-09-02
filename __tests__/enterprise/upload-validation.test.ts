import { describe, expect, it } from 'vitest';

import {
  contentTypeFor,
  fileExtension,
  MAX_DOC_SIZE,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  validateDocFile,
  validateImageFile,
  validateVideoFile,
} from '@/lib/enterprise-hub/upload-validation';

describe('fileExtension', () => {
  it('reads the last extension, lower-cased, ignoring query strings', () => {
    expect(fileExtension('photo.JPG')).toBe('jpg');
    expect(fileExtension('file:///tmp/a/b/site plan.pdf?x=1')).toBe('pdf');
    expect(fileExtension('noext')).toBe('');
  });
});

describe('validateImageFile (lib/upload-validation.ts strings)', () => {
  it('accepts allowed images', () => {
    expect(validateImageFile({ name: 'a.png', size: 1000, mimeType: 'image/png' })).toBeNull();
    expect(validateImageFile({ name: 'a.heic' })).toBe('Invalid file type. Allowed: jpg, jpeg, png, gif, webp');
  });
  it('rejects a MIME that disagrees with the extension', () => {
    expect(validateImageFile({ name: 'a.png', mimeType: 'image/jpeg' })).toBe(
      'File extension does not match its content type.',
    );
    expect(validateImageFile({ name: 'a.png', mimeType: 'application/pdf' })).toBe('Invalid file type: application/pdf');
  });
  it('rejects oversize with the yours: X.XMB tail', () => {
    expect(validateImageFile({ name: 'a.jpg', size: MAX_IMAGE_SIZE + 1024 * 1024 })).toBe(
      'File too large. Maximum size: 5MB (yours: 6.0MB)',
    );
  });
});

describe('validateVideoFile / validateDocFile', () => {
  it('video caps at 100MB', () => {
    expect(validateVideoFile({ name: 'clip.mov', mimeType: 'video/quicktime', size: 10 })).toBeNull();
    expect(validateVideoFile({ name: 'clip.avi' })).toBe('Invalid file type. Allowed: mp4, mov, webm');
    expect(validateVideoFile({ name: 'clip.mp4', size: MAX_VIDEO_SIZE + 1 })).toMatch(/^File too large\. Maximum size: 100MB/);
  });
  it('docs cap at 10MB', () => {
    expect(validateDocFile({ name: 'plan.pdf', mimeType: 'application/pdf' })).toBeNull();
    expect(validateDocFile({ name: 'plan.dwg' })).toBe('Invalid file type. Allowed: pdf, doc, docx, xls, xlsx');
    expect(validateDocFile({ name: 'plan.pdf', size: MAX_DOC_SIZE + 1 })).toMatch(/^File too large\. Maximum size: 10MB/);
  });
});

describe('contentTypeFor', () => {
  it('prefers the picker MIME, else the extension map, else octet-stream', () => {
    expect(contentTypeFor('png', 'image/png')).toBe('image/png');
    expect(contentTypeFor('mov')).toBe('video/quicktime');
    expect(contentTypeFor('zzz')).toBe('application/octet-stream');
  });
});
