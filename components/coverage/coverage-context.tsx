/**
 * Shared state for /for-homeowners — port of
 * ~/bldesy-web/components/coverage/coverage-context.tsx: the resolved suburb
 * search travels from the coverage explorer (search + CTA + map) down to the
 * bottom waitlist form so the suburb arrives prefilled.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export interface CoverageResult {
  /** What the visitor picked — shown in copy and prefilled into the form */
  label: string;
  /** Geometry key for the map pin (aliases resolve, e.g. Kings Cross → Potts Point) */
  geoName: string;
  /** FOUNDING_ZONES slug when covered, null when outside the launch area */
  zoneSlug: string | null;
  /** Best-effort postcode for the waitlist form prefill ("" when unknown) */
  postcode: string;
}

interface CoverageContextValue {
  result: CoverageResult | null;
  setResult: (result: CoverageResult | null) => void;
}

const CoverageContext = createContext<CoverageContextValue | null>(null);

export function CoverageProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<CoverageResult | null>(null);
  const value = useMemo(() => ({ result, setResult }), [result]);
  return <CoverageContext.Provider value={value}>{children}</CoverageContext.Provider>;
}

export function useCoverage(): CoverageContextValue {
  const ctx = useContext(CoverageContext);
  if (!ctx) throw new Error('useCoverage must be used inside <CoverageProvider>');
  return ctx;
}
