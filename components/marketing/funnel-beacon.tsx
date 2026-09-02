/**
 * FunnelBeacon — port of ~/bldesy-web/components/funnel-beacon.tsx: fires one
 * funnel event on mount (once-per-session events additionally dedupe inside
 * the tracker) and renders nothing. `path` is the screen's web-mirrored route,
 * which the tracker cannot infer on native.
 */
import { useEffect, useRef } from 'react';

import { trackFunnelEvent } from '@/lib/data/tracking';
import type { FunnelEventName } from '@/lib/web/funnel/events';

interface FunnelBeaconProps {
  event: FunnelEventName;
  meta?: Record<string, unknown>;
  path?: string;
}

export function FunnelBeacon({ event, meta, path }: FunnelBeaconProps) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackFunnelEvent(event, meta, path ? { path } : undefined);
  }, [event, meta, path]);
  return null;
}
