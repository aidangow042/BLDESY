/**
 * "Send a Message" — port of ~/bldesy-web/components/messages/send-message-button.tsx.
 * Find-or-creates the conversation through the website API
 * (lib/data/messages.ts createConversation) and opens it on the surface the
 * user is standing in (`basePath?c=`). Guests get the website's sign-in
 * prompt instead of a hard redirect.
 */
import { useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useToast } from '@/components/ui';
import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ApiError } from '@/lib/api';
import { useUser } from '@/lib/auth-context';
import { conversationErrorMessage, createConversation } from '@/lib/data/messages';
import { ROUTES } from '@/lib/routes';

export type MessagesBasePath = '/messages' | '/portal/messages';

interface SendMessageButtonProps {
  recipientId: string;
  /** Which inbox the new conversation opens in (default: the shared /messages). */
  basePath?: MessagesBasePath;
  /** Custom trigger content; default = the website's card row. */
  children?: ReactNode;
  style?: ViewStyle;
}

export function SendMessageButton({ recipientId, basePath = '/messages', children, style }: SendMessageButtonProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const toast = useToast();
  const { user, loading: authLoading } = useUser();
  const [loading, setLoading] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);

  async function handlePress() {
    // Unauthenticated users see the friendly sign-in prompt instead of a
    // hard redirect — gives them context for why they need to sign up.
    if (!authLoading && !user) {
      setShowSignInModal(true);
      return;
    }
    setLoading(true);
    try {
      const conversationId = await createConversation(recipientId);
      router.push(`${basePath}?c=${conversationId}` as Href);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        // Auth state was stale — fall back to the same modal.
        setShowSignInModal(true);
      } else {
        toast.show(conversationErrorMessage(e), { variant: 'error' });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Pressable
        onPress={handlePress}
        disabled={loading}
        accessibilityRole="button"
        accessibilityState={{ disabled: loading, busy: loading }}
        style={[
          children ? undefined : [styles.card, { backgroundColor: c.primary + '0D', borderColor: c.primary + '33' }],
          loading && styles.dim,
          style,
        ]}
      >
        {children ?? (
          <>
            <MaterialIcons name="chat-bubble-outline" size={20} color={c.primary} />
            <View style={styles.cardText}>
              <Text style={[styles.cardLabel, { color: c.primary }]}>MESSAGE</Text>
              <Text style={[styles.cardValue, { color: c.textPrimary }]}>
                {loading ? 'Opening...' : 'Send a Message'}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={16} color={c.primary + '80'} />
          </>
        )}
      </Pressable>

      <Modal
        visible={showSignInModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignInModal(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowSignInModal(false)} accessibilityLabel="Close">
          <Pressable
            style={[styles.modalCard, Shadows.xl, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => {}}
          >
            <View style={styles.modalTop}>
              <View style={[styles.modalIcon, { backgroundColor: c.primaryBg }]}>
                <MaterialIcons name="mail-outline" size={24} color={c.primary} />
              </View>
              <Pressable
                onPress={() => setShowSignInModal(false)}
                style={styles.modalClose}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <MaterialIcons name="close" size={20} color={c.textSecondary} />
              </Pressable>
            </View>
            <Text style={[styles.modalTitle, { color: c.textPrimary }]} accessibilityRole="header">
              Sign in to message this builder
            </Text>
            <Text style={[styles.modalBody, { color: c.textSecondary }]}>
              You need a free BLDESY! account to send a direct message. It only takes a minute — and
              you&apos;ll be able to track quotes, save tradies, and post jobs too.
            </Text>
            <Pressable
              onPress={() => {
                setShowSignInModal(false);
                router.push(ROUTES.signup as Href);
              }}
              style={[styles.modalPrimary, { backgroundColor: c.primary }]}
              accessibilityRole="button"
            >
              <Text style={styles.modalPrimaryText}>Create a free account</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setShowSignInModal(false);
                router.push(ROUTES.login as Href);
              }}
              style={[styles.modalSecondary, { backgroundColor: c.surface, borderColor: c.border }]}
              accessibilityRole="button"
            >
              <Text style={[styles.modalSecondaryText, { color: c.textPrimary }]}>I already have an account</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    width: '100%',
  },
  dim: { opacity: 0.7 },
  cardText: { flex: 1, minWidth: 0 },
  cardLabel: { fontSize: 12, fontFamily: FontFamily.bodySemiBold, fontWeight: '600', letterSpacing: 1 },
  cardValue: { fontSize: 14, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: { width: '100%', maxWidth: 384, borderRadius: Radius.xl, borderWidth: 1, padding: Spacing['2xl'] },
  modalTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing.md },
  modalIcon: { width: 44, height: 44, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  modalClose: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 18, lineHeight: 28, fontFamily: FontFamily.bodyBold, fontWeight: '700', marginBottom: 4 },
  modalBody: { fontSize: 14, lineHeight: 22, fontFamily: FontFamily.body, marginBottom: Spacing.xl },
  modalPrimary: { borderRadius: Radius.lg, paddingVertical: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  modalPrimaryText: { color: '#fff', fontSize: 14, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  modalSecondary: {
    marginTop: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingVertical: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryText: { fontSize: 14, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
});
