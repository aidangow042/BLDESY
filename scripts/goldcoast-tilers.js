#!/usr/bin/env node
/**
 * goldcoast-tilers.js
 *
 * Searches the Google Places API (New) Text Search endpoint for tilers across
 * the Gold Coast QLD region, filters down to genuine tiling tradies in Gold
 * Coast suburbs, dedupes, and writes the results to a CSV.
 *
 * Usage:
 *   GOOGLE_PLACES_API_KEY=xxxx node scripts/goldcoast-tilers.js
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';

// Location bias — centred on the Gold Coast, 30km radius.
const BIAS = {
  circle: {
    center: { latitude: -28.0167, longitude: 153.4 },
    radius: 30000,
  },
};

const REQUEST_DELAY_MS = 1000;
const OUTPUT_FILE = path.join(__dirname, '..', 'goldcoast-tilers.csv');

const QUERIES = [
  'tiler Gold Coast',
  'tiling Gold Coast',
  'tile installer Gold Coast',
  'tiler Southport',
  'tiler Surfers Paradise',
  'tiler Broadbeach',
  'tiler Broadbeach Waters',
  'tiler Bundall',
  'tiler Labrador',
  'tiler Biggera Waters',
  'tiler Runaway Bay',
  'tiler Hope Island',
  'tiler Coomera',
  'tiler Upper Coomera',
  'tiler Oxenford',
  'tiler Helensvale',
  'tiler Nerang',
  'tiler Molendinar',
  'tiler Carrara',
  'tiler Robina',
  'tiler Mudgeeraba',
  'tiler Worongary',
  'tiler Burleigh Heads',
  'tiler Burleigh Waters',
  'tiler Miami',
  'tiler Mermaid Beach',
  'tiler Mermaid Waters',
  'tiler Varsity Lakes',
  'tiler Reedy Creek',
  'tiler Currumbin',
  'tiler Currumbin Waters',
  'tiler Palm Beach',
  'tiler Tugun',
  'tiler Coolangatta',
  'tiler Elanora',
  'tiler Tallebudgera',
  'tiler Tallai',
  'tiler Benowa',
  'tiler Ashmore',
  'tiler Arundel',
  'tiler Parkwood',
  'tiler Merrimac',
  'tiler Pacific Pines',
  'tiler Gaven',
  'tiler Highland Park',
  'tiler Mount Nathan',
  'tiler Bonogin',
  'bathroom tiler Gold Coast',
  'floor tiler Gold Coast',
  'wall tiler Gold Coast',
  'kitchen tiler Gold Coast',
  'bathroom tiles Gold Coast',
  'floor tiles Gold Coast',
  'tile repairs Gold Coast',
  'tiling contractor Gold Coast',
  'ceramic tiler Gold Coast',
  'porcelain tiler Gold Coast',
  'outdoor tiling Gold Coast',
  'pool tiling Gold Coast',
  'alfresco tiling Gold Coast',
  'laundry tiling Gold Coast',
  'bathroom renovation tiler Gold Coast',
];

// ---------------------------------------------------------------------------
// Filtering data
// ---------------------------------------------------------------------------

// Gold Coast suburbs we accept (lower-cased) — coastal, central and hinterland.
const GOLD_COAST_SUBURBS = new Set([
  // Northern Gold Coast
  'ormeau', 'ormeau hills', 'pimpama', 'coomera', 'upper coomera', 'oxenford',
  'studio village', 'maudsland', 'helensvale', 'hope island', 'sanctuary cove',
  'paradise point', 'hollywell', 'runaway bay', 'biggera waters', 'coombabah',
  'labrador', 'arundel', 'parkwood', 'gaven', 'pacific pines', 'mount nathan',
  // Central Gold Coast
  'southport', 'main beach', 'surfers paradise', 'bundall', 'benowa', 'ashmore',
  'molendinar', 'chevron island', 'isle of capri', 'broadbeach', 'broadbeach waters',
  'mermaid beach', 'mermaid waters', 'nobby beach', 'clear island waters',
  'carrara', 'nerang', 'highland park', 'gilston', 'advancetown',
  // Southern Gold Coast
  'miami', 'burleigh heads', 'burleigh waters', 'robina', 'varsity lakes',
  'merrimac', 'reedy creek', 'mudgeeraba', 'worongary', 'tallai', 'bonogin',
  'palm beach', 'elanora', 'currumbin', 'currumbin waters', 'currumbin valley',
  'tallebudgera', 'tallebudgera valley', 'tugun', 'bilinga', 'coolangatta',
  'kirra', 'rainbow bay', 'springbrook',
]);

// Suburbs to explicitly reject — Brisbane / Logan / Tweed Heads (NSW) / inland.
const EXCLUDED_SUBURBS = new Set([
  // Tweed Heads (NSW) and surrounds
  'tweed heads', 'tweed heads south', 'tweed heads west', 'banora point',
  'terranora', 'bilambil heights', 'kingscliff', 'chinderah', 'pottsville',
  'cabarita beach', 'casuarina', 'murwillumbah',
  // Brisbane / Logan
  'brisbane', 'brisbane city', 'logan central', 'logan village', 'beenleigh',
  'eagleby', 'mount warren park', 'windaroo', 'bethania', 'waterford',
  'loganholme', 'shailer park', 'springwood', 'daisy hill', 'cornubia',
  'tanah merah', 'kingston', 'marsden', 'crestmead', 'browns plains', 'jimboomba',
]);

// Gold Coast postcodes (4208–4230).
function postcodeAllowed(pc) {
  if (!pc) return false;
  const n = Number(pc);
  if (Number.isNaN(n)) return false;
  return n >= 4208 && n <= 4230;
}

// Name keywords that flag a supplier / shop / roof tiler rather than a tradie.
const EXCLUDE_NAME_KEYWORDS = [
  'roof', 'roofing', 'beaumont', 'national tiles', 'tile factory', 'tile outlet',
  'tile mart', 'tile warehouse', 'tile shop', 'tile store', 'tile gallery',
  'tile showroom', 'tile centre', 'tile center', 'tile market', 'tile world',
  'tilemarket', 'supplies', 'supplier', 'wholesale', 'showroom', 'outlet',
  'warehouse', 'megastore', 'hardware', 'bunnings', 'tile importer', 'importers',
  'distribution', 'distributor', 'amber tiles', 'di lorenzo', 'tile space',
  'tilestore', 'stone & tile', 'tiles & stone', 'home centre', 'building supplies',
  'trade centre', 'trade center',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normalisePhone(phone) {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
}

function normaliseName(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

function parseLocation(place) {
  let suburb = '';
  let state = '';
  let postcode = '';

  for (const c of place.addressComponents || []) {
    const types = c.types || [];
    if (types.includes('locality')) suburb = (c.longText || '').toLowerCase();
    if (types.includes('administrative_area_level_1')) state = (c.shortText || '').toUpperCase();
    if (types.includes('postal_code')) postcode = c.longText || '';
  }

  const addr = place.formattedAddress || '';
  if (!state) {
    const m = addr.match(/\b(QLD|NSW|VIC|SA|WA|TAS|NT|ACT)\b/i);
    if (m) state = m[1].toUpperCase();
  }
  if (!postcode) {
    const m = addr.match(/\b(\d{4})\b/);
    if (m) postcode = m[1];
  }

  return { suburb, state, postcode, addr };
}

function isSupplierOrRoofer(name) {
  const n = (name || '').toLowerCase();
  return EXCLUDE_NAME_KEYWORDS.some((kw) => n.includes(kw));
}

// Decide whether a place should be kept. Returns { keep, reason }.
function evaluate(place) {
  const name = place.displayName?.text || '';
  const { suburb, state, postcode } = parseLocation(place);

  // 1. Must be Queensland (drops Tweed Heads NSW and other interstate).
  if (state && state !== 'QLD') {
    return { keep: false, reason: `non-QLD (${state})` };
  }

  // 2. Reject Brisbane / Logan / Tweed Heads suburbs.
  if (suburb && EXCLUDED_SUBURBS.has(suburb)) {
    return { keep: false, reason: `excluded suburb (${suburb})` };
  }

  // 3. Must be a Gold Coast suburb OR a Gold Coast postcode.
  const suburbOk = suburb && GOLD_COAST_SUBURBS.has(suburb);
  const postcodeOk = postcodeAllowed(postcode);
  if (!suburbOk && !postcodeOk) {
    return { keep: false, reason: `not Gold Coast (${suburb || 'unknown'} ${postcode || ''})`.trim() };
  }

  // 4. Reject tile suppliers / shops / roof tilers.
  if (isSupplierOrRoofer(name)) {
    return { keep: false, reason: `supplier/shop/roofer (${name})` };
  }

  return { keep: true, reason: 'kept' };
}

async function searchText(query) {
  const body = {
    textQuery: query,
    locationBias: BIAS,
    regionCode: 'AU',
    maxResultCount: 20,
  };

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': [
        'places.displayName',
        'places.formattedAddress',
        'places.nationalPhoneNumber',
        'places.internationalPhoneNumber',
        'places.websiteUri',
        'places.rating',
        'places.userRatingCount',
        'places.addressComponents',
      ].join(','),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  const json = await res.json();
  return json.places || [];
}

function csvEscape(value) {
  const s = value === undefined || value === null ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!API_KEY) {
    console.error('ERROR: GOOGLE_PLACES_API_KEY environment variable is not set.');
    process.exit(1);
  }

  console.log('Gold Coast tiler search — Google Places API (New)');
  console.log(`Queries: ${QUERIES.length} | Bias: -28.0167, 153.4000 @ 30km\n`);

  const kept = new Map();
  const seenPhones = new Set();
  const seenNames = new Set();

  let totalRaw = 0;
  let totalKept = 0;
  let totalDupes = 0;
  let totalFiltered = 0;

  for (let i = 0; i < QUERIES.length; i++) {
    const query = QUERIES[i];
    process.stdout.write(`[${i + 1}/${QUERIES.length}] "${query}" ... `);

    let places;
    try {
      places = await searchText(query);
    } catch (err) {
      console.log(`FAILED (${err.message})`);
      await sleep(REQUEST_DELAY_MS);
      continue;
    }

    totalRaw += places.length;
    let keptThis = 0;
    let dupeThis = 0;
    let filteredThis = 0;

    for (const place of places) {
      const { keep } = evaluate(place);
      if (!keep) {
        filteredThis++;
        totalFiltered++;
        continue;
      }

      const name = place.displayName?.text || '';
      const phone = place.nationalPhoneNumber || place.internationalPhoneNumber || '';
      const phoneKey = normalisePhone(phone);
      const nameKey = normaliseName(name);

      const isDupe =
        (phoneKey && seenPhones.has(phoneKey)) ||
        (nameKey && seenNames.has(nameKey));

      if (isDupe) {
        dupeThis++;
        totalDupes++;
        continue;
      }

      if (phoneKey) seenPhones.add(phoneKey);
      if (nameKey) seenNames.add(nameKey);

      const { addr } = parseLocation(place);
      kept.set(nameKey + '|' + phoneKey, {
        name,
        address: place.formattedAddress || addr,
        phone,
        website: place.websiteUri || '',
        rating: place.rating ?? '',
        reviews: place.userRatingCount ?? '',
      });

      keptThis++;
      totalKept++;
    }

    console.log(
      `${places.length} results — kept ${keptThis}, dupes ${dupeThis}, filtered ${filteredThis}`
    );

    if (i < QUERIES.length - 1) await sleep(REQUEST_DELAY_MS);
  }

  const header = ['Business Name', 'Address', 'Phone', 'Website', 'Rating', 'Review Count'];
  const rows = [header.map(csvEscape).join(',')];
  for (const r of kept.values()) {
    rows.push(
      [r.name, r.address, r.phone, r.website, r.rating, r.reviews].map(csvEscape).join(',')
    );
  }
  fs.writeFileSync(OUTPUT_FILE, rows.join('\n') + '\n', 'utf8');

  console.log('\n----------------------------------------');
  console.log(`Raw results returned : ${totalRaw}`);
  console.log(`Filtered out         : ${totalFiltered}`);
  console.log(`Duplicates skipped   : ${totalDupes}`);
  console.log(`Unique tilers kept   : ${totalKept}`);
  console.log(`CSV written to       : ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
