/**
 * SaveButton — ~/bldesy-web/components/builder/save-button.tsx: the bookmark
 * chip over the cover photo (or on a surface). Renders nothing until the saved
 * set has loaded so it never flashes the wrong state.
 */
import { Pressable, StyleSheet, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, FontFamily, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSavedBuilders } from '@/lib/data/saved';

interface SaveButtonProps {
  builderId: string;
  variant?: 'chip' | 'overlay';
}

export function SaveButton({ builderId, variant = 'chip' }: SaveButtonProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { isSaved, toggleSave, loaded } = useSavedBuilders();

  if (!loaded) return null;
  const saved = isSaved(builderId);
  const overlay = variant === 'overlay';
  const bg = overlay
    ? saved
      ? 'rgba(255,255,255,0.95)'
      : 'rgba(0,0,0,0.4)'
    : saved
      ? c.primary
      : c.surface;
  const fg = overlay ? (saved ? c.textPrimary : '#ffffff') : saved ? '#ffffff' : c.textSecondary;
  const icon = overlay && saved ? c.primary : fg;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: saved }}
      accessibilityLabel={saved ? 'Remove from saved' : 'Save builder'}
      onPress={() => toggleSave(builderId)}
      style={[
        styles.btn,
        { backgroundColor: bg },
        !overlay && !saved && { borderWidth: 1, borderColor: c.border },
        overlay && saved && Shadows.sm,
      ]}
    >
      <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={16} color={icon} />
      <Text style={[styles.label, { color: fg }]}>{saved ? 'Saved' : 'Save'}</Text>
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
