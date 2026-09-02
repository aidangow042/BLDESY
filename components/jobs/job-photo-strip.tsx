/**
 * JobPhotoStrip — horizontal thumbnails for a job's `photo_urls`, port of
 * ~/bldesy-web/components/jobs/job-card-photo.tsx (a broken image removes its
 * own tile rather than rendering an empty bordered box) plus the /jobs page's
 * "+N" overflow tile after the first three.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface JobPhotoStripProps {
  urls: string[] | null | undefined;
  /** Show at most this many tiles, then a "+N" tile (the /jobs page uses 3). */
  max?: number;
  /** Tile size — h-28 w-40 on job cards, h-24 w-36 on the /jobs page. */
  width?: number;
  height?: number;
}

export function JobPhotoStrip({ urls, max, width = 160, height = 112 }: JobPhotoStripProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  if (!urls || urls.length === 0) return null;
  const shown = max != null ? urls.slice(0, max) : urls;
  const overflow = urls.length - shown.length;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {shown.map((url, i) => (
        <JobCardPhoto key={`${url}-${i}`} url={url} index={i} width={width} height={height} borderColor={c.border} />
      ))}
      {overflow > 0 ? (
        <View
          style={[
            styles.overflow,
            { width: height, height, borderColor: c.border, backgroundColor: c.indigo + '0D' },
          ]}
        >
          <Text style={[styles.overflowText, { color: c.indigo }]}>+{overflow}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function JobCardPhoto({
  url,
  index,
  width,
  height,
  borderColor,
}: {
  url: string;
  index: number;
  width: number;
  height: number;
  borderColor: string;
}) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  return (
    <Image
      source={{ uri: url }}
      accessibilityLabel={`Photo ${index + 1}`}
      onError={() => setBroken(true)}
      contentFit="cover"
      style={[styles.photo, { width, height, borderColor }]}
    />
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.sm, paddingBottom: 4 },
  photo: { borderRadius: Radius.lg, borderWidth: 1 },
  overflow: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowText: { fontSize: 12, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
});
