/**
 * Step 2 — Describe Your Job. Port of ~/bldesy-web/components/jobs/step-description.tsx:
 * the description textarea with the "Write it for me" `ai-job-suggest` button,
 * the 20-character minimum hint and the optional AUD budget.
 *
 * App superset (App Store third-party AI disclosure): the explicit AI action
 * shows the consent modal on first use before any text leaves the device.
 */
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useAiConsent } from '@/components/ai-consent-modal';
import { Input } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

import { FieldLabel } from './field-label';
import { DESCRIPTION_MIN_LENGTH } from './wizard-model';

export type DescriptionField = 'description' | 'budget';

/** Verbatim step-description.tsx copy. */
export const AI_SIGN_IN_REQUIRED = 'Please sign in to use AI suggestions.';
export const AI_DESCRIBE_FAILED = 'Could not generate description. Try writing it yourself.';

interface StepDescriptionProps {
  description: string;
  budget: string;
  tradeCategory?: string;
  title?: string;
  onChange: (field: DescriptionField, value: string) => void;
  errors: Record<string, string>;
  canUseAi: boolean;
}

export function StepDescription({
  description,
  budget,
  tradeCategory,
  title,
  onChange,
  errors,
  canUseAi,
}: StepDescriptionProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { ensureConsent, consentModal } = useAiConsent();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function handleWriteForMe() {
    setAiError(null);
    if (!canUseAi) {
      setAiError(AI_SIGN_IN_REQUIRED);
      return;
    }
    if (!(await ensureConsent())) return;

    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-job-suggest', {
        body: { title: title || '', trade_type: tradeCategory || '', mode: 'describe' },
      });
      const generated =
        !error && data && typeof (data as { description?: unknown }).description === 'string'
          ? ((data as { description: string }).description as string)
          : null;
      if (generated) onChange('description', generated);
      else setAiError(AI_DESCRIBE_FAILED);
    } catch {
      setAiError(AI_DESCRIBE_FAILED);
    }
    setAiLoading(false);
  }

  const metMinimum = description.length >= DESCRIPTION_MIN_LENGTH;

  return (
    <View style={styles.stack}>
      <Text style={[styles.h2, { color: c.textPrimary }]}>Describe Your Job</Text>

      {/* Description */}
      <View>
        <View style={styles.labelRow}>
          <FieldLabel required>Description</FieldLabel>
          <Pressable
            accessibilityRole="button"
            onPress={handleWriteForMe}
            disabled={aiLoading}
            style={({ pressed }) => [
              styles.aiButton,
              {
                borderColor: c.primary + '4D',
                backgroundColor: pressed ? c.primaryBg : c.primaryBg + '80',
                opacity: aiLoading ? 0.5 : 1,
              },
            ]}
          >
            {aiLoading ? (
              <>
                <ActivityIndicator size="small" color={c.primary} />
                <Text style={[styles.aiButtonText, { color: c.primary }]}>Writing...</Text>
              </>
            ) : (
              <>
                <Ionicons name="sparkles-outline" size={14} color={c.primary} />
                <Text style={[styles.aiButtonText, { color: c.primary }]}>Write it for me</Text>
              </>
            )}
          </Pressable>
        </View>
        {aiError ? <Text style={[styles.aiError, { color: c.warning }]}>{aiError}</Text> : null}
        <Input
          value={description}
          onChangeText={(t) => onChange('description', t)}
          placeholder="Describe what you need done..."
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          style={styles.textarea}
          accessibilityLabel="Description"
          helper={`${description.length}/${DESCRIPTION_MIN_LENGTH} characters minimum`}
          error={errors.description}
        />
        {!errors.description && metMinimum ? (
          <Text style={[styles.metHint, { color: c.success }]}>
            {description.length}/{DESCRIPTION_MIN_LENGTH} characters minimum
          </Text>
        ) : null}
      </View>

      {/* Budget */}
      <View>
        <FieldLabel>Budget (AUD)</FieldLabel>
        <Input
          value={budget}
          onChangeText={(t) => onChange('budget', t.replace(/[^0-9.]/g, ''))}
          placeholder="Optional — enter your budget"
          keyboardType="decimal-pad"
          leading={<Text style={[styles.dollar, { color: c.textSecondary }]}>$</Text>}
          accessibilityLabel="Budget (AUD)"
        />
      </View>

      {consentModal}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: Spacing.xl },
  h2: { fontSize: 20, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 6,
  },
  aiButtonText: { fontSize: 12, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  aiError: { fontSize: 12, fontFamily: FontFamily.body, marginBottom: Spacing.sm },
  textarea: { minHeight: 120 },
  metHint: { fontSize: 12, marginTop: -14, fontFamily: FontFamily.body },
  dollar: { fontSize: 14, fontFamily: FontFamily.body },
});
