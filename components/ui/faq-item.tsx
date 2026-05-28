/**
 * FaqItem — expand/collapse accordion item. Mirrors web `components/ui/faq-item.tsx`.
 */

import { useState } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FaqItemProps {
  question: string;
  answer: React.ReactNode;
  /** Start expanded. */
  defaultOpen?: boolean;
}

export function FaqItem({ question, answer, defaultOpen = false }: FaqItemProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [open, setOpen] = useState(defaultOpen);

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  }

  return (
    <View style={[styles.wrap, { borderColor: c.border, backgroundColor: c.surface }]}>
      <Pressable
        onPress={toggle}
        style={styles.row}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={[styles.question, { color: c.textPrimary }]}>{question}</Text>
        <Text style={[styles.chevron, { color: c.textSecondary, transform: [{ rotate: open ? '180deg' : '0deg' }] }]}>
          ⌄
        </Text>
      </Pressable>
      {open ? (
        <View style={styles.answerWrap}>
          {typeof answer === 'string' ? (
            <Text style={[styles.answer, { color: c.textSecondary }]}>{answer}</Text>
          ) : (
            answer
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  question: {
    flex: 1,
    fontSize: 15,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 20,
    lineHeight: 20,
    fontFamily: FontFamily.bodyBold,
  },
  answerWrap: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  answer: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FontFamily.body,
  },
});
