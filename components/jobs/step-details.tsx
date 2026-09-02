/**
 * Step 1 — Job Details. Port of ~/bldesy-web/components/jobs/step-details.tsx:
 * title (with the debounced `ai-job-suggest` "AI Suggestions" chips), grouped
 * trade select, optional sub-trade specialities, and the ASAP / This Week /
 * Flexible urgency segmented control.
 *
 * App superset (App Store third-party AI disclosure): the auto-suggest only
 * fires once the user has accepted the AI consent elsewhere — never a modal
 * mid-typing.
 */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { SpecialityPicker } from '@/components/trades/speciality-picker';
import { Input } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { hasAiConsent } from '@/lib/ai-consent';
import { supabase } from '@/lib/supabase';
import { getTradeBySlug } from '@/lib/web/trades';
import { hasSpecialisations, type BuilderSpecialisations } from '@/lib/web/trade-specialisations';

import { FieldLabel } from './field-label';
import { URGENCY_CONFIG } from './job-format';
import { SelectSheet } from './select-sheet';
import { TRADE_SELECT_GROUPS } from './trade-options';
import { normaliseAiSuggestion, titleCaseSlug, type AiSuggestion } from './wizard-model';

export type DetailsField = 'title' | 'tradeCategory' | 'urgency';

interface StepDetailsProps {
  title: string;
  tradeCategory: string;
  urgency: string;
  onChange: (field: DetailsField, value: string) => void;
  errors: Record<string, string>;
  specialisations: BuilderSpecialisations;
  onSpecialisationsChange: (next: BuilderSpecialisations) => void;
  /** The edge function needs a session — guests get no suggestions (the web returns silently too). */
  canUseAi: boolean;
}

const URGENCY_OPTIONS = [
  { value: 'asap', label: 'ASAP' },
  { value: 'this_week', label: 'This Week' },
  { value: 'flexible', label: 'Flexible' },
] as const;

const AI_SUGGEST_MIN_TITLE = 10;
const AI_SUGGEST_DEBOUNCE_MS = 800;

export function StepDetails({
  title,
  tradeCategory,
  urgency,
  onChange,
  errors,
  specialisations,
  onSpecialisationsChange,
  canUseAi,
}: StepDetailsProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const [suggestions, setSuggestions] = useState<AiSuggestion | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryRef = useRef('');

  // AI auto-suggest when title is 10+ characters
  useEffect(() => {
    const trimmed = title.trim();
    if (trimmed.length < AI_SUGGEST_MIN_TITLE) {
      setSuggestions(null);
      return;
    }
    // Don't re-fetch for same query
    if (trimmed === lastQueryRef.current) return;
    if (!canUseAi) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    let cancelled = false;

    debounceRef.current = setTimeout(async () => {
      lastQueryRef.current = trimmed;
      if (!(await hasAiConsent())) return;
      setSuggestLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('ai-job-suggest', {
          body: { title: trimmed, mode: 'suggest' },
        });
        if (!cancelled) setSuggestions(error ? null : normaliseAiSuggestion(data));
      } catch {
        // AI suggestions are optional — fail silently
        if (!cancelled) setSuggestions(null);
      }
      if (!cancelled) setSuggestLoading(false);
    }, AI_SUGGEST_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [title, canUseAi]);

  const showSpecialities = Boolean(tradeCategory) && hasSpecialisations(tradeCategory);

  const tradeChip =
    suggestions?.trade && suggestions.trade !== tradeCategory && getTradeBySlug(suggestions.trade)
      ? suggestions.trade
      : null;
  const urgencyChip = suggestions?.urgency && suggestions.urgency !== urgency ? suggestions.urgency : null;
  const titleChip =
    suggestions?.titleRefined && suggestions.titleRefined !== title.trim() ? suggestions.titleRefined : null;
  const hasSuggestionCard = Boolean(tradeChip || urgencyChip || titleChip || suggestions?.clarifyingQuestion);

  return (
    <View style={styles.stack}>
      <Text style={[styles.h2, { color: c.textPrimary }]}>Job Details</Text>

      {/* Title */}
      <View>
        <FieldLabel required>Job Title</FieldLabel>
        <Input
          value={title}
          onChangeText={(t) => onChange('title', t)}
          placeholder="e.g., Fix leaking tap in bathroom"
          error={errors.title}
          autoCapitalize="sentences"
          returnKeyType="next"
          accessibilityLabel="Job Title"
        />

        {/* AI suggestions */}
        {suggestLoading ? (
          <View style={styles.analysingRow}>
            <ActivityIndicator size="small" color={c.primary} />
            <Text style={[styles.analysingText, { color: c.textSecondary }]}>Analysing your job...</Text>
          </View>
        ) : null}
        {hasSuggestionCard && !suggestLoading ? (
          <View style={[styles.aiCard, { borderColor: c.primary + '33', backgroundColor: c.primaryBg + '80' }]}>
            <Text style={[styles.aiTitle, { color: c.primary }]}>AI Suggestions</Text>
            <View style={styles.chipWrap}>
              {tradeChip ? (
                <SuggestionChip
                  label={`Trade: ${titleCaseSlug(tradeChip)}`}
                  c={c}
                  onPress={() => onChange('tradeCategory', tradeChip)}
                />
              ) : null}
              {urgencyChip ? (
                <SuggestionChip
                  label={`Urgency: ${URGENCY_CONFIG[urgencyChip as keyof typeof URGENCY_CONFIG]?.label ?? 'Flexible'}`}
                  c={c}
                  onPress={() => onChange('urgency', urgencyChip)}
                />
              ) : null}
              {titleChip ? (
                <SuggestionChip
                  label={`Better title: ${titleChip}`}
                  c={c}
                  onPress={() => onChange('title', titleChip)}
                />
              ) : null}
            </View>
            {suggestions?.clarifyingQuestion ? (
              <Text style={[styles.clarify, { color: c.textSecondary }]}>{suggestions.clarifyingQuestion}</Text>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Trade Category */}
      <View>
        <FieldLabel required>Trade Category</FieldLabel>
        <SelectSheet
          value={tradeCategory}
          onChange={(v) => onChange('tradeCategory', v)}
          placeholder="Select a trade..."
          title="Trade Category"
          groups={TRADE_SELECT_GROUPS}
          error={errors.tradeCategory}
          accessibilityLabel="Trade Category"
        />
      </View>

      {/* Specialities — appears once a trade with sub-trades is picked */}
      {showSpecialities ? (
        <View>
          <FieldLabel optional>Specialities</FieldLabel>
          <Text style={[styles.helper, { color: c.textSecondary }]}>
            Tell tradies exactly what the job involves so the right specialists are recommended first.
          </Text>
          <SpecialityPicker
            selectedTrades={[tradeCategory]}
            value={specialisations}
            onChange={onSpecialisationsChange}
            triggerLabel="Pick a speciality"
            title="What kind of work?"
          />
        </View>
      ) : null}

      {/* Urgency */}
      <View accessibilityRole="radiogroup">
        <FieldLabel required>Urgency</FieldLabel>
        <View style={[styles.segment, { borderColor: c.border, backgroundColor: c.surface }]}>
          {URGENCY_OPTIONS.map((option, index) => {
            const selected = urgency === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => onChange('urgency', option.value)}
                style={({ pressed }) => [
                  styles.segmentItem,
                  index > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: c.border },
                  selected && { backgroundColor: c.primary },
                  !selected && pressed && { backgroundColor: c.primaryBg },
                ]}
              >
                <Text style={[styles.segmentText, { color: selected ? '#ffffff' : c.textSecondary }]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {errors.urgency ? <Text style={[styles.error, { color: c.error }]}>{errors.urgency}</Text> : null}
      </View>
    </View>
  );
}

function SuggestionChip({ label, c, onPress }: { label: string; c: Record<string, string>; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.suggestionChip,
        { borderColor: c.primary + '4D', backgroundColor: pressed ? c.primaryBg : c.surface },
      ]}
    >
      <Ionicons name="sparkles-outline" size={12} color={c.primary} />
      <Text style={[styles.suggestionChipText, { color: c.primary }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: { gap: Spacing.xl },
  h2: { fontSize: 20, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  helper: { fontSize: 12, lineHeight: 18, fontFamily: FontFamily.body, marginBottom: Spacing.sm },
  error: { fontSize: 14, marginTop: 6, fontFamily: FontFamily.body },
  analysingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  analysingText: { fontSize: 12, fontFamily: FontFamily.body },
  aiCard: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 12,
    gap: Spacing.sm,
  },
  aiTitle: { fontSize: 12, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: '100%',
  },
  suggestionChipText: { fontSize: 12, fontFamily: FontFamily.bodyMedium, fontWeight: '500', flexShrink: 1 },
  clarify: { fontSize: 12, fontFamily: FontFamily.body, fontStyle: 'italic' },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: { fontSize: 14, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
});
