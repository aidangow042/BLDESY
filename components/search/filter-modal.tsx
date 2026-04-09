/**
 * Search filter modal — distance, verified-only, availability, sort options.
 * Matches the website's search filter panel.
 */
import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Radius, Spacing, Shadows, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type SearchFilters = {
  maxDistance: number; // km
  verifiedOnly: boolean;
  availability: 'all' | 'available' | 'limited';
  sortBy: 'relevance' | 'distance' | 'rating' | 'response_time';
};

type Props = {
  visible: boolean;
  filters: SearchFilters;
  onApply: (filters: SearchFilters) => void;
  onClose: () => void;
};

const DISTANCE_OPTIONS = [10, 25, 50, 100, 200];
const SORT_OPTIONS: { key: SearchFilters['sortBy']; label: string; icon: string }[] = [
  { key: 'relevance', label: 'Best Match', icon: 'star' },
  { key: 'distance', label: 'Closest', icon: 'location-on' },
  { key: 'rating', label: 'Top Rated', icon: 'thumb-up' },
  { key: 'response_time', label: 'Fastest Response', icon: 'schedule' },
];

export const DEFAULT_FILTERS: SearchFilters = {
  maxDistance: 50,
  verifiedOnly: false,
  availability: 'all',
  sortBy: 'relevance',
};

export function FilterModal({ visible, filters, onApply, onClose }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const teal = colors.teal;

  const [local, setLocal] = useState<SearchFilters>(filters);

  function handleApply() {
    onApply(local);
    onClose();
  }

  function handleReset() {
    setLocal(DEFAULT_FILTERS);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: isDark ? colors.surface : '#fff' }, Shadows.lg]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Pressable onPress={onClose} hitSlop={12}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Filters</Text>
            <Pressable onPress={handleReset}>
              <Text style={[styles.resetText, { color: teal }]}>Reset</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Max distance */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Max Distance</Text>
            <View style={styles.chipRow}>
              {DISTANCE_OPTIONS.map((km) => {
                const active = local.maxDistance === km;
                return (
                  <Pressable
                    key={km}
                    style={[styles.chip, { backgroundColor: active ? teal : isDark ? colors.background : '#f1f5f9', borderColor: active ? teal : colors.border }]}
                    onPress={() => setLocal({ ...local, maxDistance: km })}
                  >
                    <Text style={[styles.chipText, { color: active ? '#fff' : colors.text }]}>{km} km</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Verified only */}
            <Pressable
              style={[styles.toggleRow, { borderColor: colors.border }]}
              onPress={() => setLocal({ ...local, verifiedOnly: !local.verifiedOnly })}
            >
              <View style={styles.toggleLeft}>
                <Ionicons name="shield-checkmark" size={20} color={teal} />
                <Text style={[styles.toggleLabel, { color: colors.text }]}>Verified tradies only</Text>
              </View>
              <View style={[styles.toggle, { backgroundColor: local.verifiedOnly ? teal : colors.border }]}>
                <View style={[styles.toggleDot, { transform: [{ translateX: local.verifiedOnly ? 16 : 0 }] }]} />
              </View>
            </Pressable>

            {/* Availability */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Availability</Text>
            <View style={styles.chipRow}>
              {(['all', 'available', 'limited'] as const).map((opt) => {
                const active = local.availability === opt;
                const label = opt === 'all' ? 'All' : opt === 'available' ? 'Available Now' : 'Limited OK';
                return (
                  <Pressable
                    key={opt}
                    style={[styles.chip, { backgroundColor: active ? teal : isDark ? colors.background : '#f1f5f9', borderColor: active ? teal : colors.border }]}
                    onPress={() => setLocal({ ...local, availability: opt })}
                  >
                    <Text style={[styles.chipText, { color: active ? '#fff' : colors.text }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Sort by */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Sort By</Text>
            {SORT_OPTIONS.map((opt) => {
              const active = local.sortBy === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={[styles.sortRow, active && { backgroundColor: isDark ? colors.tealBg : '#f0fdfa' }]}
                  onPress={() => setLocal({ ...local, sortBy: opt.key })}
                >
                  <MaterialIcons name={opt.icon as any} size={20} color={active ? teal : colors.textSecondary} />
                  <Text style={[styles.sortLabel, { color: active ? teal : colors.text }]}>{opt.label}</Text>
                  {active && <Ionicons name="checkmark-circle" size={20} color={teal} />}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Apply button */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Pressable style={[styles.applyBtn, { backgroundColor: teal }]} onPress={handleApply}>
              <Text style={styles.applyText}>Apply Filters</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  headerTitle: { ...Type.h3 },
  resetText: { ...Type.captionSemiBold },
  content: {
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  sectionTitle: { ...Type.bodySemiBold, marginBottom: -Spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chipText: { ...Type.captionSemiBold },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  toggleLabel: { ...Type.bodySemiBold },
  toggle: {
    width: 44,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
  },
  sortLabel: { ...Type.body, flex: 1 },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
  },
  applyBtn: {
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: { color: '#fff', ...Type.btnPrimary },
});
