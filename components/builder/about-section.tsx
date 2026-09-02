/**
 * AboutSection — ~/bldesy-web/components/builder/about-section.tsx. Nothing
 * when the bio is empty (or view-hidden — the view NULLs it).
 */
import { StyleSheet, Text } from 'react-native';

import { ProfileSection } from '@/components/builder/profile-section';
import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { BuilderWithProfile } from '@/types';

export function AboutSection({ builder }: { builder: Pick<BuilderWithProfile, 'bio'> }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  if (!builder.bio) return null;
  return (
    <ProfileSection title="About">
      <Text style={[styles.bio, { color: c.textSecondary }]}>{builder.bio}</Text>
    </ProfileSection>
  );
}

const styles = StyleSheet.create({
  bio: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 22,
  },
});
