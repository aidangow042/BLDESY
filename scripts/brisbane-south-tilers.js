#!/usr/bin/env node
/**
 * brisbane-south-tilers.js
 *
 * Searches the Google Places API (New) Text Search endpoint for tilers across
 * Brisbane's southside (incl. Logan), filters down to genuine tiling tradies in
 * south-of-CBD suburbs, dedupes, and writes the results to a CSV.
 *
 * Usage:
 *   GOOGLE_PLACES_API_KEY=xxxx node scripts/brisbane-south-tilers.js
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';

// Location bias — centred on Brisbane South, 25km radius.
const BIAS = {
  circle: {
    center: { latitude: -27.5916, longitude: 153.0419 },
    radius: 25000,
  },
};

const REQUEST_DELAY_MS = 1000;
const OUTPUT_FILE = path.join(__dirname, '..', 'brisbane-south-tilers.csv');

const QUERIES = [
  'tiler Brisbane South',
  'tiling Brisbane South',
  'tile installer Brisbane South',
  'tiler Sunnybank',
  'tiler Sunnybank Hills',
  'tiler Runcorn',
  'tiler Calamvale',
  'tiler Stretton',
  'tiler Parkinson',
  'tiler Rochedale',
  'tiler Rochedale South',
  'tiler Springwood',
  'tiler Daisy Hill',
  'tiler Shailer Park',
  'tiler Logan Central',
  'tiler Woodridge',
  'tiler Browns Plains',
  'tiler Marsden',
  'tiler Kingston',
  'tiler Slacks Creek',
  'tiler Underwood',
  'tiler Eight Mile Plains',
  'tiler Mansfield',
  'tiler Wishart',
  'tiler Salisbury',
  'tiler Acacia Ridge',
  'tiler Coopers Plains',
  'tiler Yeronga',
  'tiler Yeerongpilly',
  'tiler Annerley',
  'tiler Greenslopes',
  'tiler Moorooka',
  'tiler Algester',
  'tiler Carindale',
  'tiler Mount Gravatt',
  'tiler Upper Mount Gravatt',
  'tiler Holland Park',
  'tiler Holland Park West',
  'tiler Tarragindi',
  'tiler Stones Corner',
  'bathroom tiler Brisbane South',
  'floor tiler Brisbane South',
  'wall tiler Brisbane South',
  'kitchen tiler Brisbane South',
  'bathroom tiles Brisbane South',
  'floor tiles Brisbane South',
  'tile repairs Brisbane South',
  'tiling contractor Brisbane southside',
  'ceramic tiler Brisbane South',
  'porcelain tiler Brisbane South',
  'outdoor tiling Brisbane South',
  'pool tiling Brisbane South',
  'alfresco tiling Brisbane South',
  'laundry tiling Brisbane South',
  'bathroom renovation tiler Brisbane South',
];

// ---------------------------------------------------------------------------
// Filtering data
// ---------------------------------------------------------------------------

// Brisbane south-of-river suburbs (incl. Logan) we accept (lower-cased).
const BRISBANE_SOUTH_SUBURBS = new Set([
  // Inner south
  'south brisbane', 'west end', 'highgate hill', 'woolloongabba', 'dutton park',
  'fairfield', 'annerley', 'yeronga', 'yeerongpilly', 'tennyson', 'moorooka',
  'rocklea', 'salisbury', 'nathan', 'coopers plains', 'archerfield',
  // South-east / Mount Gravatt belt
  'greenslopes', 'stones corner', 'holland park', 'holland park west', 'tarragindi',
  'wellers hill', 'mount gravatt', 'mount gravatt east', 'upper mount gravatt',
  'mansfield', 'wishart', 'macgregor', 'robertson', 'eight mile plains',
  'rochedale', 'rochedale south', 'carindale', 'carina heights', 'coorparoo',
  // Sunnybank / Calamvale belt
  'sunnybank', 'sunnybank hills', 'runcorn', 'kuraby', 'calamvale', 'stretton',
  'drewvale', 'parkinson', 'algester', 'acacia ridge', 'pallara', 'willawong',
  'larapinta', 'forestdale', 'heritage park', 'regents park',
  // Logan north
  'springwood', 'daisy hill', 'priestdale', 'shailer park', 'slacks creek',
  'underwood', 'rochedale', 'logan central', 'woodridge', 'kingston', 'marsden',
  'crestmead', 'browns plains', 'hillcrest', 'loganlea', 'loganholme', 'waterford',
  'waterford west', 'meadowbrook', 'berrinba', 'logan reserve', 'cornubia',
]);

// North / West / East / interstate suburbs to explicitly reject.
const EXCLUDED_SUBURBS = new Set([
  // Brisbane CBD / inner north
  'brisbane city', 'brisbane', 'spring hill', 'fortitude valley', 'new farm',
  'teneriffe', 'newstead', 'bowen hills', 'herston', 'kelvin grove', 'red hill',
  // Brisbane North
  'chermside', 'aspley', 'kedron', 'nundah', 'stafford', 'stafford heights',
  'everton park', 'mitchelton', 'gaythorne', 'wavell heights', 'clayfield',
  'hamilton', 'ascot', 'hendra', 'northgate', 'banyo', 'virginia', 'geebung',
  'zillmere', 'boondall', 'bracken ridge', 'sandgate', 'brighton', 'north lakes',
  'albany creek', 'eatons hill', 'ferny hills', 'ferny grove', 'arana hills',
  'lutwyche', 'windsor', 'wooloowin', 'eagle farm', 'pinkenba',
  // Brisbane West
  'indooroopilly', 'toowong', 'st lucia', 'taringa', 'auchenflower', 'milton',
  'paddington', 'bardon', 'the gap', 'ashgrove', 'kenmore', 'kenmore hills',
  'chapel hill', 'brookfield', 'pullenvale', 'fig tree pocket', 'jindalee',
  'mount ommaney', 'sinnamon park', 'jamboree heights', 'middle park', 'westlake',
  'sherwood', 'graceville', 'chelmer', 'corinda', 'oxley', 'darra', 'sumner',
  'seventeen mile rocks', 'jindalee', 'riverhills', 'inala', 'durack', 'doolandella',
  'richlands', 'wacol', 'forest lake', 'ellen grove',
  // Brisbane East
  'wynnum', 'wynnum west', 'manly', 'manly west', 'lota', 'wakerley', 'gumdale',
  'tingalpa', 'murarrie', 'cannon hill', 'morningside', 'bulimba', 'balmoral',
  'hawthorne', 'hemmant', 'lytton', 'belmont', 'carina', 'camp hill', 'capalaba',
  'birkdale', 'wellington point', 'cleveland', 'thorneside', 'ormiston', 'alexandra hills',
]);

// Brisbane South + Logan-north postcodes we accept.
const ALLOWED_POSTCODES = new Set([
  4101, 4102, 4103, 4104, 4105, 4106, 4107, 4108, 4109, 4110, 4112, 4113, 4114,
  4115, 4116, 4117, 4118, 4120, 4121, 4122, 4123, 4127, 4128, 4129, 4130, 4131,
  4132, 4133, 4151, 4152,
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

  // 2. Reject North / West / East / inner suburbs.
  if (suburb && EXCLUDED_SUBURBS.has(suburb)) {
    return { keep: false, reason: `excluded suburb (${suburb})` };
  }

  // 3. Must be a Brisbane South suburb OR an allowed southside postcode.
  //    (Require a positive match so unknown/interstate places are dropped.)
  const suburbOk = suburb && BRISBANE_SOUTH_SUBURBS.has(suburb);
  const postcodeOk = postcodeAllowed(postcode);
  if (!suburbOk && !postcodeOk) {
    return { keep: false, reason: `not Brisbane South (${suburb || 'unknown'} ${postcode || ''})`.trim() };
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

  console.log('Brisbane South tiler search — Google Places API (New)');
  console.log(`Queries: ${QUERIES.length} | Bias: -27.5916, 153.0419 @ 25km\n`);

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
