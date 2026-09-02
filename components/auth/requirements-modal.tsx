/**
 * "What you'll need" checklist shown before a FRESH tradie/enterprise signup
 * so people arrive prepared and don't bail halfway through the web wizard.
 * Copy is the website's `components/onboarding/requirements-modal.tsx`,
 * verbatim.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type RequirementsRole = 'builder' | 'enterprise';

const REQUIREMENTS: Record<RequirementsRole, { intro: string; items: string[] }> = {
  builder: {
    intro: 'Setting up takes about 5 minutes. Have these handy:',
    items: [
      'Your ABN',
      'Trade licence number (if your trade needs one)',
      'White Card (for NSW construction work)',
      "Photo ID — driver's licence (physical or NSW digital licence) or passport",
      'Insurance certificate (optional — boosts your profile)',
    ],
  },
  enterprise: {
    intro: 'Have these handy to finish your company listing:',
    items: [
      'Company ABN',
      'Contractor / builder licence (if you do construction work)',
      "Photo ID — driver's licence (physical or NSW digital licence) or passport",
      'Insurance certificate (optional)',
    ],
  },
};

interface Props {
  role: RequirementsRole;
  onClose: () => void;
  onContinue: () => void;
}

export function RequirementsModal({ role, onClose, onContinue }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = role === 'enterprise' ? c.indigo : c.primary;
  const { intro, items } = REQUIREMENTS[role];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Close">
        <Pressable
          accessibilityViewIsModal
          onPress={() => {}}
          style={[styles.card, Shadows['2xl'], { backgroundColor: c.surface }]}
        >
          <View style={[styles.iconWrap, { backgroundColor: accent + '1A' }]}>
            <Ionicons name="document-text-outline" size={24} color={accent} />
          </View>

          <Text accessibilityRole="header" style={[styles.title, { color: c.textPrimary }]}>
            Before you start
          </Text>
          <Text style={[styles.intro, { color: c.textSecondary }]}>{intro}</Text>

          <View style={styles.list}>
            {items.map((item) => (
              <View key={item} style={styles.row}>
                <Ionicons name="checkmark" size={16} color={accent} style={styles.check} />
                <Text style={[styles.item, { color: c.textPrimary }]}>{item}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.note, { color: c.textSecondary }]}>
            Don&apos;t have everything yet? You can save and come back anytime.
          </Text>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onContinue}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: accent, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <Text style={styles.primaryLabel}>I&apos;m ready — continue</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { borderColor: c.border, backgroundColor: pressed ? c.canvas : c.surface },
              ]}
            >
              <Text style={[styles.secondaryLabel, { color: c.textPrimary }]}>Not now</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 448,
    borderRadius: Radius.xl,
    padding: Spacing['2xl'],
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 18,
    lineHeight: 28,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  intro: {
    marginTop: Spacing.sm,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  list: {
    marginTop: Spacing.lg,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  check: {
    marginTop: 2,
  },
  item: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  note: {
    marginTop: Spacing.lg,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
    opacity: 0.7,
  },
  actions: {
    marginTop: Spacing['2xl'],
    gap: Spacing.md,
  },
  primaryBtn: {
    height: 44,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  primaryLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  secondaryBtn: {
    height: 44,
    borderRadius: Radius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  secondaryLabel: {
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
});
