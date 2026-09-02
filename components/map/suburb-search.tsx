/**
 * SuburbSearch — ~/bldesy-web/components/map/suburb-search.tsx: suburb /
 * postcode typeahead (debounced 250ms) that geocodes the pick and hands the
 * coordinates back so the map flies there. The website's /api/suburbs lookups
 * with the bundled dataset as the offline fallback.
 */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { geocodeSuburb, suggestSuburbs } from '@/lib/data/public-forms';
import { geocode, getSuburbSuggestions } from '@/lib/geo';

interface SuburbSearchProps {
  onLocate: (coords: { latitude: number; longitude: number }, label: string) => void;
  onOpenChange?: (open: boolean) => void;
}

export function SuburbSearch({ onLocate, onOpenChange }: SuburbSearchProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onOpenChange?.(open && suggestions.length > 0);
  }, [open, suggestions.length, onOpenChange]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      const q = value.trim();
      suggestSuburbs(q).then((remote) => {
        const matches = remote.length > 0 ? remote : getSuburbSuggestions(q);
        setSuggestions(matches);
        setOpen(matches.length > 0);
      });
    }, 250);
  }

  async function select(suburb: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery(suburb);
    setOpen(false);
    setLocating(true);
    const coords = (await geocodeSuburb(suburb)) ?? (await geocode(suburb));
    setLocating(false);
    if (coords) onLocate(coords, suburb);
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.pill, { borderColor: open ? c.primary : c.border, backgroundColor: c.surface }]}>
        {locating ? (
          <ActivityIndicator size="small" color={c.primary} />
        ) : (
          <Ionicons name="location-outline" size={16} color={c.textSecondary + 'B3'} />
        )}
        <TextInput
          value={query}
          onChangeText={handleQueryChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onSubmitEditing={() => {
            if (suggestions.length > 0) select(suggestions[0]);
          }}
          placeholder="Suburb or postcode"
          placeholderTextColor={c.textSecondary + '99'}
          accessibilityLabel="Search suburb or postcode"
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="search"
          style={[styles.input, { color: c.textPrimary }]}
        />
      </View>

      {open && suggestions.length > 0 ? (
        <View style={[styles.dropdown, Shadows.lg, { backgroundColor: c.surface, borderColor: c.border }]}>
          {suggestions.map((s) => (
            <Pressable
              key={s}
              accessibilityRole="button"
              onPress={() => select(s)}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.primaryBg }]}
            >
              <Text style={[styles.rowText, { color: c.textPrimary }]}>{s}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minWidth: 0,
  },
  pill: {
    height: 36,
    borderWidth: 1,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: FontFamily.body,
    fontSize: 14,
    paddingVertical: 0,
  },
  dropdown: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    minWidth: 220,
    borderWidth: 1,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    paddingVertical: 4,
    zIndex: 30,
    elevation: 30,
  },
  row: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  rowText: {
    fontFamily: FontFamily.body,
    fontSize: 14,
  },
});
