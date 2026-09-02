/**
 * Home-suburb typeahead for the Location step — the edit-profile page's
 * suburb input (`getSuburbSuggestionsAsync` → suggestions dropdown) over the
 * app's bundled AU suburb list. Deliberately the FULL national list, like the
 * website: where a tradie LIVES and where they WORK are different questions —
 * the beachhead restriction lives on the zone picker.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getSuburbSuggestions } from '@/lib/geo';

interface SuburbTypeaheadProps {
  value: string;
  onChangeText: (value: string) => void;
  onSelect: (suburb: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
}

export function SuburbTypeahead({
  value,
  onChangeText,
  onSelect,
  placeholder = 'Start typing suburb...',
  accessibilityLabel = 'Suburb',
}: SuburbTypeaheadProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  function handleChange(val: string) {
    onChangeText(val);
    if (val.length >= 2) {
      const next = getSuburbSuggestions(val);
      setSuggestions(next);
      setOpen(next.length > 0);
    } else {
      setSuggestions([]);
      setOpen(false);
    }
  }

  function select(s: string) {
    onSelect(s);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <View style={styles.wrap}>
      <TextInput
        value={value}
        onChangeText={handleChange}
        onFocus={() => {
          setFocused(true);
          if (suggestions.length > 0) setOpen(true);
        }}
        onBlur={() => {
          setFocused(false);
          // Delay to allow a tap on a suggestion.
          setTimeout(() => setOpen(false), 200);
        }}
        placeholder={placeholder}
        placeholderTextColor={c.textSecondary + '80'}
        autoCapitalize="words"
        autoCorrect={false}
        accessibilityLabel={accessibilityLabel}
        style={[
          styles.input,
          { backgroundColor: c.surface, borderColor: focused ? c.primary : c.border, color: c.textPrimary },
        ]}
      />
      {open ? (
        <View style={[styles.dropdown, Shadows.lg, { backgroundColor: c.surface, borderColor: c.border }]}>
          {suggestions.map((s) => (
            <Pressable
              key={s}
              onPress={() => select(s)}
              style={styles.option}
              accessibilityRole="button"
              accessibilityLabel={s}
            >
              <Text style={[styles.optionText, { color: c.textPrimary }]}>{s}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', zIndex: 10 },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    fontSize: 14,
    fontFamily: FontFamily.body,
  },
  dropdown: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    zIndex: 20,
  },
  option: { paddingHorizontal: Spacing.lg, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  optionText: { fontSize: 14, fontFamily: FontFamily.body },
});
