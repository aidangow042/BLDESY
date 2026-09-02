/**
 * StepIndicator — port of ~/bldesy-web/components/jobs/step-indicator.tsx:
 * numbered 32px circles (active = primary, completed = primary/20 + check,
 * upcoming = border) joined by hairlines, with the step label beneath.
 */
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const DEFAULT_STEP_LABELS = ['Details', 'Description', 'Location', 'Review'] as const;

interface StepIndicatorProps {
  currentStep: number;
  /** Optional custom step labels. Defaults to the homeowner 4-step flow. */
  labels?: readonly string[];
}

export function StepIndicator({ currentStep, labels }: StepIndicatorProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const stepLabels = labels ?? DEFAULT_STEP_LABELS;

  return (
    <View style={styles.row} accessibilityRole="progressbar">
      {stepLabels.map((label, index) => {
        const stepNum = index + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;
        return (
          <View key={label} style={styles.stepWrap}>
            <View style={styles.step}>
              <View
                accessibilityLabel={`Step ${stepNum}: ${label}${isActive ? ', current' : isCompleted ? ', completed' : ''}`}
                style={[
                  styles.circle,
                  {
                    backgroundColor: isActive
                      ? c.primary
                      : isCompleted
                        ? c.primary + '33'
                        : c.border,
                  },
                ]}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={16} color={c.primary} />
                ) : (
                  <Text
                    style={[
                      styles.number,
                      { color: isActive ? '#ffffff' : c.textSecondary },
                    ]}
                  >
                    {stepNum}
                  </Text>
                )}
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  isActive ? styles.labelActive : null,
                  { color: isActive ? c.primary : c.textSecondary },
                ]}
              >
                {label}
              </Text>
            </View>
            {index < stepLabels.length - 1 ? (
              <View
                style={[
                  styles.connector,
                  { backgroundColor: isCompleted ? c.primary : c.border },
                ]}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  stepWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  step: {
    alignItems: 'center',
    gap: 4,
    minWidth: 56,
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontSize: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  label: {
    fontSize: 11,
    fontFamily: FontFamily.body,
  },
  labelActive: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  connector: {
    height: StyleSheet.hairlineWidth * 2,
    width: Spacing.lg,
    marginTop: 16,
    marginHorizontal: -Spacing.sm,
  },
});
