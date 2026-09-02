/**
 * FAQItem — port of ~/bldesy-web/components/ui/faq-item.tsx: a rounded-2xl
 * surface card, question row with a chevron that rotates when open, answer
 * revealed underneath. Controlled (`open` + `onToggle`) like the web so a page
 * can keep one item open at a time.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { CHEVRON_DOWN_PATH, HeroIcon } from './hero-icon';

export interface FAQ {
  question: string;
  answer: string;
}

interface FAQItemProps extends FAQ {
  open: boolean;
  onToggle: () => void;
}

export function FAQItem({ question, answer, open, onToggle }: FAQItemProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.canvas + '80' }]}
      >
        <Text style={[styles.question, { color: c.textPrimary }]}>{question}</Text>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <HeroIcon d={CHEVRON_DOWN_PATH} size={20} color={c.textSecondary} strokeWidth={2} />
        </View>
      </Pressable>
      {open ? <Text style={[styles.answer, { color: c.textSecondary }]}>{answer}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  question: {
    flex: 1,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 20,
  },
  answer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 22,
  },
});
