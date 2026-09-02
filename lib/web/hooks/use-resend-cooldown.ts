// AUTO-SYNCED from ~/bldesy-web/lib/hooks/use-resend-cooldown.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

import { useEffect, useRef, useState } from "react";

/**
 * Client-side mirror of the server's SMS resend throttle (sms_max_frequency,
 * currently 60s in Supabase Auth config). Without this, tapping "resend"
 * inside the window round-trips to the server only to come back with a
 * generic "couldn't send a code" error — this shows a countdown instead and
 * disables the button until it's actually safe to send again.
 *
 * Purely a UX nicety: the server remains the real enforcement point.
 */
export function useResendCooldown(seconds = 60) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function start() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSecondsLeft(seconds);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  return { secondsLeft, start, canSend: secondsLeft === 0 };
}
