/**
 * BusinessDetails — the sidebar card from ~/bldesy-web/components/builder/builder-profile-view.tsx:
 * Trade, Location "(50km radius)", Primary areas (describeCoverage), Also covers
 * (describeCanCover) and Time to Reply (declared → "Typically …").
 */
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { businessDetailsFor } from '@/components/builder/profile-helpers';
import { ProfileSection } from '@/components/builder/profile-section';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { BuilderWithProfile } from '@/types';

export function BusinessDetails({ builder }: { builder: BuilderWithProfile }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const details = businessDetailsFor(builder);
  if (details.length === 0) return null;

  return (
    <ProfileSection title="Business Details" size="sm">
      <View style={styles.rows}>
        {details.map(({ label, value, icon }) => (
          <View key={label} style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: c.primaryBg }]}>
              <Ionicons name={icon} size={16} color={c.primary} />
            </View>
            <View style={styles.text}>
              <Text style={[styles.label, { color: c.textSecondary }]}>{label.toUpperCase()}</Text>
              <Text style={[styles.value, { color: c.textPrimary }]}>{value}</Text>
            </View>
          </View>
        ))}
      </View>
    </ProfileSection>
  );
}

const styles = StyleSheet.create({
  rows: {
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.6,
  },
  value: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 20,
  },
});
