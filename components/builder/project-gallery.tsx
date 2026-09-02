/**
 * ProjectGallery — ~/bldesy-web/components/builder/project-gallery.tsx: "Our
 * Work". Per project: the before/after comparison slider, the media grid
 * (photos + video posters — zero video bytes until the visitor presses play),
 * title, description, cost-range and "Before & After" pills, testimonial. A
 * full-screen lightbox pages through the media; videos play there via
 * expo-video with native controls.
 */
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import Ionicons from '@expo/vector-icons/Ionicons';

import { getBeforeAfter, getGalleryMedia, projectsMeta, str, type GalleryMedia } from '@/components/builder/profile-helpers';
import { ProfileSection } from '@/components/builder/profile-section';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ProjectItem } from '@/types';

/* ── Before / After comparison ──────────────────────────────────── */

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function BeforeAfter({ before, after, title }: { before: string; after: string; title: string }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [width, setWidth] = useState(0);
  const [pos, setPos] = useState(50);

  function track(e: GestureResponderEvent) {
    if (width > 0) setPos(clamp((e.nativeEvent.locationX / width) * 100, 5, 95));
  }

  return (
    <View
      style={styles.beforeAfter}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={track}
      onResponderMove={track}
      accessibilityLabel="Before and after comparison slider"
      accessibilityRole="adjustable"
    >
      <Image source={{ uri: after }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" accessibilityLabel={`${title} — after`} />
      <View style={[styles.beforeClip, { width: `${pos}%` }]}>
        <Image source={{ uri: before }} style={{ width: width || '100%', height: '100%' }} contentFit="cover" cachePolicy="memory-disk" accessibilityLabel={`${title} — before`} />
      </View>
      <View style={[styles.sliderLine, { left: `${pos}%` }]} pointerEvents="none">
        <View style={styles.sliderBar} />
        <View style={[styles.sliderKnob, { borderColor: c.border }]}>
          <Ionicons name="code-outline" size={18} color={c.textSecondary} />
        </View>
      </View>
      <View style={[styles.baTag, styles.baTagLeft]} pointerEvents="none">
        <Text style={styles.baTagText}>BEFORE</Text>
      </View>
      <View style={[styles.baTag, styles.baTagRight]} pointerEvents="none">
        <Text style={styles.baTagText}>AFTER</Text>
      </View>
    </View>
  );
}

/* ── Media grid (photos + video posters) ────────────────────────── */

function PlayBadge({ large }: { large?: boolean }) {
  const size = large ? 56 : 36;
  return (
    <View style={styles.playWrap} pointerEvents="none">
      <View style={[styles.playBadge, { width: size, height: size, borderRadius: size / 2 }]}>
        <Ionicons name="play" size={large ? 26 : 18} color="#fff" style={{ marginLeft: 2 }} />
      </View>
    </View>
  );
}

function MediaGrid({ media, title, onOpen }: { media: GalleryMedia[]; title: string; onOpen: (index: number) => void }) {
  if (media.length === 0) return null;
  const shown = media.slice(0, 6);
  const lead = media.length >= 3;

  return (
    <View style={styles.grid}>
      {shown.map((item, i) => {
        const isLead = lead && i === 0;
        const tileStyle =
          media.length === 1
            ? styles.tileFull
            : media.length === 2
              ? styles.tileHalf
              : isLead
                ? styles.tileLead
                : styles.tileThird;
        return (
          <Pressable
            key={`${item.src}-${i}`}
            accessibilityRole="imagebutton"
            accessibilityLabel={item.kind === 'video' ? `Play video — ${title}` : `${title} — photo ${i + 1}`}
            onPress={() => onOpen(i)}
            style={[styles.tile, tileStyle]}
          >
            {item.kind === 'image' ? (
              <Image source={{ uri: item.src }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <>
                {item.poster ? (
                  <Image source={{ uri: item.poster }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
                ) : (
                  <View style={[StyleSheet.absoluteFill, styles.videoFallback]} />
                )}
                <PlayBadge large={isLead} />
              </>
            )}
            {i === 5 && media.length > 6 ? (
              <View style={styles.moreOverlay}>
                <Text style={styles.moreText}>+{media.length - 6}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/* ── Lightbox ───────────────────────────────────────────────────── */

function LightboxVideo({ src }: { src: string }) {
  const player = useVideoPlayer(src, (p) => {
    p.play();
  });
  return <VideoView player={player} style={styles.lightboxMedia} contentFit="contain" nativeControls allowsFullscreen />;
}

function Lightbox({ media, index, onClose, onIndex, title }: { media: GalleryMedia[]; index: number | null; onClose: () => void; onIndex: (i: number) => void; title: string }) {
  const current = index !== null ? media[index] : null;
  return (
    <Modal visible={current !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      {current && index !== null ? (
        <View style={styles.lightbox} accessibilityViewIsModal accessibilityLabel="Media viewer">
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
          {current.kind === 'image' ? (
            <Image source={{ uri: current.src }} style={styles.lightboxMedia} contentFit="contain" cachePolicy="memory-disk" accessibilityLabel={`${title} — photo ${index + 1}`} />
          ) : (
            <LightboxVideo key={current.src} src={current.src} />
          )}
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={[styles.lightboxBtn, styles.lightboxClose]}>
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
          {media.length > 1 ? (
            <>
              <Pressable accessibilityRole="button" accessibilityLabel="Previous" onPress={() => onIndex((index - 1 + media.length) % media.length)} style={[styles.lightboxBtn, styles.lightboxPrev]}>
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Next" onPress={() => onIndex((index + 1) % media.length)} style={[styles.lightboxBtn, styles.lightboxNext]}>
                <Ionicons name="chevron-forward" size={22} color="#fff" />
              </Pressable>
            </>
          ) : null}
          <View style={styles.lightboxCount}>
            <Text style={styles.lightboxCountText}>
              {index + 1} / {media.length}
            </Text>
          </View>
        </View>
      ) : null}
    </Modal>
  );
}

/* ── Main gallery component ─────────────────────────────────────── */

export function ProjectGallery({ projects }: { projects: ProjectItem[] | null }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [lightbox, setLightbox] = useState<{ project: number; index: number } | null>(null);

  if (!projects || projects.length === 0) return null;

  const openMedia = lightbox !== null ? getGalleryMedia(projects[lightbox.project]) : [];
  const openTitle = lightbox !== null ? str(projects[lightbox.project].title) : '';

  return (
    <ProfileSection title="Our Work" meta={projectsMeta(projects.length)}>
      <View style={styles.projects}>
        {projects.map((project, index) => {
          const title = str(project.title);
          const description = str(project.description);
          const costRange = str(project.cost_range);
          const testimonial = str(project.testimonial);
          const { before, after } = getBeforeAfter(project);
          const galleryMedia = getGalleryMedia(project);
          const hasBeforeAfter = Boolean(before && after);

          return (
            <View key={`${title}-${index}`} style={[styles.project, { borderColor: c.border, backgroundColor: c.surface }]}>
              {hasBeforeAfter ? <BeforeAfter before={before!} after={after!} title={title} /> : null}
              {galleryMedia.length > 0 ? (
                <View style={hasBeforeAfter ? styles.gridPad : undefined}>
                  <MediaGrid media={galleryMedia} title={title} onOpen={(i) => setLightbox({ project: index, index: i })} />
                </View>
              ) : null}
              <View style={styles.info}>
                {title ? <Text style={[styles.title, { color: c.textPrimary }]}>{title}</Text> : null}
                {description ? <Text style={[styles.description, { color: c.textSecondary }]}>{description}</Text> : null}
                {costRange || hasBeforeAfter ? (
                  <View style={styles.pills}>
                    {costRange ? (
                      <View style={[styles.pill, { backgroundColor: c.primaryBg }]}>
                        <Ionicons name="cash-outline" size={14} color={c.primary} />
                        <Text style={[styles.pillText, { color: c.primary }]}>{costRange}</Text>
                      </View>
                    ) : null}
                    {hasBeforeAfter ? (
                      <View style={[styles.pill, { backgroundColor: c.primaryBg }]}>
                        <Ionicons name="swap-horizontal-outline" size={14} color={c.primary} />
                        <Text style={[styles.pillText, { color: c.primary }]}>Before &amp; After</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
                {testimonial ? (
                  <View style={[styles.quote, { backgroundColor: c.canvas, borderLeftColor: c.primary }]}>
                    <Text style={[styles.quoteText, { color: c.textSecondary }]}>&ldquo;{testimonial}&rdquo;</Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      <Lightbox
        media={openMedia}
        index={lightbox?.index ?? null}
        title={openTitle}
        onClose={() => setLightbox(null)}
        onIndex={(i) => setLightbox((prev) => (prev ? { ...prev, index: i } : prev))}
      />
    </ProfileSection>
  );
}

const styles = StyleSheet.create({
  projects: {
    gap: Spacing.xl,
  },
  project: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  beforeAfter: {
    width: '100%',
    aspectRatio: 16 / 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  beforeClip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  sliderLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#ffffff',
  },
  sliderKnob: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  baTag: {
    position: 'absolute',
    top: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  baTagLeft: { left: Spacing.md },
  baTagRight: { right: Spacing.md },
  baTagText: {
    color: '#fff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  gridPad: {
    padding: Spacing.sm,
  },
  tile: {
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  tileFull: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  tileHalf: {
    width: '49%',
    flexGrow: 1,
    aspectRatio: 4 / 3,
  },
  tileLead: {
    width: '66%',
    flexGrow: 1,
    aspectRatio: 1,
  },
  tileThird: {
    width: '31%',
    flexGrow: 1,
    aspectRatio: 1,
  },
  videoFallback: {
    backgroundColor: 'rgba(26,26,46,0.9)',
  },
  playWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  moreText: {
    color: '#fff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 18,
  },
  info: {
    padding: Spacing.lg,
  },
  title: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 24,
  },
  description: {
    marginTop: 6,
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 22,
  },
  pills: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  pillText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
  },
  quote: {
    marginTop: Spacing.lg,
    borderRadius: Radius.lg,
    borderLeftWidth: 3,
    padding: Spacing.lg,
  },
  quoteText: {
    fontFamily: FontFamily.body,
    fontStyle: 'italic',
    fontSize: 14,
    lineHeight: 22,
  },
  lightbox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  lightboxMedia: {
    width: '100%',
    height: '80%',
  },
  lightboxBtn: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxClose: {
    top: 56,
    right: Spacing.lg,
  },
  lightboxPrev: {
    left: Spacing.lg,
    top: '50%',
  },
  lightboxNext: {
    right: Spacing.lg,
    top: '50%',
  },
  lightboxCount: {
    position: 'absolute',
    bottom: 40,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  lightboxCountText: {
    color: '#fff',
    fontFamily: FontFamily.body,
    fontSize: 14,
  },
});
