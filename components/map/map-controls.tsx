/**
 * Map chrome — ~/bldesy-web/components/map/map-controls.tsx: the zoom + locate
 * stack (bottom-right, clear of the AI launcher), the "Search this area" pill
 * (top-centre after panning away) and the trade colour legend.
 */
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getTradeColour } from '@/lib/web/trade-colours';

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLocate: () => void;
  locating: boolean;
  locateError: string | null;
  /** Distance from the screen's bottom edge — clears the results sheet's peek. */
  bottom: number;
}

export function MapControls({ onZoomIn, onZoomOut, onLocate, locating, locateError, bottom }: MapControlsProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const btn = [styles.controlBtn, { backgroundColor: c.surface }];

  return (
    <View style={[styles.stack, { bottom }]} pointerEvents="box-none">
      {locateError ? (
        <View style={[styles.errorPill, Shadows.md, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.errorText, { color: c.textSecondary }]}>{locateError}</Text>
        </View>
      ) : null}
      <View style={[styles.zoomGroup, Shadows.md, { borderColor: c.border + '80' }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Zoom in" onPress={onZoomIn} style={btn}>
          <Ionicons name="add" size={20} color={c.textPrimary} />
        </Pressable>
        <View style={[styles.divider, { backgroundColor: c.border + '99' }]} />
        <Pressable accessibilityRole="button" accessibilityLabel="Zoom out" onPress={onZoomOut} style={btn}>
          <Ionicons name="remove" size={20} color={c.textPrimary} />
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Show my location"
        accessibilityState={{ disabled: locating, busy: locating }}
        disabled={locating}
        onPress={onLocate}
        style={[btn, styles.locate, Shadows.md, { borderColor: c.border + '80' }, locating && { opacity: 0.5 }]}
      >
        {locating ? <ActivityIndicator size="small" color={c.primary} /> : <Ionicons name="locate-outline" size={20} color={c.primary} />}
      </Pressable>
    </View>
  );
}

export function SearchAreaPill({ onPress, top }: { onPress: () => void; top: number }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.searchArea,
        Shadows.lg,
        { top, backgroundColor: pressed ? c.primaryDark : c.primary },
        pressed && { transform: [{ scale: 0.95 }] },
      ]}
    >
      <Ionicons name="refresh-outline" size={14} color="#fff" />
      <Text style={styles.searchAreaText}>Search this area</Text>
    </Pressable>
  );
}

/** Trade colour legend — collapsed to a "Trades" chip on phones, tap to expand. */
export function MapLegend({ trades, bottom }: { trades: string[]; bottom: number }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.legendWrap, { bottom }]} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel="Trade colours"
        onPress={() => setOpen((v) => !v)}
        style={[styles.legend, Shadows.md, { backgroundColor: c.surface + 'F2', borderColor: c.border + '80' }]}
      >
        <Text style={[styles.legendTitle, { color: c.textSecondary }]}>TRADES</Text>
        {open ? (
          <View style={styles.legendList}>
            {trades.map((t) => (
              <View key={t} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: getTradeColour(t) }]} />
                <Text style={[styles.legendText, { color: c.textPrimary }]}>{t}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    right: Spacing.md,
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  errorPill: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    maxWidth: 260,
  },
  errorText: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 11,
  },
  zoomGroup: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  controlBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  locate: {
    borderWidth: 1,
    borderRadius: Radius.lg,
  },
  searchArea: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  searchAreaText: {
    color: '#ffffff',
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
  },
  legendWrap: {
    position: 'absolute',
    left: Spacing.md,
  },
  legend: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  legendTitle: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.6,
  },
  legendList: {
    marginTop: 6,
    gap: 4,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontFamily: FontFamily.body,
    fontSize: 11,
  },
});
