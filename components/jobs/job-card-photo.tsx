/**
 * One thumbnail on a portal job card. Jobs can carry photo_urls whose storage
 * object has since been deleted — a broken src renders as an empty bordered
 * box, so on error the tile removes itself instead.
 * Port of ~/bldesy-web/components/jobs/job-card-photo.tsx (h-28 w-40 rounded-xl).
 */
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';

import { Colors, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function JobCardPhoto({ url, index }: { url: string; index: number }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  return (
    <Image
      source={{ uri: url }}
      accessibilityLabel={`Photo ${index + 1}`}
      contentFit="cover"
      cachePolicy="disk"
      onError={() => setBroken(true)}
      style={[styles.photo, { borderColor: c.border }]}
    />
  );
}

const styles = StyleSheet.create({
  photo: { height: 112, width: 160, borderRadius: Radius.lg, borderWidth: 1 },
});
