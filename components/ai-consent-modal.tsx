import { useCallback, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { hasAiConsent, setAiConsent } from '@/lib/ai-consent';

interface ModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * First-run disclosure shown before any AI feature sends the user's text to
 * Anthropic. Explicit, App-Store-compliant consent for third-party processing.
 */
export function AiConsentModal({ visible, onAccept, onDecline }: ModalProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDecline}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: scheme === 'dark' ? c.surface : '#fff' }]}>
          <View style={[styles.iconWrap, { backgroundColor: c.primary + '14' }]}>
            <Ionicons name="sparkles-outline" size={26} color={c.primary} />
          </View>
          <Text style={[styles.title, { color: c.textPrimary }]}>Before you use AI</Text>
          <Text style={[styles.body, { color: c.textSecondary }]}>
            BLDESY&apos;s AI features are powered by{' '}
            <Text style={{ fontWeight: '700', color: c.textPrimary }}>Anthropic (Claude)</Text>, a
            third-party AI provider. The text you enter is sent to Anthropic (overseas, including the
            US) to generate a response.
          </Text>
          <View style={styles.points}>
            <Bullet c={c} text="Don't share sensitive personal or financial details." />
            <Bullet c={c} text="Responses are AI-generated and may be inaccurate — always double-check." />
            <Bullet c={c} text="See our Privacy Policy for how this data is handled." />
          </View>

          <Pressable
            onPress={onAccept}
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>I understand, continue</Text>
          </Pressable>
          <Pressable onPress={onDecline} style={styles.secondaryBtn} accessibilityRole="button">
            <Text style={[styles.secondaryText, { color: c.textSecondary }]}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Bullet({ c, text }: { c: (typeof Colors)['light']; text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Ionicons name="checkmark-circle" size={16} color={c.primary} style={{ marginTop: 1 }} />
      <Text style={[styles.bulletText, { color: c.textSecondary }]}>{text}</Text>
    </View>
  );
}

/**
 * Hook that gates AI actions behind one-time consent. Usage:
 *   const { ensureConsent, consentModal } = useAiConsent();
 *   // before an AI call:
 *   if (!(await ensureConsent())) return;
 *   // render {consentModal} somewhere in the tree.
 */
export function useAiConsent() {
  const [visible, setVisible] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const ensureConsent = useCallback(async (): Promise<boolean> => {
    if (await hasAiConsent()) return true;
    setVisible(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const handleAccept = useCallback(async () => {
    await setAiConsent();
    setVisible(false);
    resolver.current?.(true);
    resolver.current = null;
  }, []);

  const handleDecline = useCallback(() => {
    setVisible(false);
    resolver.current?.(false);
    resolver.current = null;
  }, []);

  const consentModal = (
    <AiConsentModal visible={visible} onAccept={handleAccept} onDecline={handleDecline} />
  );

  return { ensureConsent, consentModal };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    gap: Spacing.md,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  points: { alignSelf: 'stretch', gap: Spacing.sm, marginTop: Spacing.xs },
  bulletRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  bulletText: { fontSize: 13, lineHeight: 19, flex: 1 },
  primaryBtn: {
    alignSelf: 'stretch',
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: Spacing.sm,
  },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: { paddingVertical: Spacing.sm, alignItems: 'center' },
  secondaryText: { fontSize: 14, fontWeight: '600' },
});
