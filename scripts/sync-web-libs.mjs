#!/usr/bin/env node
/**
 * sync-web-libs — mirror pure modules from the website repo into this app.
 *
 * The website (~/bldesy-web) owns every rule: trades, scoring, zones, tiers,
 * visibility, completeness, billing state, copy. The app must never fork them.
 * This script copies the manifest below VERBATIM (import paths rewritten) into
 * `lib/web/`, `types/` and `__tests__/web/`, so a drift fix is one command:
 *
 *   npm run sync:web            # copy
 *   npm run sync:web -- --check # exit 1 if anything is out of date (CI)
 *
 * Rules enforced: a mirrored file may not import `server-only`, anything from
 * `next/*`, or read `process.env` (except the ENV_ALLOWLIST below, where the
 * env read is an optional override that is simply undefined in the app).
 *
 * Override the web checkout with BLDESY_WEB_ROOT=/path (defaults to ~/bldesy-web).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB_ROOT = process.env.BLDESY_WEB_ROOT || path.join(os.homedir(), 'bldesy-web');
const CHECK = process.argv.includes('--check');

/** lib/<file> paths in the web repo → lib/web/<file> in the app. */
const LIB_MANIFEST = [
  'trades.ts',
  'trade-specialisations.ts',
  'licensed-trades.ts',
  'trade-licence-map.ts',
  'credentials.ts',
  'builder-scoring.ts',
  'match.ts',
  'capabilities.ts',
  'business-types.ts',
  'contract-roles.ts',
  'service-areas.ts',
  'zone-priority.ts',
  'suburbs.ts',
  'locations.ts',
  'supply-caps.ts',
  'founding-offer.ts',
  'launch-trades.ts',
  'launch-zones.ts',
  'coverage-map/config.ts',
  'stage2.ts',
  'launch.ts',
  'verification-copy.ts',
  'response-time.ts',
  'availability.ts',
  'dates.ts',
  'avatar.ts',
  'trade-colours.ts',
  'profile-visibility.ts',
  'profile-completeness.ts',
  'portal/profile-status.ts',
  'portal/credential-expiry.ts',
  'billing/plan-state.ts',
  'billing/config.ts',
  'pricing-tiers-client.ts',
  'referrals/config.ts',
  'queries/searchable-filter.ts',
  'funnel/events.ts',
  'safe-redirect.ts',
  'phone.ts',
  'slug.ts',
  'profile-url.ts',
  'hooks/use-resend-cooldown.ts',
];

/** types/<file> in the web repo → types/<file> in the app (same path). */
const TYPES_MANIFEST = ['index.ts', 'database.ts'];

/** __tests__/<file> in the web repo → __tests__/web/<file> in the app. */
const TESTS_MANIFEST = [
  'builder-scoring.test.ts',
  'profile-completeness.test.ts',
  'founding-zones.test.ts',
  'supply-caps.test.ts',
  'portal-profile-status.test.ts',
  'launch-trades.test.ts',
  'launch-zones.test.ts',
  'billing-plan-state.test.ts',
  'suburbs.test.ts',
  'slug.test.ts',
  'safe-redirect.test.ts',
  'profile-url.test.ts',
  'credential-expiry.test.ts',
];

/** Files allowed to contain `process.env` (optional overrides, undefined in the app). */
const ENV_ALLOWLIST = new Set(['billing/config.ts']);

/**
 * Import-specifier rewrite. Web lib modules import each other as `@/lib/x` or
 * `./x`; in the app they live under `@/lib/web/x`. A few targets are the app's
 * OWN modules (same exports, different implementation) and must not be
 * redirected into lib/web.
 */
const KEEP_APP_OWN = new Set(['geo', 'au-locations.json']);
const SPECIAL = new Map([['waitlist-mode', '@/lib/launch-flags']]);

function mapLibTarget(libRel) {
  const clean = libRel.replace(/\.(ts|tsx)$/, '');
  if (SPECIAL.has(clean)) return SPECIAL.get(clean);
  if (KEEP_APP_OWN.has(clean) || KEEP_APP_OWN.has(libRel)) return `@/lib/${libRel}`;
  return `@/lib/web/${clean}`;
}

function rewriteSpecifier(spec, sourceLibRel) {
  if (spec.startsWith('@/lib/')) return mapLibTarget(spec.slice('@/lib/'.length));
  if (spec.startsWith('./') || spec.startsWith('../')) {
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(sourceLibRel), spec));
    return mapLibTarget(resolved);
  }
  return spec; // @/types, react, node:*, vitest — unchanged
}

function rewriteImports(src, sourceLibRel) {
  return src.replace(/(from\s+|import\s*\(\s*|import\s+)(["'])([^"']+)\2/g, (m, lead, q, spec) => {
    return `${lead}${q}${rewriteSpecifier(spec, sourceLibRel)}${q}`;
  });
}

function guard(rel, src) {
  const problems = [];
  if (/from\s+["']server-only["']|import\s+["']server-only["']/.test(src)) problems.push('imports server-only');
  if (/from\s+["']next\//.test(src)) problems.push('imports next/*');
  if (/process\.env\s*[.[]/.test(src) && !ENV_ALLOWLIST.has(rel)) problems.push('reads process.env');
  if (problems.length) throw new Error(`${rel}: ${problems.join(', ')} — not mirrorable`);
}

function header(srcRel) {
  return `// AUTO-SYNCED from ~/bldesy-web/${srcRel} by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.\n// Change the website original, then run: npm run sync:web\n\n`;
}

let drift = 0;
let written = 0;
function emit(destAbs, content) {
  const existing = fs.existsSync(destAbs) ? fs.readFileSync(destAbs, 'utf8') : null;
  if (existing === content) return;
  if (CHECK) { drift++; console.log(`DRIFT ${path.relative(APP_ROOT, destAbs)}`); return; }
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  fs.writeFileSync(destAbs, content);
  written++;
}

for (const rel of LIB_MANIFEST) {
  const srcAbs = path.join(WEB_ROOT, 'lib', rel);
  if (!fs.existsSync(srcAbs)) throw new Error(`missing in web: lib/${rel}`);
  const src = fs.readFileSync(srcAbs, 'utf8');
  guard(rel, src);
  emit(path.join(APP_ROOT, 'lib/web', rel), header(`lib/${rel}`) + rewriteImports(src, rel));
}
for (const rel of TYPES_MANIFEST) {
  const src = fs.readFileSync(path.join(WEB_ROOT, 'types', rel), 'utf8');
  emit(path.join(APP_ROOT, 'types', rel), header(`types/${rel}`) + src);
}
for (const rel of TESTS_MANIFEST) {
  const src = fs.readFileSync(path.join(WEB_ROOT, '__tests__', rel), 'utf8');
  // Tests live in the web's __tests__ root, so relative specifiers are rare; @/lib/* → @/lib/web/*.
  emit(path.join(APP_ROOT, '__tests__/web', rel), header(`__tests__/${rel}`) + rewriteImports(src, 'x.ts'));
}

if (CHECK) {
  if (drift) { console.error(`${drift} mirrored file(s) out of date — run npm run sync:web`); process.exit(1); }
  console.log('web mirror up to date');
} else {
  console.log(`synced ${written} file(s) from ${WEB_ROOT}`);
}
