/**
 * SearchBar — ~/bldesy-web/components/ui/search-bar.tsx: the compact
 * "What do you need? / Where?" bar on the trade landings. Submits to /search
 * with just trade + location (their presence is what shows results).
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { TradeSelectModal } from '@/components/search/search-form';
import { searchHref } from '@/components/search/search-params';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getTradeBySlug } from '@/lib/web/trades';

interface SearchBarProps {
  defaultTrade?: string;
  defaultLocation?: string;
}

export function SearchBar({ defaultTrade = '', defaultLocation = '' }: SearchBarProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const [trade, setTrade] = useState(defaultTrade);
  const [location, setLocation] = useState(defaultLocation);
  const [pickerOpen, setPickerOpen] = useState(false);

  function handleSubmit() {
    router.push(searchHref({ trade: trade || undefined, location: location.trim() || undefined }) as Href);
  }

  const tradeLabel = trade ? getTradeBySlug(trade)?.name ?? trade : 'All trades';

  return (
    <View style={styles.form}>
      <View>
        <Text style={[styles.label, { color: c.textSecondary }]}>WHAT DO YOU NEED?</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityValue={{ text: tradeLabel }}
          onPress={() => setPickerOpen(true)}
          style={[styles.field, { backgroundColor: c.surface, borderColor: c.border }]}
        >
          <Text style={[styles.fieldText, { color: c.textPrimary }]} numberOfLines={1}>
            {tradeLabel}
          </Text>
          <Ionicons name="chevron-down" size={16} color={c.textSecondary} />
        </Pressable>
      </View>

      <View>
        <Text style={[styles.label, { color: c.textSecondary }]}>WHERE?</Text>
        <View style={[styles.field, { backgroundColor: c.surface, borderColor: c.border }]}>
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="Suburb or postcode"
            placeholderTextColor={c.textSecondary + '99'}
            accessibilityLabel="Where?"
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={handleSubmit}
            style={[styles.fieldText, styles.input, { color: c.textPrimary }]}
          />
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={handleSubmit}
        style={({ pressed }) => [styles.submit, pressed && { opacity: 0.9 }]}
      >
        <LinearGradient
          colors={[c.gradientHeaderFrom, c.gradientHeaderTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.submitText}>Search</Text>
      </Pressable>

      <TradeSelectModal
        visible={pickerOpen}
        selected={trade ? [trade] : []}
        onClose={() => setPickerOpen(false)}
        onSelect={(slug) => {
          setTrade(slug ?? '');
          setPickerOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.md,
  },
  label: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  field: {
    height: 48,
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fieldText: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: 14,
  },
  input: {
    height: '100%',
    paddingVertical: 0,
  },
  submit: {
    height: 48,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['3xl'],
  },
  submitText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
    color: '#ffffff',
  },
});
