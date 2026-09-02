/**
 * The feature-tile gradients from ~/bldesy-web/components/ui/feature-shader-cards.tsx
 * (Tailwind `from-[hsl(…)] via-[hsl(…)] to-[hsl(…)]` stops), resolved to hex for
 * expo-linear-gradient. Pure so the HSL→hex conversion is unit-tested.
 */

export interface Hsl {
  h: number;
  /** 0–100 */
  s: number;
  /** 0–100 */
  l: number;
}

/** CSS hsl(h, s%, l%) → #rrggbb. */
export function hslToHex({ h, s, l }: Hsl): string {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = light - c / 2;
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

type Stops = readonly [Hsl, Hsl, Hsl];

/** feature-shader-cards.tsx `gradients`, in order — tiles cycle through them by index. */
const TILE_GRADIENTS: readonly Stops[] = [
  [{ h: 164, s: 85, l: 20 }, { h: 164, s: 85, l: 33 }, { h: 160, s: 90, l: 25 }],
  [{ h: 175, s: 80, l: 18 }, { h: 217, s: 33, l: 17 }, { h: 175, s: 70, l: 26 }],
  [{ h: 217, s: 33, l: 12 }, { h: 215, s: 25, l: 22 }, { h: 217, s: 33, l: 17 }],
  [{ h: 164, s: 85, l: 18 }, { h: 164, s: 80, l: 28 }, { h: 160, s: 90, l: 30 }],
  [{ h: 175, s: 75, l: 15 }, { h: 175, s: 80, l: 22 }, { h: 217, s: 33, l: 20 }],
  [{ h: 215, s: 25, l: 18 }, { h: 217, s: 33, l: 25 }, { h: 215, s: 20, l: 30 }],
  [{ h: 164, s: 85, l: 22 }, { h: 164, s: 80, l: 30 }, { h: 160, s: 85, l: 35 }],
  [{ h: 175, s: 80, l: 20 }, { h: 217, s: 33, l: 15 }, { h: 175, s: 75, l: 28 }],
];

export const TILE_GRADIENT_HEX: readonly [string, string, string][] = TILE_GRADIENTS.map(
  ([a, b, c]) => [hslToHex(a), hslToHex(b), hslToHex(c)],
);

/** Gradient stops for tile `index` (cycles like `gradients[index % gradients.length]`). */
export function tileGradient(index: number): [string, string, string] {
  return TILE_GRADIENT_HEX[index % TILE_GRADIENT_HEX.length];
}
