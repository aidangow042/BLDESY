// COPIED VERBATIM from ~/bldesy-web/lib/waitlist/draw-prize.ts (not yet in scripts/sync-web-libs.mjs).
// Pure and client-safe. Do not edit below this header — change the website original and re-copy.
// TODO: add lib/waitlist/draw-prize.ts to the sync script and import from @/lib/web instead.

/**
 * THE HOMEOWNER DRAW — prize maths and the copy that describes it.
 *
 * Pure and CLIENT-SAFE: no "server-only", no admin client, no node imports.
 * WaitlistForm is a client component and imports this; adding either would break
 * the build. The live count lives in draw-prize-server.ts.
 *
 * ── The change, and why it ships dark ───────────────────────────────────────
 * Today: a fixed $250 Bunnings gift card, answer-gated, drawn once.
 * Next:  $100 base + $5 per job NAMED that month, capped at $300, drawn monthly
 *        on the 1st, with entries rolling over until an entrant wins.
 *
 * The prize grows on NAMED JOBS, never on signups — a signup who skips the
 * question must not move the prize, because the whole point is to pull the
 * zone_named_jobs_bar up. It is also what finally makes a MATE- code worth
 * sharing: referring raises the prize for everyone, not just your own odds.
 *
 * ⚠️ DRAW_LIVE IS FALSE AND MUST STAY FALSE until NSW Fair Trading is
 * re-verified. The permit position recorded in app/legal/draw-terms (settled
 * 2026-07-31, scoped to a single fixed $250 card) says to re-check if the pool
 * passes $10,000 OR THE ENTRY MECHANICS CHANGE MATERIALLY. Monthly recurring
 * draws plus roll-over entries is a material change to entry mechanics,
 * independently of the prize value — so that trigger has already fired.
 *
 * While false, every surface renders exactly today's fixed-$250 copy and the
 * legacy mechanics keep running. Flipping it to true switches the maths, the
 * copy and the terms page together, in one line. Nothing else needs editing.
 * A code constant rather than a DB flag, matching lib/prelaunch.ts and
 * lib/waitlist-mode.ts: launch-shaped switches are a one-line commit here, and a
 * DB read on a client-facing path buys instant-off we do not need for a
 * promotion that retires once.
 */

/** The fixed card that is running today, and the value all copy shows while DRAW_LIVE is false. */
export const LEGACY_PRIZE_AUD = 250;

export const DRAW_PRIZE_BASE = 100;
export const DRAW_PRIZE_PER_JOB = 5;
export const DRAW_PRIZE_CAP = 300;

/** ⚠️ Blocked on the NSW Fair Trading re-check — see the header. */
export const DRAW_LIVE = false;

/**
 * The escalating prize for a given count of jobs named this month.
 * Defensive because the count comes from a DB aggregate: a negative, NaN or
 * fractional value must degrade to the base, never to the cap. Understating the
 * prize is honest; overstating it is not.
 */
export function prizeForNamedJobs(namedJobs: number): number {
  if (!Number.isFinite(namedJobs) || namedJobs <= 0) return DRAW_PRIZE_BASE;
  const grown = DRAW_PRIZE_BASE + DRAW_PRIZE_PER_JOB * Math.floor(namedJobs);
  return Math.min(grown, DRAW_PRIZE_CAP);
}

/**
 * The prize to SHOW, given this month's named-job count. The single place the
 * dark-launch branch is taken — every surface calls this and none of them needs
 * to know whether the new mechanics are on.
 */
export function drawPrizeAud(namedJobsThisMonth: number): number {
  return DRAW_LIVE ? prizeForNamedJobs(namedJobsThisMonth) : LEGACY_PRIZE_AUD;
}

/** "$250" — whole dollars, no cents; the prize is always a round number. */
export function formatDrawPrize(dollars: number): string {
  return `$${Math.round(dollars)}`;
}

// en-CA gives YYYY-MM-DD, and the Sydney zone is the point: "drawn on the 1st"
// is a Sydney date. A UTC month boundary is 10–11 hours wrong, which on the 1st
// of the month mis-counts real entries. Same idiom as lib/dates.ts.
const SYDNEY_YMD = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Australia/Sydney",
});
const SYDNEY_MONTH_LABEL = new Intl.DateTimeFormat("en-AU", {
  timeZone: "Australia/Sydney",
  month: "long",
});

export interface DrawMonth {
  /** Inclusive lower bound, ISO instant. */
  startIso: string;
  /** Exclusive upper bound, ISO instant. */
  endIso: string;
  /** "August" — for copy like "this month's draw". */
  label: string;
}

/**
 * The Sydney calendar month containing `now`, as an instant range suitable for
 * a timestamptz filter. Computed from the Sydney Y-M rather than Date maths so
 * it can't drift across the UTC boundary; the offset is resolved by asking for
 * the Sydney wall-clock of the month's first instant.
 */
export function drawMonthWindow(now: Date): DrawMonth {
  const [year, month] = SYDNEY_YMD.format(now).split("-").map(Number);
  const start = sydneyMonthStart(year, month);
  const [nextYear, nextMonth] = month === 12 ? [year + 1, 1] : [year, month + 1];
  const end = sydneyMonthStart(nextYear, nextMonth);
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    label: SYDNEY_MONTH_LABEL.format(start),
  };
}

/**
 * The instant of 00:00 on the 1st, Sydney time.
 *
 * Sydney is UTC+10 (AEST) or +11 (AEDT), so the offset has to be measured, not
 * assumed. TWO passes, and the second one is load-bearing: DST starts at 2am on
 * the first Sunday in October, so when the 1st IS that Sunday, the offset at
 * 00:00 UTC (Sydney 11am, already AEDT) is not the offset in force at Sydney
 * midnight (still AEST). One pass lands an hour early on exactly that day; the
 * second re-measures at the corrected instant and converges.
 */
function sydneyMonthStart(year: number, month: number): Date {
  const naive = Date.UTC(year, month - 1, 1, 0, 0, 0);
  const firstPass = new Date(naive - offsetMs(new Date(naive)));
  return new Date(naive - offsetMs(firstPass));
}

/** Sydney's UTC offset in ms at a given instant. */
function offsetMs(at: Date): number {
  const sydney = new Date(
    at.toLocaleString("en-US", { timeZone: "Australia/Sydney" }),
  );
  const utc = new Date(at.toLocaleString("en-US", { timeZone: "UTC" }));
  return sydney.getTime() - utc.getTime();
}

/**
 * Copy fragments that must survive staleness, for surfaces that CANNOT read the
 * live number (prerendered pages, emails composed from constants). Stating the
 * floor and the rule is always true; stating a figure that might have grown is
 * not. Constants, so they can never be wrong.
 */
/**
 * ⚠️ ALWAYS THE CEILING, NEVER A LIVE FIGURE.
 *
 * The escalating prize is variable, and a variable prize is the part of these
 * mechanics most exposed to "you advertised a value you didn't award". Quoting
 * the maximum is the conservative framing: you cannot understate a prize you
 * always describe at its ceiling, and every entrant sees the same number no
 * matter which surface or hour they arrive on.
 *
 * It costs the escalation some drama — nobody sees "you just pushed it to $180"
 * — and that is the deliberate trade. The mechanic still works: naming a job
 * still grows the real card, it just isn't quoted live.
 */
export const DRAW_PRIZE_FLOOR_COPY = DRAW_LIVE
  ? "a Bunnings gift card worth up to $300"
  : "a $250 Bunnings gift card";

export const DRAW_SHORT_LABEL = DRAW_LIVE
  ? "this month's Bunnings draw"
  : "the $250 Bunnings draw";

/**
 * ── The copy vocabulary ─────────────────────────────────────────────────────
 * Every user-facing mention of the draw goes through one of these, so the whole
 * site switches on the DRAW_LIVE flag together and no surface is left promising
 * a dead figure. While the flag is false each one returns exactly today's
 * wording, byte for byte — that is what makes shipping this dark safe.
 *
 * `prize` is the live figure where a surface can read one; omitted, it falls
 * back to the floor, which is always true if sometimes understated.
 */

/** "the $250 Bunnings draw" / "this month's Bunnings draw". */
export const DRAW_NAME = DRAW_SHORT_LABEL;

/** "$250 Bunnings gift card" / "$175 Bunnings gift card" — needs a figure. */
export function drawCardPhrase(prize?: number): string {
  // The live figure is deliberately ignored while the escalating draw is on —
  // see DRAW_PRIZE_FLOOR_COPY. The parameter stays so call sites don't churn.
  if (DRAW_LIVE) return `Bunnings gift card worth up to ${formatDrawPrize(DRAW_PRIZE_CAP)}`;
  return `${formatDrawPrize(prize ?? LEGACY_PRIZE_AUD)} Bunnings gift card`;
}

/** The heading over the entry question. */
export function drawEntryHeading(prize?: number): string {
  return DRAW_LIVE
    ? "What do you actually need done?"
    : `Enter the ${formatDrawPrize(prize ?? LEGACY_PRIZE_AUD)} Bunnings draw`;
}

/** The submit button on the entry question. */
export const DRAW_ENTRY_CTA = DRAW_LIVE
  ? "Send it through"
  : `Enter the ${formatDrawPrize(LEGACY_PRIZE_AUD)} draw`;

/**
 * The line under step 1 explaining what the question buys them.
 *
 * The reframe is the point once the mechanics change: the job question is the
 * ASK and the draw is the THANKS, because a named job is what pulls a zone's
 * demand bar up. Today's copy leads with the prize, which is honest for a fixed
 * card but would undersell an escalating one.
 */
export function drawStep1Line(prize?: number): string {
  return DRAW_LIVE
    ? `Next we'll ask one thing: the job you actually need done. That's how we know which tradies to line up in your suburb first — and it puts you in ${DRAW_NAME}, for a Bunnings gift card worth up to ${formatDrawPrize(DRAW_PRIZE_CAP)}.`
    : `One quick question after you join enters you in the draw for a ${drawCardPhrase(prize)}.`;
}

/** Link text to the terms page. */
export const DRAW_TERMS_LINK_TEXT = DRAW_LIVE ? "draw terms" : "$250 draw terms";

/**
 * A bare noun phrase for MESSAGES — email subjects, SMS bodies, nurture copy.
 *
 * Messages deliberately never carry a live figure: an email is read hours or
 * days after it is composed, so a number baked at send time is stale by the time
 * anyone sees it, and an overstated prize is the one failure mode that actually
 * costs trust. The name is true at every value.
 *
 * Kept short because two SMS bodies are hard-capped at one GSM segment by
 * __tests__/waitlist-confirm-sms.test.ts and __tests__/homeowner-nurture.test.ts
 * (160 chars AFTER the 20-char {optout} expansion).
 */
export const DRAW_SMS_LABEL = DRAW_LIVE
  ? "monthly Bunnings draw"
  : "$250 Bunnings draw";

/** WhatYouGet tile title — static surface, so no live figure. */
export const DRAW_TILE_TITLE = DRAW_LIVE
  ? "monthly Bunnings draw"
  : "$250 Bunnings draw";

/** The /waitlist benefit pill. Must stay short enough for one line at sm+. */
export const DRAW_PILL_LABEL = DRAW_LIVE ? "monthly draw" : "$250 draw";

/**
 * WHO CAN ENTER — stated in the fine print beside every draw mention.
 *
 * NSW-only, deliberately. Entry was open to all Australian residents, which put
 * the promotion under eight sets of state and territory rules for an audience
 * that cannot use the product: BLDESY launches inner Sydney first, so an entrant
 * in Perth is worth nothing pre-launch. Narrowing to one jurisdiction removes
 * seven regulators at almost no funnel cost.
 *
 * Changed while the waitlist had ZERO real entrants — every row was our own
 * testing — so nobody was retrospectively excluded from a draw they had already
 * entered. That window closes the moment a real person joins, which is why this
 * landed before launch rather than after.
 *
 * ⚠️ Joining the WAITLIST is still open to anyone, anywhere. This is the DRAW's
 * eligibility only. Do not use it to gate signups.
 */
export const DRAW_ELIGIBILITY_SHORT = "NSW residents 18+";

/** Page/document title for the terms. */
export const DRAW_TERMS_TITLE = DRAW_LIVE
  ? "Monthly Bunnings Gift Card Draw — Terms & Conditions"
  : "$250 Bunnings Gift Card Draw — Terms & Conditions";
