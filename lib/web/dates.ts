// AUTO-SYNCED from ~/bldesy-web/lib/dates.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * Plain-string date helpers for the availability system.
 *
 * All dates are "YYYY-MM-DD" strings compared lexicographically — no Date
 * round-trips, no UTC surprises. Never use toISOString() to derive a day
 * string from a local Date: it shifts across midnight for UTC+ timezones.
 */

export interface MonthRef {
  year: number;
  /** 1–12 (human month, not the Date 0-index). */
  month: number;
}

// Formatter construction dominates Intl formatting cost (the calendar builds
// ~30 aria-labels per render) — build each formatter once at module load.
const SYDNEY_YMD_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Australia/Sydney",
});
const MONTH_LABEL_FORMAT = new Intl.DateTimeFormat("en-AU", {
  month: "long",
  year: "numeric",
});
const DAY_SHORT_FORMAT = new Intl.DateTimeFormat("en-AU", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const DAY_SHORT_WITH_YEAR_FORMAT = new Intl.DateTimeFormat("en-AU", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const DAY_LONG_FORMAT = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local calendar day of a Date as "YYYY-MM-DD" (no UTC shift). */
export function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Today's calendar day in Sydney, as "YYYY-MM-DD". Used server-side so the
 * public calendar renders the same "today" for every visitor. Day-granularity
 * makes the 2–3h Perth offset immaterial for an AU-only marketplace.
 */
export function todayYmdSydney(): string {
  // en-CA formats as YYYY-MM-DD.
  return SYDNEY_YMD_FORMAT.format(new Date());
}

/** "2026-07-15" → { year: 2026, month: 7 } (day dropped). */
export function monthOfYmd(ymd: string): MonthRef {
  const [y, m] = ymd.split("-").map(Number);
  return { year: y, month: m };
}

/** "2026-07" key for a month — sortable and comparable lexicographically. */
export function monthKey(ref: MonthRef): string {
  return `${ref.year}-${pad2(ref.month)}`;
}

export function addMonths(ref: MonthRef, delta: number): MonthRef {
  const zeroBased = ref.year * 12 + (ref.month - 1) + delta;
  return { year: Math.floor(zeroBased / 12), month: (zeroBased % 12) + 1 };
}

export function daysInMonth(ref: MonthRef): number {
  return new Date(ref.year, ref.month, 0).getDate();
}

/** First day of the month as "YYYY-MM-01" — handy for pruning cutoffs. */
export function monthStartYmd(ref: MonthRef): string {
  return `${ref.year}-${pad2(ref.month)}-01`;
}

/**
 * Cells for a Monday-first month grid: leading nulls for the offset, then
 * every day as "YYYY-MM-DD", padded with nulls to a fixed 42 (6 rows × 7) so
 * the calendar never changes height between months.
 */
export function monthGridDays(ref: MonthRef): (string | null)[] {
  const lead = (new Date(ref.year, ref.month - 1, 1).getDay() + 6) % 7;
  const cells: (string | null)[] = Array(lead).fill(null);
  const total = daysInMonth(ref);
  for (let day = 1; day <= total; day++) {
    cells.push(`${ref.year}-${pad2(ref.month)}-${pad2(day)}`);
  }
  while (cells.length < 42) cells.push(null);
  return cells;
}

export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return ymdLocal(new Date(y, m - 1, d + days));
}

function toLocalDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "July 2026" — the calendar's month heading. */
export function monthLabel(ref: MonthRef): string {
  return MONTH_LABEL_FORMAT.format(new Date(ref.year, ref.month - 1, 1));
}

/** "Mon 14 Aug" (year appended only when it differs from `relativeToYmd`). */
export function formatYmdShort(ymd: string, relativeToYmd?: string): string {
  const withYear = relativeToYmd ? ymd.slice(0, 4) !== relativeToYmd.slice(0, 4) : true;
  const format = withYear ? DAY_SHORT_WITH_YEAR_FORMAT : DAY_SHORT_FORMAT;
  return format.format(toLocalDate(ymd));
}

/** "14 July 2026" — full date for aria-labels and tooltips. */
export function formatYmdLong(ymd: string): string {
  return DAY_LONG_FORMAT.format(toLocalDate(ymd));
}
