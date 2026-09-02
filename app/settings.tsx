/**
 * /settings — port of ~/bldesy-web/app/settings/page.tsx, the canonical
 * multi-role settings page: Account (email + password), Notifications
 * (wired to /api/notifications/preferences), Appearance, Builder Subscription
 * (tradies), Company Settings (enterprise), Blocked users (Terms §6.8),
 * Delete Account, and the footer's Help & Legal links.
 *
 * The legacy app-only rows (Download my data, Language, Privacy settings →
 * legal, Roles) are gone — the web has none.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';

import { EmailLink } from '@/components/customer-dashboard/email-link';
import {
  NOTIFICATION_TOGGLES,
  THEME_OPTIONS,
  deleteAccountCopy,
  hasPasswordIdentity,
  themeLabel,
  togglePatch,
  toggleValue,
  type SettingsToggleKey,
  type ThemePreference,
} from '@/components/customer-dashboard/settings-model';
import { SettingsPasswordForm } from '@/components/customer-dashboard/settings-password';
import { SettingsToggleRow } from '@/components/customer-dashboard/settings-toggle-row';
import {
  applyThemePreference,
  loadThemePreference,
  saveThemePreference,
} from '@/components/customer-dashboard/theme-preference';
import { DeleteAccountModal } from '@/components/delete-account-modal';
import { FieldLabel } from '@/components/jobs/field-label';
import { AppShell } from '@/components/layout';
import { BlockedUsersList } from '@/components/messages/blocked-users-list';
import { Button, Card, Skeleton, useToast } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRoles, useUser } from '@/lib/auth-context';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '@/lib/data/notifications';
import { ROUTES, WEB_PAGES } from '@/lib/routes';
import { supabase } from '@/lib/supabase';

const THEME_ICONS: Record<ThemePreference, 'sunny-outline' | 'moon-outline' | 'phone-portrait-outline'> = {
  light: 'sunny-outline',
  dark: 'moon-outline',
  system: 'phone-portrait-outline',
};

export default function SettingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const toast = useToast();
  const { authedUser: user, loading } = useUser();
  const roles = useRoles();

  // Notification toggles — real preferences, not localStorage.
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  // Appearance
  const [theme, setTheme] = useState<ThemePreference>('system');
  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    loadThemePreference().then(setTheme);
  }, []);

  const loadPrefs = useCallback(async () => {
    if (!user) return;
    try {
      setPrefs(await getNotificationPreferences());
    } catch (e) {
      console.warn('notification preferences failed', e instanceof Error ? e.message : e);
    }
  }, [user]);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  async function handleToggle(toggleKey: SettingsToggleKey, value: boolean) {
    if (!prefs) return;
    const toggle = NOTIFICATION_TOGGLES.find((t) => t.key === toggleKey);
    if (!toggle) return;
    const patch = togglePatch(toggle, value);
    const previous = prefs;
    setPrefs({ ...prefs, ...patch });
    try {
      await updateNotificationPreferences(patch);
    } catch (e) {
      setPrefs(previous);
      toast.show(e instanceof Error ? e.message : 'Something went wrong. Please try again.', { variant: 'error' });
    }
  }

  async function handleTheme(option: ThemePreference) {
    setTheme(option);
    applyThemePreference(option);
    await saveThemePreference(option);
  }

  async function handleAccountDeleted() {
    setShowDeleteModal(false);
    await supabase.auth.signOut();
    router.replace(ROUTES.home as Href);
  }

  if (loading) {
    return (
      <AppShell showBack>
        <View style={styles.scroll}>
          <Skeleton variant="text" style={{ width: 160, height: 32, borderRadius: 8 }} />
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </View>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell showBack>
        <View style={styles.scroll}>
          <Card padding={Spacing['4xl']} style={styles.center}>
            <Ionicons name="lock-closed-outline" size={40} color={c.textSecondary} />
            <Text accessibilityRole="header" style={[styles.h1, { color: c.textPrimary, textAlign: 'center' }]}>
              Sign in required
            </Text>
            <Text style={[styles.body, { color: c.textSecondary, textAlign: 'center' }]}>
              You need to be signed in to access your settings.
            </Text>
            <Button onPress={() => router.push(ROUTES.login as Href)}>Sign In</Button>
          </Card>
        </View>
      </AppShell>
    );
  }

  const rolesReady = !roles.loading;

  return (
    <AppShell showBack>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text accessibilityRole="header" style={[styles.h1, { color: c.textPrimary }]}>
          Settings
        </Text>

        {/* Account */}
        <Section title="Account">
          <View style={{ gap: Spacing.lg }}>
            <View>
              <FieldLabel muted>Email address</FieldLabel>
              {user.email ? (
                <View style={[styles.readOnly, { backgroundColor: c.canvas, borderColor: c.border }]}>
                  <Text style={[styles.readOnlyText, { color: c.textSecondary }]}>{user.email}</Text>
                </View>
              ) : (
                <View style={{ gap: Spacing.sm }}>
                  <Text style={[styles.body, { color: c.textSecondary }]}>
                    No email on your login yet — verify one to get receipts and log in with it. We&apos;ll email
                    you a code to confirm it&apos;s yours.
                  </Text>
                  <EmailLink />
                </View>
              )}
            </View>
            {hasPasswordIdentity(user) ? <SettingsPasswordForm /> : null}
          </View>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" description="Choose which email notifications you'd like to receive.">
          <View style={{ gap: Spacing.lg }}>
            {NOTIFICATION_TOGGLES.map((toggle) => (
              <SettingsToggleRow
                key={toggle.key}
                label={toggle.label}
                description={toggle.description}
                checked={prefs ? toggleValue(prefs, toggle) : true}
                disabled={!prefs}
                onChange={(value) => handleToggle(toggle.key, value)}
              />
            ))}
          </View>
        </Section>

        {/* Appearance */}
        <Section title="Appearance" description="Choose how BLDESY! looks for you.">
          <View style={{ gap: Spacing.md }}>
            {THEME_OPTIONS.map((option) => {
              const selected = theme === option;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => handleTheme(option)}
                  style={[
                    styles.themeOption,
                    {
                      borderColor: selected ? c.primary : c.border,
                      backgroundColor: selected ? c.primary + '0D' : c.surface,
                    },
                  ]}
                >
                  <Ionicons name={THEME_ICONS[option]} size={20} color={selected ? c.primary : c.textSecondary} />
                  <Text style={[styles.themeLabel, { color: c.textPrimary }]}>{themeLabel(option)}</Text>
                  {selected ? (
                    <Ionicons name="checkmark" size={20} color={c.primary} style={{ marginLeft: 'auto' }} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </Section>

        {/* Builder subscription management — shown when user has a builder profile. */}
        {roles.isTradie ? (
          <Section
            title="Builder Subscription"
            description="Pause or cancel your BLDESY! tradie subscription. Your profile stays visible until the end of your billing period."
          >
            <View style={{ gap: Spacing.md }}>
              <Button variant="danger" fullWidth onPress={() => router.push(ROUTES.portalBilling as Href)}>
                Cancel Subscription
              </Button>
              <Text style={[styles.footnote, { color: c.textSecondary }]}>
                For availability, visibility, and profile content, head to{' '}
                <Text
                  accessibilityRole="link"
                  onPress={() => router.push(ROUTES.portalSettings as Href)}
                  style={[styles.footnoteLink, { color: c.primary }]}
                >
                  Builder Hub settings
                </Text>
                .
              </Text>
            </View>
          </Section>
        ) : null}

        {/* Enterprise company quick-link — shown when user has an enterprise profile. */}
        {roles.isEnterprise ? (
          <Section
            title="Company Settings"
            description="Update your company details, contact info, and billing preferences in the Enterprise Hub."
          >
            <View style={{ gap: Spacing.md }}>
              <IndigoOutlineButton label="Edit Company Info" onPress={() => router.push('/enterprise/settings' as Href)} />
              <IndigoOutlineButton label="Billing & Plans" onPress={() => router.push('/enterprise/billing' as Href)} />
            </View>
          </Section>
        ) : null}

        {/* Blocked users — Terms §6.8: "manage your block list in the app under Settings > Blocked users". */}
        <Section title="Blocked users" description="Manage who you've blocked">
          <BlockedUsersList />
        </Section>

        {/* Delete Account — always available, regardless of role. */}
        {rolesReady ? (
          <Section title="Delete Account" description={deleteAccountCopy(roles.isTradie, roles.isEnterprise)}>
            <Button variant="danger" onPress={() => setShowDeleteModal(true)}>
              Delete my account
            </Button>
          </Section>
        ) : null}

        {/* Help & Legal — the site footer's links. */}
        <View style={styles.footer}>
          <FooterLink label="Help & Support" onPress={() => router.push(ROUTES.help as Href)} />
          <FooterLink label="Terms" onPress={() => WebBrowser.openBrowserAsync(WEB_PAGES.terms).catch(() => {})} />
          <FooterLink label="Privacy" onPress={() => WebBrowser.openBrowserAsync(WEB_PAGES.privacy).catch(() => {})} />
          <FooterLink label="Cookies" onPress={() => WebBrowser.openBrowserAsync(WEB_PAGES.cookies).catch(() => {})} />
          <Text style={[styles.copyright, { color: c.textSecondary }]}>© 2026 BLDESY! All rights reserved.</Text>
        </View>
      </ScrollView>

      <DeleteAccountModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onDeleted={handleAccountDeleted}
      />
    </AppShell>
  );
}

/* ── Building blocks ─────────────────────────────────────────────────── */

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <Card padding={Spacing['2xl']}>
      <Text accessibilityRole="header" style={[styles.h2, { color: c.textPrimary }]}>
        {title}
      </Text>
      {description ? <Text style={[styles.sectionBody, { color: c.textSecondary }]}>{description}</Text> : null}
      <View style={{ marginTop: Spacing.lg }}>{children}</View>
    </Card>
  );
}

function IndigoOutlineButton({ label, onPress }: { label: string; onPress: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [
        styles.indigoBtn,
        { borderColor: c.indigo + '4D', backgroundColor: pressed ? c.indigo + '0D' : 'transparent' },
      ]}
    >
      <Text style={[styles.indigoBtnText, { color: c.indigo }]}>{label}</Text>
    </Pressable>
  );
}

function FooterLink({ label, onPress }: { label: string; onPress: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={6} style={styles.footerLink}>
      <Text style={[styles.footerLinkText, { color: c.textSecondary }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={c.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.lg,
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing['5xl'],
    gap: Spacing['2xl'],
  },
  center: { alignItems: 'center', gap: Spacing.md },
  h1: { fontSize: 30, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  h2: { fontSize: 18, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  body: { fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body },
  sectionBody: { fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body, marginTop: 4 },
  readOnly: { borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: 10 },
  readOnlyText: { fontSize: 14, fontFamily: FontFamily.body },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 2,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
  },
  themeLabel: { fontSize: 14, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
  footnote: { fontSize: 12, lineHeight: 18, fontFamily: FontFamily.body },
  footnoteLink: { fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  indigoBtn: { borderWidth: 2, borderRadius: Radius.lg, paddingVertical: 12, alignItems: 'center' },
  indigoBtnText: { fontSize: 14, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  footer: { gap: 2, paddingTop: Spacing.sm },
  footerLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  footerLinkText: { fontSize: 14, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
  copyright: { fontSize: 11, fontFamily: FontFamily.body, marginTop: Spacing.lg },
});
