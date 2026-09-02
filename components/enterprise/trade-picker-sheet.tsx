/**
 * TradePickerSheet — the native stand-in for the edit-job page's
 * `<select>` of every trade (getAllTrades). A searchable list in a modal.
 */
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { getAllTrades } from '@/lib/web/trades';

import { HubInput } from './hub-form';
import { HubModal, useHubTheme } from './hub-primitives';

const ALL_TRADES = getAllTrades();

export function TradePickerSheet({
  visible,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: string;
  onSelect: (slug: string) => void;
  onClose: () => void;
}) {
  const c = useHubTheme();
  const [query, setQuery] = useState('');
  const trades = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? ALL_TRADES.filter((t) => t.name.toLowerCase().includes(q)) : ALL_TRADES;
  }, [query]);

  return (
    <HubModal visible={visible} onClose={onClose} maxWidth={448} accessibilityLabel="Trade Category">
      <Text style={[styles.title, { color: c.textPrimary }]}>Trade Category</Text>
      <HubInput value={query} onChangeText={setQuery} placeholder="Search trades" autoFocus containerStyle={{ marginTop: Spacing.md }} />
      <FlatList
        data={trades}
        keyExtractor={(t) => t.slug}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: c.border }]} />}
        renderItem={({ item }) => {
          const active = item.slug === value;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                onSelect(item.slug);
                onClose();
              }}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.indigo + '0D' }]}
            >
              <Text style={[styles.rowLabel, { color: active ? c.indigo : c.textPrimary }]}>{item.name}</Text>
              {active ? <Ionicons name="checkmark" size={16} color={c.indigo} /> : null}
            </Pressable>
          );
        }}
      />
    </HubModal>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  list: {
    marginTop: Spacing.md,
    maxHeight: 360,
    borderRadius: Radius.lg,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: Spacing.sm,
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
});
