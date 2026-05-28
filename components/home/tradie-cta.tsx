/**
 * TradieCta — dark-gradient call-to-action section for tradies, sitting at
 * the bottom of the homepage. Mirrors `~/bldesy-web/components/home/tradie-cta.tsx`.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { Button } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const COMPARISONS = [
  { vs: 'Hipages',       point: 'No per-lead fees. Flat subscription — keep more of what you earn.' },
  { vs: 'Airtasker',     point: 'Purpose-built for licensed trades, not odd jobs and errands.' },
  { vs: 'Google Search', point: 'Verified profiles, real reviews, and AI-powered matching.' },
  { vs: 'Word of Mouth', point: 'Search by trade, location & urgency. See credentials before you call.' },
];

export function TradieCta() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();

  return (
    <LinearGradient
      colors={['#0a0a1a', '#0f1a1a', '#0a2018']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.section}
    >
      <View style={styles.pitch}>
        <Text style={styles.heading}>Are you a tradie?</Text>
        <Text style={styles.subhead}>
          No commission. No bidding wars. Just customers who need you.
        </Text>
        <Button
          variant="primary"
          size="lg"
          onPress={() => router.push('/builder-signup' as any)}
        >
          Join BLDESY!
        </Button>
      </View>

      <View style={styles.grid}>
        {COMPARISONS.map((item) => (
          <View key={item.vs} style={styles.card}>
            <Text style={styles.vsBadge}>vs {item.vs}</Text>
            <Text style={styles.cardText}>{item.point}</Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: Spacing['5xl'],
    paddingHorizontal: Spacing.lg,
    gap: Spacing['3xl'],
  },
  pitch: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  heading: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 28,
    color: '#ffffff',
    textAlign: 'center',
  },
  subhead: {
    fontFamily: FontFamily.body,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    maxWidth: 320,
  },
  grid: {
    gap: Spacing.md,
  },
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  vsBadge: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.45)',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  cardText: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.75)',
  },
});
