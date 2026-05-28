import { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { AppShell } from '@/components/layout';
import { Button, Card, Input, useToast } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { useRoles, useUser } from '@/lib/auth-context';
import { DeleteAccountModal } from '@/components/delete-account-modal';

type SectionRow = {
  key: string;
  label: string;
  subtitle?: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  onPress?: () => void;
  rightElement?: React.ReactNode;
  destructive?: boolean;
};

type SectionConfig = {
  title: string;
  rows: SectionRow[];
};

export default function SettingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const toast = useToast();
  const { userId, user: authUser } = useUser();
  const { isBuilder, isEnterprise } = useRoles();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      (async () => {
        setUserEmail(authUser?.email ?? null);
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', userId)
          .single();
        setFullName(profile?.name ?? null);
      })();
    }, [userId, authUser]),
  );

  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  function openChangeEmail() {
    setNewEmail(userEmail ?? '');
    setEmailModalVisible(true);
  }

  async function submitEmailChange() {
    if (!newEmail?.trim()) return;
    setEmailSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setEmailSaving(false);
    setEmailModalVisible(false);
    if (error) {
      toast.show("Couldn't update email", { variant: 'error' });
    } else {
      toast.show('Confirmation link sent to your new email', { variant: 'success' });
    }
  }

  function handleChangePassword() {
    Alert.alert(
      'Reset password',
      "We'll send a password reset link to your email.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send link',
          onPress: async () => {
            if (!userEmail) return;
            const { error } = await supabase.auth.resetPasswordForEmail(userEmail);
            if (error) toast.show("Couldn't send reset link", { variant: 'error' });
            else toast.show('Check your inbox for the reset link', { variant: 'success' });
          },
        },
      ],
    );
  }

  async function handleAccountDeleted() {
    setDeleteModalVisible(false);
    await supabase.auth.signOut();
    router.replace('/');
  }

  const sections: SectionConfig[] = [
    {
      title: 'Account',
      rows: [
        {
          key: 'profile',
          label: fullName || 'My Profile',
          subtitle: 'Name, phone, and avatar',
          icon: 'person-outline',
          onPress: () => router.push('/edit-profile' as any),
        },
        {
          key: 'email',
          label: 'Email address',
          subtitle: userEmail ?? 'Not signed in',
          icon: 'email',
          onPress: openChangeEmail,
        },
        {
          key: 'password',
          label: 'Change password',
          subtitle: 'Reset via email link',
          icon: 'lock-outline',
          onPress: handleChangePassword,
        },
      ],
    },
    {
      title: 'Roles',
      rows: [
        isBuilder
          ? {
              key: 'role-builder',
              label: 'Tradie profile',
              subtitle: 'Edit your tradie profile and credentials',
              icon: 'construction' as const,
              onPress: () => router.push('/builder-edit-profile' as any),
            }
          : {
              key: 'role-builder-add',
              label: 'Become a tradie',
              subtitle: 'List yourself in search and apply to jobs',
              icon: 'construction' as const,
              onPress: () => router.push('/builder-signup' as any),
            },
        isEnterprise
          ? {
              key: 'role-enterprise',
              label: 'Company profile',
              subtitle: 'Manage your company and job posts',
              icon: 'business' as const,
              onPress: () => router.push('/enterprise-edit-profile' as any),
            }
          : {
              key: 'role-enterprise-add',
              label: 'List your company',
              subtitle: 'Post jobs and hire verified tradies',
              icon: 'business' as const,
              onPress: () => router.push('/enterprise-signup' as any),
            },
        {
          key: 'role-billing',
          label: 'Billing & subscription',
          subtitle: 'Plan, payment method, invoices',
          icon: 'credit-card' as const,
          onPress: () => router.push('/billing' as any),
        },
      ],
    },
    {
      title: 'Notifications',
      rows: [
        {
          key: 'push',
          label: 'Push notifications',
          subtitle: 'Job updates and messages',
          icon: 'notifications-none',
          rightElement: (
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              trackColor={{ false: c.border, true: c.primary + '66' }}
              thumbColor={pushNotifications ? c.primary : c.textSecondary}
            />
          ),
        },
        {
          key: 'emailNotif',
          label: 'Email notifications',
          subtitle: 'Weekly digest and alerts',
          icon: 'mark-email-unread',
          rightElement: (
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              trackColor={{ false: c.border, true: c.primary + '66' }}
              thumbColor={emailNotifications ? c.primary : c.textSecondary}
            />
          ),
        },
        {
          key: 'sms',
          label: 'SMS notifications',
          subtitle: 'Urgent job alerts only',
          icon: 'sms',
          rightElement: (
            <Switch
              value={smsNotifications}
              onValueChange={setSmsNotifications}
              trackColor={{ false: c.border, true: c.primary + '66' }}
              thumbColor={smsNotifications ? c.primary : c.textSecondary}
            />
          ),
        },
      ],
    },
    {
      title: 'Preferences',
      rows: [
        {
          key: 'language',
          label: 'Language',
          subtitle: 'English (AU)',
          icon: 'language',
          onPress: () => toast.show('English (AU) is the only supported language for now', { duration: 4000 }),
        },
        {
          key: 'appearance',
          label: 'Appearance',
          subtitle: scheme === 'dark' ? 'Dark mode (system)' : 'Light mode (system)',
          icon: scheme === 'dark' ? 'dark-mode' : 'light-mode',
          onPress: () => toast.show('BLDESY follows your device appearance setting', { duration: 4000 }),
        },
      ],
    },
    {
      title: 'Privacy & data',
      rows: [
        {
          key: 'privacy',
          label: 'Privacy settings',
          subtitle: 'Profile visibility and data sharing',
          icon: 'shield',
          onPress: () => router.push('/legal' as any),
        },
        {
          key: 'download',
          label: 'Download my data',
          subtitle: 'Request a copy of your data',
          icon: 'download',
          onPress: () => toast.show("Export requested — we'll email you within 48 hours", { variant: 'success', duration: 4000 }),
        },
        {
          key: 'delete',
          label: 'Delete account',
          subtitle: 'Permanently remove all data',
          icon: 'delete-outline',
          onPress: () => setDeleteModalVisible(true),
          destructive: true,
        },
      ],
    },
  ];

  return (
    <AppShell title="Settings" showBack>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
              {section.title}
            </Text>
            <Card style={styles.card}>
              {section.rows.map((row, index) => (
                <Pressable
                  key={row.key}
                  onPress={row.onPress}
                  disabled={!row.onPress}
                  accessibilityRole="button"
                  accessibilityLabel={row.label}
                  style={({ pressed }) => [
                    styles.row,
                    index > 0 && { borderTopColor: c.borderLight, borderTopWidth: StyleSheet.hairlineWidth },
                    pressed && row.onPress && { backgroundColor: c.canvas },
                  ]}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      {
                        backgroundColor: row.destructive ? c.errorBg : c.primaryBg,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={row.icon}
                      size={18}
                      color={row.destructive ? c.error : c.primary}
                    />
                  </View>
                  <View style={styles.rowText}>
                    <Text
                      style={[
                        styles.rowLabel,
                        { color: row.destructive ? c.error : c.textPrimary },
                      ]}
                    >
                      {row.label}
                    </Text>
                    {row.subtitle ? (
                      <Text style={[styles.rowSubtitle, { color: c.textSecondary }]} numberOfLines={1}>
                        {row.subtitle}
                      </Text>
                    ) : null}
                  </View>
                  {row.rightElement ??
                    (row.onPress ? (
                      <MaterialIcons name="chevron-right" size={18} color={c.textSecondary} />
                    ) : null)}
                </Pressable>
              ))}
            </Card>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: c.textSecondary }]}>BLDESY! v1.0.0</Text>
          <Text style={[styles.footerText, { color: c.textSecondary }]}>Made with ❤️ in Australia</Text>
        </View>
      </ScrollView>

      <DeleteAccountModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onDeleted={handleAccountDeleted}
      />

      {/* Change-email modal — Toast-style would lose the input, so keep a sheet here. */}
      <Modal
        visible={emailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEmailModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setEmailModalVisible(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: c.textPrimary }]}>Change email</Text>
            <Text style={[styles.modalSubtitle, { color: c.textSecondary }]}>
              Enter your new email address. We&apos;ll send a confirmation link.
            </Text>
            <Input
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="Email address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.modalActions}>
              <Button variant="ghost" onPress={() => setEmailModalVisible(false)}>
                Cancel
              </Button>
              <Button variant="primary" onPress={submitEmailChange} disabled={emailSaving}>
                {emailSaving ? 'Saving…' : 'Update'}
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['5xl'],
    gap: Spacing['2xl'],
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: Spacing.sm,
  },
  card: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.body,
  },
  footer: {
    alignItems: 'center',
    gap: 2,
    paddingTop: Spacing.xl,
  },
  footerText: {
    fontSize: 11,
    fontFamily: FontFamily.body,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing['2xl'],
    gap: Spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: FontFamily.body,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
});
