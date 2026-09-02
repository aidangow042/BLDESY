/**
 * DeleteJobModal — the "Delete job?" confirmation in
 * ~/bldesy-web/app/my-jobs/page.tsx. Tap outside / back closes it unless a
 * delete is in flight.
 */
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button, Card } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface DeleteJobModalProps {
  title: string | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteJobModal({ title, deleting, onCancel, onConfirm }: DeleteJobModalProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const visible = title !== null;

  function close() {
    if (!deleting) onCancel();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <Pressable accessibilityLabel="Close" style={styles.overlay} onPress={close}>
        <Pressable onPress={() => {}} style={styles.cardWrap} accessibilityViewIsModal>
          <Card padding={Spacing['2xl']} style={styles.card}>
            <View style={[styles.icon, { backgroundColor: c.errorBg }]}>
              <Ionicons name="trash-outline" size={22} color={c.error} />
            </View>
            <Text accessibilityRole="header" style={[styles.title, { color: c.textPrimary }]}>
              Delete job?
            </Text>
            <Text style={[styles.body, { color: c.textSecondary }]}>
              Are you sure you want to delete &ldquo;{title}&rdquo;? This action cannot be undone.
            </Text>
            <View style={styles.actions}>
              <Button variant="ghost" onPress={onCancel} disabled={deleting}>
                Cancel
              </Button>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: deleting, busy: deleting }}
                disabled={deleting}
                onPress={onConfirm}
                style={({ pressed }) => [
                  styles.deleteBtn,
                  { backgroundColor: c.error, opacity: deleting ? 0.5 : pressed ? 0.9 : 1 },
                ]}
              >
                <Text style={styles.deleteText}>{deleting ? 'Deleting...' : 'Delete'}</Text>
              </Pressable>
            </View>
          </Card>
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
    padding: Spacing.lg,
  },
  cardWrap: { width: '100%', maxWidth: 384 },
  card: { gap: Spacing.xs },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: { fontSize: 18, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body, marginTop: 4, marginBottom: Spacing.xl },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.md },
  deleteBtn: { borderRadius: Radius.xl, paddingHorizontal: Spacing.xl, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  deleteText: { color: '#ffffff', fontSize: 14, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
});
