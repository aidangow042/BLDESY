// AUTO-SYNCED from ~/bldesy-web/lib/trade-colours.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * Single source of truth for trade colours.
 *
 * Hex values mirror the --color-trade-* tokens in app/globals.css — keep
 * both in sync. Use the raw hex (`getTradeColour`) inside Leaflet divIcon
 * SVG strings and Circle pathOptions where CSS var() doesn't resolve;
 * use `tradeColourVar` for DOM UI so dark-mode token overrides apply.
 */

export const TRADE_COLOURS_HEX: Record<string, string> = {
  builder: "#0D9B7A",
  plumber: "#3b82f6",
  electrician: "#e67e22",
  carpenter: "#22a55b",
  painter: "#e74c6f",
  landscaper: "#4ade80",
  roofer: "#eab308",
  tiler: "#a855f7",
  // Trades without a globals.css token yet — map palette only
  "civil-construction": "#5b6b7a",
  concreter: "#8a8075",
  handyman: "#0ea5e9",
  "solar-installer": "#f59e0b",
  "gas-fitter": "#f97316",
  "hot-water-systems": "#ef4444",
  plasterer: "#c084fc",
  fencer: "#84cc16",
  "pool-builder": "#06b6d4",
  bricklayer: "#b45309",
  locksmith: "#475569",
};

export const DEFAULT_TRADE_COLOUR = "#64748B";

/** Trade name or slug → hex colour. */
export function getTradeColour(trade: string): string {
  const key = trade.toLowerCase().replace(/\s+/g, "-");
  return TRADE_COLOURS_HEX[key] ?? DEFAULT_TRADE_COLOUR;
}

/** Trade name or slug → CSS var reference with hex fallback (dark-mode safe). */
export function tradeColourVar(trade: string): string {
  const key = trade.toLowerCase().replace(/\s+/g, "-");
  const hex = TRADE_COLOURS_HEX[key] ?? DEFAULT_TRADE_COLOUR;
  return `var(--color-trade-${key}, ${hex})`;
}
