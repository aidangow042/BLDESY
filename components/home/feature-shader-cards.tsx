/**
 * FeatureShaderCards — ~/bldesy-web/components/ui/feature-shader-cards.tsx:
 * gradient tiles in a two-column grid (the web's mobile `grid-cols-2`), each a
 * dark-green/slate gradient under a 60% black scrim with the icon, title,
 * two-line description and the CTA line pinned to the bottom.
 */
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

import { tileGradient } from '@/components/home/gradients';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface FeatureTile {
  title: string;
  description: string;
  icon: IoniconName;
  onPress: () => void;
}

interface FeatureShaderCardsProps {
  features: FeatureTile[];
  heading?: string;
  subheading?: string;
  /** Card CTA line. Must keep the promise the click lands on. */
  ctaLabel?: string;
}

export function FeatureShaderCards({ features, heading, subheading, ctaLabel = 'Find tradies' }: FeatureShaderCardsProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <View style={[styles.section, { backgroundColor: c.canvas }]}>
      {heading || subheading ? (
        <View style={styles.header}>
          {heading ? (
            <Text accessibilityRole="header" style={[styles.heading, { color: c.textPrimary }]}>
              {heading}
            </Text>
          ) : null}
          {subheading ? <Text style={[styles.subheading, { color: c.textSecondary }]}>{subheading}</Text> : null}
        </View>
      ) : null}

      <View style={styles.grid}>
        {features.map((feature, index) => (
          <Pressable
            key={feature.title}
            accessibilityRole="link"
            accessibilityLabel={`${feature.title} — ${ctaLabel}`}
            onPress={feature.onPress}
            style={({ pressed }) => [styles.tile, pressed && { transform: [{ scale: 0.98 }] }]}
          >
            <LinearGradient
              colors={tileGradient(index)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.scrim}>
              <Ionicons name={feature.icon} size={32} color="#ffffff" style={styles.icon} />
              <Text style={styles.title}>{feature.title}</Text>
              <Text style={styles.description} numberOfLines={2}>
                {feature.description}
              </Text>
              <View style={styles.ctaRow}>
                <Text style={styles.cta}>{ctaLabel}</Text>
                <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['6xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['5xl'],
  },
  heading: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 24,
    lineHeight: 32,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subheading: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 512,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
  },
  tile: {
    width: '47%',
    flexGrow: 1,
    height: 208,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.xl,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  icon: {
    marginBottom: Spacing.md,
    opacity: 0.8,
  },
  title: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 24,
    color: '#ffffff',
    marginBottom: 4,
  },
  description: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.6)',
  },
  ctaRow: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cta: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
});
