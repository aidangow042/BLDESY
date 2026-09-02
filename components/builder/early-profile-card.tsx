/**
 * EarlyProfileCard — the designed "early profile" card from
 * ~/bldesy-web/components/builder/builder-profile-view.tsx that keeps a sparse
 * profile selling when fewer than two main-column sections have content.
 */
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ProfileSection } from '@/components/builder/profile-section';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function EarlyProfileCard({ businessName }: { businessName: string }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <ProfileSection title="Early profile">
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: c.primaryBg }]}>
          <Ionicons name="shield-checkmark-outline" size={20} color={c.primary} />
        </View>
        <Text style={[styles.copy, { color: c.textSecondary }]}>
          {businessName} is new to BLDESY — the credentials above are independently verified. Message them for
          photos, quotes and timing.
        </Text>
      </View>
    </ProfileSection>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 22,
  },
});
