// AUTO-SYNCED from ~/bldesy-web/lib/availability.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

import type { AvailabilityStatus } from "@/types";

export interface AvailabilityInfo {
  label: string;
  dot: string;
  bg: string;
  text: string;
  response: string;
}

const config: Record<AvailabilityStatus, AvailabilityInfo> = {
  available: {
    label: "Available",
    dot: "bg-success",
    bg: "bg-success-bg",
    text: "text-success",
    response: "Same day",
  },
  limited: {
    label: "Limited",
    dot: "bg-warning",
    bg: "bg-warning/10",
    text: "text-warning",
    response: "This week",
  },
  unavailable: {
    label: "Unavailable",
    dot: "bg-error",
    bg: "bg-error/10",
    text: "text-error",
    response: "Unavailable",
  },
};

export function getAvailability(status: string): AvailabilityInfo {
  return config[status as AvailabilityStatus] ?? config.available;
}
