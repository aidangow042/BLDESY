/**
 * The Enterprise Hub's shell palette — the website's `bg-[#111318]` sidebar /
 * mobile tab bar with its `white/…` text ladder (enterprise-shell.tsx). The
 * content area stays on the shared canvas/surface tokens; only the chrome is
 * dark.
 */
export const HUB_SHELL_BG = '#111318';
/** `bg-[#111318]/95` — the mobile tab bar. */
export const HUB_SHELL_BG_TRANSLUCENT = '#111318F2';
export const HUB_SHELL_BORDER = 'rgba(255,255,255,0.06)';
export const HUB_SHELL_ROW_BG = 'rgba(255,255,255,0.04)';
export const HUB_SHELL_TEXT_STRONG = 'rgba(255,255,255,0.9)';
export const HUB_SHELL_TEXT = 'rgba(255,255,255,0.7)';
export const HUB_SHELL_TEXT_DIM = 'rgba(255,255,255,0.5)';
export const HUB_SHELL_TEXT_MUTED = 'rgba(255,255,255,0.4)';
export const HUB_SHELL_HANDLE = 'rgba(255,255,255,0.2)';
export const HUB_SHELL_RING = 'rgba(255,255,255,0.1)';

/** `bg-indigo/15` and `bg-indigo/[0.08]` on the dark shell. */
export function indigoTint(indigo: string, alpha: '15' | '08' | '10' | '05' | '20'): string {
  const hex: Record<typeof alpha, string> = { '05': '0D', '08': '14', '10': '1A', '15': '26', '20': '33' };
  return indigo + hex[alpha];
}
