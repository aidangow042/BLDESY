#!/usr/bin/env node
/**
 * brisbane-west-tilers.js
 *
 * Searches the Google Places API (New) Text Search endpoint for tilers across
 * Brisbane's western corridor (incl. the Centenary suburbs and the
 * Ipswich/Springfield corridor), filters down to genuine tiling tradies west of
 * the CBD, dedupes, and writes the results to a CSV.
 *
 * Usage:
 *   GOOGLE_PLACES_API_KEY=xxxx node scripts/brisbane-west-tilers.js
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';

// Location bias — centred on Brisbane West, 25km radius.
const BIAS = {
  circle: {
    center: { latitude: -27.5494, longitude: 152.9379 },
    radius: 25000,
  },
};

const REQUEST_DELAY_MS = 1000;
const OUTPUT_FILE = path.join(__dirname, '..', 'brisbane-west-tilers.csv');

const QUERIES = [
  'tiler Brisbane West',
  'tiling Brisbane West',
  'tile installer Brisbane West',
  'tiler Inala',
  'tiler Richlands',
  'tiler Oxley',
  'tiler Darra',
  'tiler Wacol',
  'tiler Sumner',
  'tiler Sinnamon Park',
  'tiler Jindalee',
  'tiler Middle Park',
  'tiler Mount Ommaney',
  'tiler Riverhills',
  'tiler Kenmore',
  'tiler Kenmore Hills',
  'tiler Chapel Hill',
  'tiler Brookfield',
  'tiler Pullenvale',
  'tiler Moggill',
  'tiler Bellbowrie',
  'tiler Seventeen Mile Rocks',
  'tiler Westlake',
  'tiler Jamboree Heights',
  'tiler Corinda',
  'tiler Graceville',
  'tiler Sherwood',
  'tiler Rocklea',
  'tiler Salisbury',
  'tiler Moorooka',
  'tiler Tennyson',
  'tiler Chelmer',
  'tiler Indooroopilly',
  'tiler Taringa',
  'tiler Toowong',
  'tiler St Lucia',
  'tiler Fig Tree Pocket',
  'tiler Pinjarra Hills',
  'tiler Ipswich',
  'tiler Goodna',
  'tiler Redbank',
  'tiler Redbank Plains',
  'tiler Springfield',
  'tiler Springfield Lakes',
  'tiler Collingwood Park',
  'tiler Camira',
  'tiler Gailes',
  'bathroom tiler Brisbane West',
  'floor tiler Brisbane West',
  'wall tiler Brisbane West',
  'kitchen tiler Brisbane West',
  'bathroom tiles Brisbane West',
  'floor tiles Brisbane West',
  'tile repairs Brisbane West',
  'tiling contractor Brisbane West',
  'ceramic tiler Brisbane West',
  'porcelain tiler Brisbane West',
  'outdoor tiling Brisbane West',
  'pool tiling Brisbane West',
  'alfresco tiling Brisbane West',
  'laundry tiling Brisbane West',
  'bathroom renovation tiler Brisbane West',
  'tiler westside Brisbane',
];

// ---------------------------------------------------------------------------
// Filtering data
// ---------------------------------------------------------------------------

// Brisbane west-corridor suburbs we accept (lower-cased). Includes the inner
// west, Centenary suburbs, the western fringe (Moggill/Bellbowrie), the
// Ipswich/Springfield corridor, and the four queried south-border suburbs
// (Rocklea/Salisbury/Moorooka/Tennyson) the user explicitly targeted.
const BRISBANE_WEST_SUBURBS = new Set([
  // Inner west
  'toowong', 'auchenflower', 'milton', 'st lucia', 'taringa', 'indooroopilly',
  'chelmer', 'graceville', 'sherwood', 'corinda', 'oxley', 'tennyson', 'yeerongpilly',
  // Western suburbs / Kenmore belt
  'kenmore', 'kenmore hills', 'chapel hill', 'brookfield', 'pullenvale',
  'fig tree pocket', 'pinjarra hills', 'moggill', 'bellbowrie', 'anstead',
  'karana downs', 'mount crosby', 'chuwar', 'kholo',
  // Centenary suburbs
  'jindalee', 'mount ommaney', 'middle park', 'westlake', 'riverhills',
  'sinnamon park', 'jamboree heights', 'seventeen mile rocks', 'sumner',
  'darra', 'wacol', 'richlands', 'inala', 'durack', 'doolandella', 'ellen grove',
  'forest lake', 'carole park', 'heathwood', 'pallara',
  // Queried south-border suburbs
  'rocklea', 'salisbury', 'moorooka',
  // Ipswich / Springfield corridor
  'goodna', 'gailes', 'camira', 'springfield', 'springfield lakes', 'springfield central',
  'augustine heights', 'brookwater', 'bellbird park', 'redbank', 'redbank plains',
  'collingwood park', 'ipswich', 'bundamba', 'booval', 'dinmore', 'riverview',
  'east ipswich', 'north ipswich', 'west ipswich', 'raceview', 'yamanto',
  'one mile', 'leichhardt', 'churchill', 'flinders view', 'ripley', 'deebing heights',
]);

// Suburbs to explicitly reject — North / East / non-queried South / CBD / NSW.
const EXCLUDED_SUBURBS = new Set([
  // CBD / inner north
  'brisbane city', 'brisbane', 'spring hill', 'fortitude valley', 'new farm',
  'teneriffe', 'newstead', 'bowen hills', 'herston', 'kelvin grove', 'red hill',
  // Brisbane North
  'chermside', 'aspley', 'kedron', 'nundah', 'stafford', 'everton park',
  'mitchelton', 'gaythorne', 'wavell heights', 'clayfield', 'hamilton', 'ascot',
  'hendra', 'northgate', 'banyo', 'virginia', 'geebung', 'zillmere', 'boondall',
  'bracken ridge', 'sandgate', 'brighton', 'north lakes', 'the gap', 'ashgrove',
  'enoggera', 'keperra', 'arana hills', 'ferny grove', 'ferny hills',
  // Brisbane East
  'wynnum', 'manly', 'lota', 'wakerley', 'gumdale', 'tingalpa', 'murarrie',
  'cannon hill', 'morningside', 'bulimba', 'balmoral', 'hawthorne', 'hemmant',
  'belmont', 'carina', 'carina heights', 'carindale', 'camp hill', 'coorparoo',
  // Brisbane South (NON-queried — the south belt)
  'sunnybank', 'sunnybank hills', 'runcorn', 'kuraby', 'calamvale', 'stretton',
  'drewvale', 'parkinson', 'algester', 'acacia ridge', 'coopers plains',
  'eight mile plains', 'macgregor', 'robertson', 'mount gravatt', 'mount gravatt east',
  'upper mount gravatt', 'mansfield', 'wishart', 'rochedale', 'rochedale south',
  'holland park', 'holland park west', 'tarragindi', 'wellers hill', 'greenslopes',
  'stones corner', 'annerley', 'yeronga', 'fairfield', 'dutton park', 'woolloongabba',
  'archerfield', 'nathan',
]);

// Brisbane West + Ipswich/Springfield postcodes we accept.
const ALLOWED_POSTCODES = new Set([
  4066, 4067, 4068, 4069, 4070, 4073, 4074, 4075, 4076, 4077, 4078, // west corridor
  4105, 4106, 4107, // queried south-border (Moorooka/Tennyson/Rocklea/Salisbury)
  4300, 4301, 4303, 4304, 4305, 4306, // Ipswich / Springfield corridor
]);

function postcodeAllowed(pc) {
  if (!pc) return false;
  const n = Number(pc);
  return ALLOWED_POSTCODES.has(n);
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

  // 1. Must be Queensland.
  if (state && state !== 'QLD') {
    return { keep: false, reason: `non-QLD (${state})` };
  }

  // 2. Reject North / East / non-queried South / CBD suburbs.
  if (suburb && EXCLUDED_SUBURBS.has(suburb)) {
    return { keep: false, reason: `excluded suburb (${suburb})` };
  }

  // 3. Must be a Brisbane West suburb OR an allowed western/Ipswich postcode.
  const suburbOk = suburb && BRISBANE_WEST_SUBURBS.has(suburb);
  const postcodeOk = postcodeAllowed(postcode);
  if (!suburbOk && !postcodeOk) {
    return { keep: false, reason: `not Brisbane West (${suburb || 'unknown'} ${postcode || ''})`.trim() };
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

  console.log('Brisbane West tiler search — Google Places API (New)');
  console.log(`Queries: ${QUERIES.length} | Bias: -27.5494, 152.9379 @ 25km\n`);

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
