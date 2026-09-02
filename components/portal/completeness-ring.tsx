/**
 * CompletenessRing — the dashboard welcome bar's profile-completeness ring
 * (`~/bldesy-web/app/portal/page.tsx`, "Profile completeness ring"): a 44px
 * SVG ring, r=18, stroke 3, primary arc over the border track, "{n}%" centred.
 */
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const SIZE = 44;
const RADIUS = 18;
const STROKE = 3;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CompletenessRing({ percent }: { percent: number }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Profile ${clamped}% complete`}
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
      style={styles.wrap}
    >
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke={c.border} strokeWidth={STROKE} />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={c.primary}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
      <Text style={[styles.label, { color: c.textPrimary }]}>{clamped}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
});
