/**
 * TradeFilter — ~/bldesy-web/components/trades/trade-filter.tsx: the /trades
 * browse list. A search input filters the 50+ trades by name; categories with
 * no matches drop out; each card opens the trade's landing.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Card, Input } from '@/components/ui';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ROUTES } from '@/lib/routes';
import { TRADE_CATEGORIES, pluralSlugFor, type TradeCategory } from '@/lib/web/trades';

/** Pure filter rule: case-insensitive substring on the trade name; empty categories drop out. */
export function filterTradeCategories(query: string): TradeCategory[] {
  const normalised = query.toLowerCase().trim();
  if (!normalised) return TRADE_CATEGORIES;
  return TRADE_CATEGORIES.map((cat) => ({
    ...cat,
    trades: cat.trades.filter((t) => t.name.toLowerCase().includes(normalised)),
  })).filter((cat) => cat.trades.length > 0);
}

export function TradeFilter() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const [query, setQuery] = useState('');

  const filteredCategories = filterTradeCategories(query);

  return (
    <View>
      <Input
        value={query}
        onChangeText={setQuery}
        placeholder="Search trades... e.g. plumber, electrician"
        accessibilityLabel="Filter trades"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        containerStyle={styles.inputWrap}
      />

      {filteredCategories.length === 0 ? (
        <Text style={[styles.empty, { color: c.textSecondary }]}>
          No trades match &ldquo;{query}&rdquo;. Try a different search term.
        </Text>
      ) : (
        filteredCategories.map((category) => (
          <View key={category.slug} style={styles.section}>
            <Text accessibilityRole="header" style={[styles.categoryTitle, { color: c.textPrimary }]}>
              {category.name}
            </Text>
            <View style={styles.list}>
              {category.trades.map((trade) => (
                <Pressable
                  key={trade.slug}
                  accessibilityRole="link"
                  onPress={() => router.push(ROUTES.tradeLanding(pluralSlugFor(trade)) as Href)}
                  style={({ pressed }) => pressed && { opacity: 0.85 }}
                >
                  <Card padding={Spacing.xl} style={styles.card}>
                    <View style={styles.cardText}>
                      <Text style={[styles.tradeName, { color: c.textPrimary }]}>{trade.name}</Text>
                      <Text style={[styles.tradeDesc, { color: c.textSecondary }]} numberOfLines={1}>
                        {trade.description}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={c.textSecondary} />
                  </Card>
                </Pressable>
              ))}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrap: {
    marginBottom: Spacing['3xl'],
  },
  empty: {
    fontFamily: FontFamily.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingVertical: Spacing['5xl'],
  },
  section: {
    marginBottom: Spacing['4xl'],
  },
  categoryTitle: {
    fontFamily: FontFamily.display,
    fontSize: 20,
    lineHeight: 26,
    marginBottom: Spacing.lg,
  },
  list: {
    gap: Spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  cardText: {
    flex: 1,
    minWidth: 0,
  },
  tradeName: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
  },
  tradeDesc: {
    marginTop: 4,
    fontFamily: FontFamily.body,
    fontSize: 12,
    lineHeight: 18,
  },
});
