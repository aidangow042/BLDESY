/**
 * SearchBar — single-line search input with leading magnifier + clear button.
 * Used by `app/(tabs)/map.tsx`, `app/results.tsx`, etc. The website's homepage
 * search uses a compound trade+location form — that's a screen-level concern
 * built in Phase 3.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, View, type TextInputProps } from 'react-native';

import { Input } from './input';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SearchBarProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  value: string;
  onChangeText: (v: string) => void;
  /** Called when user taps the X to clear the input. */
  onClear?: () => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChangeText,
  onClear,
  placeholder = 'Search…',
  ...rest
}: SearchBarProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [internalFocus, setInternalFocus] = useState(false);

  return (
    <Input
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      autoCapitalize="none"
      autoCorrect={false}
      returnKeyType="search"
      leading={<MagnifierIcon color={internalFocus ? c.primary : c.textSecondary} />}
      trailing={
        value.length > 0 ? (
          <Pressable
            onPress={() => {
              onChangeText('');
              onClear?.();
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <CloseIcon color={c.textSecondary} />
          </Pressable>
        ) : null
      }
      onFocus={(e) => {
        setInternalFocus(true);
        rest.onFocus?.(e);
      }}
      onBlur={(e) => {
        setInternalFocus(false);
        rest.onBlur?.(e);
      }}
      {...rest}
    />
  );
}

function MagnifierIcon({ color }: { color: string }) {
  return (
    <View
      style={[styles.icon, { borderColor: color }]}
    >
      {/* Simple two-element magnifier glyph — circle + stem. */}
      <View style={[styles.lens, { borderColor: color }]} />
      <View style={[styles.stem, { backgroundColor: color }]} />
    </View>
  );
}

function CloseIcon({ color }: { color: string }) {
  return (
    <View style={styles.closeBox}>
      <View style={[styles.closeStroke, { backgroundColor: color, transform: [{ rotate: '45deg' }] }]} />
      <View style={[styles.closeStroke, { backgroundColor: color, transform: [{ rotate: '-45deg' }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { width: 18, height: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 0 },
  lens: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5 },
  stem: { width: 2, height: 5, position: 'absolute', bottom: 1, right: 3, transform: [{ rotate: '45deg' }] },
  closeBox: { width: 16, height: 16, justifyContent: 'center', alignItems: 'center' },
  closeStroke: { position: 'absolute', width: 12, height: 1.5, borderRadius: 1 },
});
