/**
 * Role-aware empty inbox — port of ~/bldesy-web/components/messages/empty-inbox.tsx.
 * The shared inbox serves both sides, and a tradie must never see homeowner
 * copy ("message a builder…") or a Browse-Builders CTA.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { zoneIsLive } from '@/lib/launch-flags';
import { ROUTES } from '@/lib/routes';

export function EmptyInbox({ role = 'customer' }: { role?: 'tradie' | 'customer' }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const tradie = role === 'tradie';
  const waitlist = !zoneIsLive('home_jobs');

  return (
    <View style={styles.wrap}>
      <View style={styles.illustration}>
        <LinearGradient
          colors={[c.primary + '1A', c.primaryDark + '0D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.disc}
        >
          <MaterialIcons name="mail-outline" size={40} color={c.primary} />
        </LinearGradient>
        <View style={[styles.dotLg, { backgroundColor: c.primary + '33' }]} />
        <View style={[styles.dotSm, { backgroundColor: c.primary + '1A' }]} />
      </View>

      <Text style={[styles.title, { color: c.textPrimary }]} accessibilityRole="header">
        No messages yet
      </Text>
      <Text style={[styles.body, { color: c.textSecondary }]}>
        {tradie
          ? waitlist
            ? 'Homeowner enquiries will land here at launch — make sure your alerts are on so you never miss one.'
            : 'When a homeowner messages you, the conversation lands here.'
          : 'Start a conversation by messaging a builder or company from their profile page.'}
      </Text>
      <Pressable
        onPress={() => router.push(tradie ? ROUTES.portalSettings : ROUTES.search)}
        style={[styles.cta, { backgroundColor: c.primary }]}
        accessibilityRole="button"
      >
        <Text style={styles.ctaText}>{tradie ? 'Check notification settings' : 'Browse Builders'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['6xl'], paddingHorizontal: Spacing['2xl'] },
  illustration: { position: 'relative', marginBottom: Spacing.xl },
  disc: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  dotLg: { position: 'absolute', top: -4, right: -4, width: 12, height: 12, borderRadius: 6 },
  dotSm: { position: 'absolute', bottom: -8, left: -8, width: 8, height: 8, borderRadius: 4 },
  title: { fontSize: 18, lineHeight: 28, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  body: {
    marginTop: 6,
    maxWidth: 260,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FontFamily.body,
    textAlign: 'center',
  },
  cta: {
    marginTop: Spacing.lg,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  ctaText: { color: '#fff', fontSize: 14, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
});
