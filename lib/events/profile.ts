/**
 * Tiny cross-component "profile changed" signal — the app twin of
 * ~/bldesy-web/lib/events/profile.ts (which uses a window CustomEvent).
 *
 * Fire it after any flow that changes role-bearing state (subscription
 * activated, profile approved/paused, application cancelled) so the identity
 * provider (lib/auth-context.tsx) and any listening screen re-fetch.
 */
type Listener = () => void;

const listeners = new Set<Listener>();

export function dispatchProfileChanged(): void {
  for (const listener of Array.from(listeners)) {
    try {
      listener();
    } catch (e) {
      console.warn('profile-changed listener failed', e);
    }
  }
}

/** Subscribe; returns the cleanup function for your effect. */
export function onProfileChanged(callback: Listener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
