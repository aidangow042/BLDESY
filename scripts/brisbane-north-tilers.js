#!/usr/bin/env node
/**
 * brisbane-north-tilers.js
 *
 * Searches the Google Places API (New) Text Search endpoint for tilers across
 * Brisbane's northside (incl. the Moreton Bay / Redcliffe / Caboolture
 * corridor), filters down to genuine tiling tradies north of the CBD, dedupes,
 * and writes the results to a CSV.
 *
 * Usage:
 *   GOOGLE_PLACES_API_KEY=xxxx node scripts/brisbane-north-tilers.js
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';

// Location bias — centred on Brisbane North, 25km radius.
const BIAS = {
  circle: {
    center: { latitude: -27.3878, longitude: 153.0186 },
    radius: 25000,
  },
};

const REQUEST_DELAY_MS = 1000;
const OUTPUT_FILE = path.join(__dirname, '..', 'brisbane-north-tilers.csv');

const QUERIES = [
  'tiler Brisbane North',
  'tiling Brisbane North',
  'tile installer Brisbane North',
  'tiler Chermside',
  'tiler Aspley',
  'tiler Stafford',
  'tiler Stafford Heights',
  'tiler Kedron',
  'tiler Nundah',
  'tiler Northgate',
  'tiler Zillmere',
  'tiler Boondall',
  'tiler Bracken Ridge',
  'tiler Sandgate',
  'tiler Shorncliffe',
  'tiler Clontarf',
  'tiler Redcliffe',
  'tiler Scarborough',
  'tiler Woody Point',
  'tiler Margate',
  'tiler Kallangur',
  'tiler Petrie',
  'tiler Lawnton',
  'tiler Strathpine',
  'tiler Brendale',
  'tiler Albany Creek',
  'tiler Everton Park',
  'tiler Everton Hills',
  'tiler Mitchelton',
  'tiler Keperra',
  'tiler Ferny Grove',
  'tiler Ferny Hills',
  'tiler Arana Hills',
  'tiler Bunya',
  'tiler Warner',
  'tiler Griffin',
  'tiler Mango Hill',
  'tiler North Lakes',
  'tiler Narangba',
  'tiler Burpengary',
  'tiler Caboolture',
  'tiler Morayfield',
  'tiler Deception Bay',
  'tiler Kippa Ring',
  'tiler Rothwell',
  'tiler Murrumba Downs',
  'tiler Eatons Hill',
  'tiler McDowall',
  'tiler Wavell Heights',
  'tiler Nudgee',
  'tiler Geebung',
  'tiler Virginia',
  'bathroom tiler Brisbane North',
  'floor tiler Brisbane North',
  'wall tiler Brisbane North',
  'kitchen tiler Brisbane North',
  'bathroom tiles Brisbane North',
  'floor tiles Brisbane North',
  'tile repairs Brisbane North',
  'tiling contractor Brisbane North',
  'ceramic tiler Brisbane North',
  'porcelain tiler Brisbane North',
  'outdoor tiling Brisbane North',
  'pool tiling Brisbane North',
  'alfresco tiling Brisbane North',
  'laundry tiling Brisbane North',
  'bathroom renovation tiler Brisbane North',
  'tiler northside Brisbane',
];

// ---------------------------------------------------------------------------
// Filtering data
// ---------------------------------------------------------------------------

// Brisbane north-side suburbs we accept (lower-cased). Inner north, northwest,
// the bayside/Redcliffe peninsula, and the Moreton Bay (Caboolture) corridor.
const BRISBANE_NORTH_SUBURBS = new Set([
  // Inner north
  'windsor', 'wooloowin', 'lutwyche', 'gordon park', 'grange', 'wilston',
  'alderley', 'newmarket', 'enoggera', 'gaythorne', 'kedron', 'wavell heights',
  // North
  'chermside', 'chermside west', 'aspley', 'stafford', 'stafford heights',
  'mcdowall', 'everton park', 'everton hills', 'mitchelton', 'keperra',
  'ferny grove', 'ferny hills', 'upper kedron', 'arana hills', 'bunya',
  'bridgeman downs', 'albany creek', 'eatons hill', 'cashmere',
  'nundah', 'northgate', 'banyo', 'nudgee', 'nudgee beach', 'virginia', 'geebung',
  'zillmere', 'boondall', 'taigum', 'fitzgibbon', 'carseldine', 'aspley',
  // Bayside north
  'bracken ridge', 'bald hills', 'sandgate', 'shorncliffe', 'brighton', 'deagon',
  // Redcliffe peninsula
  'clontarf', 'margate', 'woody point', 'redcliffe', 'scarborough', 'newport',
  'kippa-ring', 'kippa ring', 'rothwell',
  // Moreton Bay corridor
  'mango hill', 'north lakes', 'griffin', 'murrumba downs', 'kallangur', 'dakabin',
  'kurwongbah', 'whiteside', 'petrie', 'lawnton', 'strathpine', 'bray park',
  'brendale', 'warner', 'joyner', 'narangba', 'burpengary', 'burpengary east',
  'caboolture', 'caboolture south', 'morayfield', 'deception bay',
  'samford', 'samford valley', 'samford village', 'dayboro', 'clear mountain',
]);

// Suburbs to explicitly reject — South / West / East / CBD / NSW.
const EXCLUDED_SUBURBS = new Set([
  // CBD / inner
  'brisbane city', 'brisbane', 'spring hill', 'fortitude valley', 'new farm',
  'teneriffe', 'newstead', 'bowen hills', 'herston', 'petrie terrace',
  'kelvin grove', 'red hill', 'paddington', 'milton',
  // Brisbane West
  'the gap', 'ashgrove', 'bardon', 'toowong', 'auchenflower', 'st lucia',
  'taringa', 'indooroopilly', 'chelmer', 'graceville', 'sherwood', 'corinda',
  'oxley', 'kenmore', 'kenmore hills', 'chapel hill', 'brookfield', 'pullenvale',
  'fig tree pocket', 'moggill', 'bellbowrie', 'jindalee', 'mount ommaney',
  'middle park', 'westlake', 'riverhills', 'sinnamon park', 'jamboree heights',
  'seventeen mile rocks', 'sumner', 'darra', 'wacol', 'richlands', 'inala',
  'durack', 'doolandella', 'forest lake', 'ipswich', 'goodna', 'springfield',
  'redbank', 'camira', 'gailes',
  // Brisbane East
  'wynnum', 'manly', 'lota', 'wakerley', 'gumdale', 'tingalpa', 'murarrie',
  'cannon hill', 'morningside', 'bulimba', 'balmoral', 'hawthorne', 'hemmant',
  'belmont', 'carina', 'carindale', 'camp hill', 'coorparoo', 'ascot', 'hamilton',
  'hendra', 'clayfield', 'eagle farm', 'pinkenba',
  // Brisbane South
  'woolloongabba', 'dutton park', 'annerley', 'yeronga', 'yeerongpilly', 'moorooka',
  'salisbury', 'rocklea', 'tennyson', 'sunnybank', 'sunnybank hills', 'runcorn',
  'calamvale', 'stretton', 'mount gravatt', 'upper mount gravatt', 'wishart',
  'mansfield', 'eight mile plains', 'acacia ridge', 'coopers plains', 'algester',
  'holland park', 'tarragindi', 'greenslopes', 'rochedale',
]);

// Brisbane North + Moreton Bay postcodes we accept.
const ALLOWED_POSTCODES = new Set([
  4011, 4012, 4013, 4014, 4017, 4018, 4019, 4020, 4021, 4022, // inner north + bayside + Redcliffe
  4030, 4031, 4032, 4034, 4035, 4036, 4037, // Chermside / Aspley / Albany Creek belt
  4051, 4053, 4054, 4055, // northwest (Stafford / Mitchelton / Ferny Grove / Arana Hills)
  4500, 4501, 4502, 4503, 4504, 4505, 4506, 4508, 4509, 4510, // Moreton Bay corridor
  4520, 4521, // Samford / Dayboro
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

  // 2. Reject South / West / East / CBD suburbs.
  if (suburb && EXCLUDED_SUBURBS.has(suburb)) {
    return { keep: false, reason: `excluded suburb (${suburb})` };
  }

  // 3. Must be a Brisbane North suburb OR an allowed northside/Moreton postcode.
  const suburbOk = suburb && BRISBANE_NORTH_SUBURBS.has(suburb);
  const postcodeOk = postcodeAllowed(postcode);
  if (!suburbOk && !postcodeOk) {
    return { keep: false, reason: `not Brisbane North (${suburb || 'unknown'} ${postcode || ''})`.trim() };
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

  console.log('Brisbane North tiler search — Google Places API (New)');
  console.log(`Queries: ${QUERIES.length} | Bias: -27.3878, 153.0186 @ 25km\n`);

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
