/**
 * JobCardImage — the jobs-list card hero: a swipeable photo carousel with
 * dots + a photo-count chip, or the indigo gradient placeholder when the post
 * has no photos (~/bldesy-web/app/enterprise/jobs/page.tsx JobCardImage).
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { FontFamily, Radius } from '@/constants/theme';

import { useHubTheme } from './hub-primitives';

export function JobCardImage({ photos, title, height = 180 }: { photos: string[] | null; title: string; height?: number }) {
  const c = useHubTheme();
  const [idx, setIdx] = useState(0);
  const [width, setWidth] = useState(0);
  const images = photos ?? [];

  if (images.length === 0) {
    return (
      <LinearGradient
        colors={[c.indigoDark, c.indigoLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.placeholder, { height }]}
      >
        <Ionicons name="briefcase-outline" size={48} color="rgba(255,255,255,0.2)" />
      </LinearGradient>
    );
  }

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!width) return;
    setIdx(Math.round(e.nativeEvent.contentOffset.x / width));
  }

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        scrollEnabled={images.length > 1}
        accessibilityLabel={`${title} photos`}
      >
        {images.map((url, i) => (
          <Image
            key={`${url}-${i}`}
            source={{ uri: url }}
            contentFit="cover"
            style={{ width: width || 1, height }}
            accessibilityLabel={`${title} photo ${i + 1}`}
          />
        ))}
      </ScrollView>

      {images.length > 1 ? (
        <>
          <View style={styles.dots} pointerEvents="none">
            {images.map((_, i) => (
              <View key={i} style={[styles.dot, { backgroundColor: i === idx ? '#ffffff' : 'rgba(255,255,255,0.4)' }]} />
            ))}
          </View>
          <View style={styles.count} pointerEvents="none">
            <Ionicons name="images-outline" size={12} color="#ffffff" />
            <Text style={styles.countLabel}>{images.length}</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  count: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countLabel: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
});
