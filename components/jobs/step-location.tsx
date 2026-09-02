/**
 * Location step. Port of ~/bldesy-web/components/jobs/step-location.tsx:
 * suburb with the `/api/suburbs` typeahead, 4-digit postcode and the
 * (prefilled) contact email.
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Input } from '@/components/ui';
import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { suggestSuburbs } from '@/lib/data/public-forms';

import { FieldLabel } from './field-label';

export type LocationField = 'suburb' | 'postcode' | 'contactEmail';

interface StepLocationProps {
  suburb: string;
  postcode: string;
  contactEmail?: string;
  onChange: (field: LocationField, value: string) => void;
  errors: Record<string, string>;
}

const SUGGEST_DEBOUNCE_MS = 250;

/** Digits only, capped at four — the web's onChange for the postcode input. */
export function sanitisePostcodeInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 4);
}

export function StepLocation({ suburb, postcode, contactEmail = '', onChange, errors }: StepLocationProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const selectedRef = useRef<string | null>(null);

  // Generate suggestions as suburb changes
  useEffect(() => {
    if (suburb.length < 2 || suburb === selectedRef.current) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      suggestSuburbs(suburb).then((matches) => {
        if (cancelled) return;
        setSuggestions(matches);
        setShowSuggestions(matches.length > 0);
      });
    }, SUGGEST_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [suburb]);

  function selectSuggestion(value: string) {
    selectedRef.current = value;
    onChange('suburb', value);
    setShowSuggestions(false);
  }

  return (
    <View style={styles.stack}>
      <Text style={[styles.h2, { color: c.textPrimary }]}>Location</Text>

      {/* Suburb with autocomplete */}
      <View>
        <FieldLabel required>Suburb</FieldLabel>
        <Input
          value={suburb}
          onChangeText={(t) => {
            selectedRef.current = null;
            onChange('suburb', t);
          }}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder="e.g., Bondi Beach"
          autoCorrect={false}
          autoCapitalize="words"
          error={errors.suburb}
          accessibilityLabel="Suburb"
          accessibilityState={{ expanded: showSuggestions }}
        />
        {showSuggestions ? (
          <View
            accessibilityRole="list"
            style={[styles.suggestions, Shadows.lg, { backgroundColor: c.surface, borderColor: c.border }]}
          >
            {suggestions.map((s) => (
              <Pressable
                key={s}
                accessibilityRole="button"
                onPress={() => selectSuggestion(s)}
                style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: c.primaryBg }]}
              >
                <Ionicons name="location-outline" size={16} color={c.textSecondary + '80'} />
                <Text style={[styles.suggestionText, { color: c.textPrimary }]}>{s}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {/* Postcode */}
      <View>
        <FieldLabel required>Postcode</FieldLabel>
        <Input
          value={postcode}
          onChangeText={(t) => onChange('postcode', sanitisePostcodeInput(t))}
          placeholder="e.g., 2026"
          keyboardType="number-pad"
          maxLength={4}
          error={errors.postcode}
          accessibilityLabel="Postcode"
        />
      </View>

      {/* Contact Email */}
      <View>
        <FieldLabel>Contact Email</FieldLabel>
        <Input
          value={contactEmail}
          onChangeText={(t) => onChange('contactEmail', t)}
          placeholder="your@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          helper="Tradies will use this email to contact you about the job."
          error={errors.contactEmail}
          accessibilityLabel="Contact Email"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: Spacing.xl },
  h2: { fontSize: 20, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  suggestions: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
  },
  suggestionText: { fontSize: 14, fontFamily: FontFamily.body },
});
