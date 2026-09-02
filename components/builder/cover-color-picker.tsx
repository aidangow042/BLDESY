/**
 * CoverColorPicker — a dependency-free colour picker sheet for the builder's
 * cover banner. Lets a builder pick a solid banner colour as an alternative to
 * uploading a photo (handy when their photo looks bad cropped to the strip).
 *
 * Built without any native colour-picker library so it works over hot-reload:
 *   • Curated preset swatches (one-tap, always tasteful)
 *   • A hue spectrum bar (drag to pick any colour)
 *   • A shade spectrum bar (drag to lighten/darken the chosen hue)
 * Uses the RN touch-responder system (no gesture lib) and HSL↔hex maths.
 */
import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Curated, banner-friendly presets (brand teal first).
const SWATCHES = [
  '#0D9B7A', '#0F766E', '#115E59', '#1E3A8A', '#2563EB', '#0EA5E9',
  '#7C3AED', '#9333EA', '#DB2777', '#DC2626', '#EA580C', '#D97706',
  '#CA8A04', '#16A34A', '#475569', '#1F2937',
];

// Fixed saturation + a constrained lightness band keeps custom picks tasteful
// (no near-black / blown-out white banners).
const SAT = 0.62;
const L_MIN = 0.20;
const L_MAX = 0.80;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const m = hex.replace('#', '');
  if (m.length < 6) return { h: 168, s: SAT, l: 0.5 };
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

// Lighten/darken a #RRGGBB hex by `amt` per channel — mirrors the website's
// profile-header shadeHex so the edit-profile preview matches the live banner.
export function shadeHex(hex: string, amt: number): string {
  const m = hex.replace('#', '');
  if (m.length < 6) return hex;
  const ch = (i: number) => {
    const v = parseInt(m.slice(i, i + 2), 16) + amt;
    return Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
  };
  return `#${ch(0)}${ch(2)}${ch(4)}`;
}

/**
 * The public banner's 135° gradient stops (web `bannerGradient(hex)`:
 * `linear-gradient(135deg, +22 0%, hex 50%, -30 100%)`) for an expo LinearGradient.
 */
export function bannerGradientColors(hex: string): [string, string, string] {
  return [shadeHex(hex, 22), hex, shadeHex(hex, -30)];
}

/** A draggable spectrum bar (hue or shade). `pos` is 0–1 along the bar. */
function SpectrumBar({
  gradient,
  pos,
  onPos,
}: {
  gradient: readonly [string, string, ...string[]];
  pos: number;
  onPos: (p: number) => void;
}) {
  const [w, setW] = useState(0);
  function touch(e: GestureResponderEvent) {
    if (w > 0) onPos(clamp(e.nativeEvent.locationX, 0, w) / w);
  }
  return (
    <View
      style={styles.bar}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={touch}
      onResponderMove={touch}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.thumb, { left: clamp(pos * w - 12, 0, Math.max(0, w - 24)) }]} />
    </View>
  );
}

interface CoverColorPickerProps {
  visible: boolean;
  initialColor: string | null;
  onCancel: () => void;
  onDone: (hex: string) => void;
}

export function CoverColorPicker({ visible, initialColor, onCancel, onDone }: CoverColorPickerProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();

  const seed = hexToHsl(initialColor ?? '#0D9B7A');
  const [hue, setHue] = useState(seed.h);
  // Shade position 0–1 → lightness L_MIN..L_MAX.
  const [shade, setShade] = useState(clamp((seed.l - L_MIN) / (L_MAX - L_MIN), 0, 1));

  const lightness = L_MIN + shade * (L_MAX - L_MIN);
  const current = hslToHex(hue, SAT, lightness);

  function pickSwatch(hex: string) {
    const hsl = hexToHsl(hex);
    setHue(hsl.h);
    setShade(clamp((hsl.l - L_MIN) / (L_MAX - L_MIN), 0, 1));
  }

  const hueGradient: [string, string, ...string[]] = [
    '#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000',
  ];
  const shadeGradient: [string, string, ...string[]] = [
    hslToHex(hue, SAT, L_MIN),
    hslToHex(hue, SAT, (L_MIN + L_MAX) / 2),
    hslToHex(hue, SAT, L_MAX),
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <View style={styles.modalRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + Spacing.md }]}>
          <View style={[styles.grabber, { backgroundColor: c.border }]} />

          <View style={styles.header}>
            <Text style={[styles.title, { color: c.textPrimary }]}>Banner colour</Text>
            <Pressable onPress={onCancel} hitSlop={10} accessibilityLabel="Close">
              <MaterialIcons name="close" size={22} color={c.textSecondary} />
            </Pressable>
          </View>

          {/* Live preview */}
          <View style={[styles.preview, { backgroundColor: current }]}>
            <Text style={styles.previewText}>{current}</Text>
          </View>

          <Text style={[styles.label, { color: c.textSecondary }]}>HUE</Text>
          <SpectrumBar gradient={hueGradient} pos={hue / 360} onPos={(p) => setHue(p * 360)} />

          <Text style={[styles.label, { color: c.textSecondary }]}>SHADE</Text>
          <SpectrumBar gradient={shadeGradient} pos={shade} onPos={setShade} />

          <Text style={[styles.label, { color: c.textSecondary }]}>PRESETS</Text>
          <View style={styles.swatchWrap}>
            {SWATCHES.map((hex) => {
              const active = hex.toUpperCase() === current.toUpperCase();
              return (
                <Pressable
                  key={hex}
                  onPress={() => pickSwatch(hex)}
                  style={[styles.swatch, { backgroundColor: hex, borderColor: active ? c.textPrimary : 'transparent' }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Colour ${hex}`}
                >
                  {active ? <MaterialIcons name="check" size={16} color="#fff" /> : null}
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={() => onDone(current)} style={[styles.doneBtn, { backgroundColor: c.primary }]}>
            <Text style={styles.doneText}>Use this colour</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: Spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  title: { fontSize: 17, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  preview: {
    height: 64,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  previewText: {
    color: '#fff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  label: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: Spacing.sm,
  },
  bar: {
    height: 28,
    borderRadius: Radius.full,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  thumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: '#fff',
    top: 2,
  },
  swatchWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtn: {
    height: 50,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  doneText: { color: '#fff', fontSize: 16, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
});
