/**
 * TeamMembers — ~/bldesy-web/components/builder/team-members.tsx: "Meet the
 * Team", a horizontal strip of avatar (or initials) + name + role.
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { initials, str } from '@/components/builder/profile-helpers';
import { ProfileSection } from '@/components/builder/profile-section';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { TeamMember } from '@/types';

export function TeamMembers({ members }: { members: TeamMember[] | null }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  if (!members || members.length === 0) return null;

  return (
    <ProfileSection title="Meet the Team">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip} style={styles.scroll}>
        {members.map((member, i) => {
          const name = str(member.name);
          const role = str(member.role);
          return (
            <View key={`${name}-${i}`} style={styles.member}>
              {member.photo_url ? (
                <Image source={{ uri: member.photo_url }} style={[styles.avatar, { borderColor: c.border }]} contentFit="cover" cachePolicy="memory-disk" accessibilityLabel={name} />
              ) : (
                <View style={[styles.avatar, styles.initials, { backgroundColor: c.primaryBg, borderColor: c.border }]}>
                  <Text style={[styles.initialsText, { color: c.primary }]}>{initials(name)}</Text>
                </View>
              )}
              <Text style={[styles.name, { color: c.textPrimary }]} numberOfLines={2}>
                {name}
              </Text>
              <Text style={[styles.role, { color: c.textSecondary }]} numberOfLines={2}>
                {role}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </ProfileSection>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginHorizontal: -Spacing.xl,
  },
  strip: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
    gap: Spacing.lg,
  },
  member: {
    alignItems: 'center',
    minWidth: 120,
    maxWidth: 140,
    gap: Spacing.sm,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
  },
  initials: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
  },
  name: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  role: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    textAlign: 'center',
    marginTop: -4,
  },
});
