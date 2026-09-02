/**
 * LikeButton — ~/bldesy-web/components/builder/like-button.tsx: heart with a
 * public like count (social proof). Anyone sees the count; liking needs a
 * login (guests go to /login), and a tradie can't like their own profile.
 * Optimistic toggle with revert lives in `useBuilderLike`.
 */
import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, FontFamily, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useBuilderLike } from '@/lib/data/builders';
import { ROUTES } from '@/lib/routes';

/* Tailwind rose-500 — the liked heart. */
const ROSE_500 = '#f43f5e';

interface LikeButtonProps {
  builderId: string;
  /** "chip" = bordered pill on a surface; "overlay" = translucent chip over the cover photo. */
  variant?: 'chip' | 'overlay';
}

export function LikeButton({ builderId, variant = 'chip' }: LikeButtonProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const { count, liked, loaded, isOwnProfile, toggle } = useBuilderLike(builderId);

  if (!loaded || count === null) return null;

  async function onPress() {
    const outcome = await toggle();
    if (outcome === 'login_required') router.push(ROUTES.login as Href);
  }

  const overlay = variant === 'overlay';
  const bg = overlay
    ? liked
      ? 'rgba(255,255,255,0.95)'
      : 'rgba(0,0,0,0.4)'
    : liked
      ? ROSE_500
      : c.surface;
  const fg = overlay ? (liked ? c.textPrimary : '#ffffff') : liked ? '#ffffff' : c.textSecondary;
  const heart = overlay && liked ? ROSE_500 : fg;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: liked, disabled: isOwnProfile }}
      accessibilityLabel={liked ? 'Unlike this tradie' : 'Like this tradie'}
      disabled={isOwnProfile}
      onPress={onPress}
      style={[
        styles.btn,
        { backgroundColor: bg },
        !overlay && !liked && { borderWidth: 1, borderColor: c.border },
        overlay && liked && Shadows.sm,
      ]}
    >
      <Ionicons name={liked ? 'heart' : 'heart-outline'} size={16} color={heart} />
      <Text style={[styles.label, { color: fg }]}>
        {count} {count === 1 ? 'like' : 'likes'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  label: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
  },
});
