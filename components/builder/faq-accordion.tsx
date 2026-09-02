/**
 * FaqAccordion — ~/bldesy-web/components/builder/faq-accordion.tsx:
 * "Frequently Asked Questions", one question open at a time.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { str } from '@/components/builder/profile-helpers';
import { ProfileSection } from '@/components/builder/profile-section';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { FaqItem } from '@/types';

export function FaqAccordion({ faqs }: { faqs: FaqItem[] | null }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [open, setOpen] = useState<number | null>(null);
  if (!faqs || faqs.length === 0) return null;

  return (
    <ProfileSection title="Frequently Asked Questions">
      <View>
        {faqs.map((faq, index) => {
          const isOpen = open === index;
          return (
            <View key={index} style={[index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                onPress={() => setOpen(isOpen ? null : index)}
                style={styles.question}
              >
                <Text style={[styles.questionText, { color: isOpen ? c.primary : c.textPrimary }]}>{str(faq.question)}</Text>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={c.textSecondary} />
              </Pressable>
              {isOpen ? <Text style={[styles.answer, { color: c.textSecondary }]}>{str(faq.answer)}</Text> : null}
            </View>
          );
        })}
      </View>
    </ProfileSection>
  );
}

const styles = StyleSheet.create({
  question: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  questionText: {
    flex: 1,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 20,
  },
  answer: {
    paddingBottom: Spacing.lg,
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 22,
  },
});
