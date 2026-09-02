/**
 * /portal/settings — port of `~/bldesy-web/app/portal/settings/page.tsx`.
 *
 * Account (email / password), Profile Status (pause / go live mirror),
 * Profile Visibility link, Work status, the Notification Centre (email / push /
 * SMS), Phone login, Subscription (cancel — keep or delete tradie data) and
 * Delete Account. Every write goes through lib/data/{settings,portal,
 * availability,billing}.
 */
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { EmailLink } from '@/components/auth/email-link';
import { PasswordInput } from '@/components/auth/password-input';
import { PhoneLink } from '@/components/auth/phone-link';
import { DeleteAccountModal } from '@/components/delete-account-modal';
import { usePortal } from '@/components/portal/portal-context';
import { PortalPage } from '@/components/portal/portal-page';
import { NotificationCentre } from '@/components/settings/notification-centre';
import { Card, Input, ToggleSwitch } from '@/components/ui';
import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ApiError } from '@/lib/api';
import { useUser } from '@/lib/auth-context';
import { saveAvailabilityStatus } from '@/lib/data/availability';
import { cancelSubscription } from '@/lib/data/billing';
import { setProfilePaused } from '@/lib/data/portal';
import {
  changePassword,
  deleteBuilderProfile,
  ERR_DELETE_PROFILE_FAILED,
  ERR_PASSWORD_UPDATE,
  saveSmsPhone,
  setSmsAlerts,
  validatePasswordChange,
} from '@/lib/data/settings';
import { ROUTES } from '@/lib/routes';
import { getAvailability } from '@/lib/web/availability';
import type { AvailabilityStatus } from '@/types/database';

type Msg = { type: 'success' | 'error'; text: string } | null;

/* ── Main component ───────────────────────────────────────────────── */

export default function SettingsPage() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const { user } = useUser();
  const { profile, refreshProfile } = usePortal();

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<Msg>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Availability
  const [availability, setAvailability] = useState<AvailabilityStatus>(profile?.availability ?? 'available');
  const [availabilityUpdating, setAvailabilityUpdating] = useState(false);

  // Pause / go live
  const [pausedAt, setPausedAt] = useState<string | null>(profile?.search_paused_at ?? null);
  const [pauseSaving, setPauseSaving] = useState(false);

  // SMS job alerts (persisted to builder_profiles)
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsPhone, setSmsPhone] = useState('');
  const [smsSaving, setSmsSaving] = useState(false);
  const [smsMsg, setSmsMsg] = useState<Msg>(null);

  // Modals
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  // Sync from profile
  useEffect(() => {
    if (profile) {
      setAvailability(profile.availability);
      setSmsEnabled(profile.sms_alerts_enabled ?? false);
      setSmsPhone(profile.phone ?? '');
      setPausedAt(profile.search_paused_at ?? null);
    }
  }, [profile]);

  // Pause / go live: the one visibility field the tradie controls directly
  // (builder_profiles.search_paused_at, owner-writable). Pausing never
  // touches verification, reviews or completeness.
  async function handlePauseToggle(live: boolean) {
    if (!user) return;
    setPauseSaving(true);
    try {
      await setProfilePaused(!live);
      setPausedAt(live ? null : new Date().toISOString());
      await refreshProfile();
    } catch {
      /* the toggle re-renders from the unchanged row */
    } finally {
      setPauseSaving(false);
    }
  }

  // Toggle SMS job alerts. Enabling requires a valid AU mobile; the number is
  // saved alongside the flag so server-side dispatch always has one to text.
  async function handleSmsToggle(next: boolean) {
    if (!user) return;
    setSmsMsg(null);
    setSmsSaving(true);
    try {
      await setSmsAlerts(next, smsPhone);
    } catch (e) {
      setSmsSaving(false);
      setSmsMsg({ type: 'error', text: e instanceof Error ? e.message : "Couldn't save — please try again." });
      return;
    }
    setSmsSaving(false);
    setSmsEnabled(next);
    await refreshProfile();
    setSmsMsg({ type: 'success', text: next ? 'SMS job alerts on.' : 'SMS job alerts off.' });
  }

  // Save just the mobile number (without flipping the toggle).
  async function handleSmsPhoneSave() {
    if (!user) return;
    setSmsMsg(null);
    setSmsSaving(true);
    try {
      await saveSmsPhone(smsPhone);
    } catch (e) {
      setSmsSaving(false);
      setSmsMsg({ type: 'error', text: e instanceof Error ? e.message : "Couldn't save — please try again." });
      return;
    }
    setSmsSaving(false);
    await refreshProfile();
    setSmsMsg({ type: 'success', text: 'Mobile number saved.' });
  }

  // Server route re-verifies the CURRENT password before changing (a stolen
  // session must not be enough to rotate the password).
  async function handlePasswordChange() {
    setPasswordMsg(null);
    const invalid = validatePasswordChange(currentPassword, newPassword, confirmPassword);
    if (invalid) {
      setPasswordMsg({ type: 'error', text: invalid });
      return;
    }
    setPasswordLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMsg({ type: 'success', text: 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (e) {
      setPasswordMsg({
        type: 'error',
        text: e instanceof ApiError || e instanceof Error ? e.message || ERR_PASSWORD_UPDATE : ERR_PASSWORD_UPDATE,
      });
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleAvailabilityChange(status: AvailabilityStatus) {
    if (!user) return;
    setAvailability(status);
    setAvailabilityUpdating(true);
    try {
      await saveAvailabilityStatus(status);
      await refreshProfile();
    } catch {
      /* the row re-syncs the pill on the next refresh */
    } finally {
      setAvailabilityUpdating(false);
    }
  }

  const availabilityOptions: { value: AvailabilityStatus; label: string; desc: string }[] = [
    { value: 'available', label: 'Available', desc: 'Accepting new work — same day response' },
    { value: 'limited', label: 'Limited', desc: 'Selectively taking on jobs this week' },
    { value: 'unavailable', label: 'Unavailable', desc: 'Not accepting new work right now' },
  ];

  return (
    <PortalPage>
      {/* Page header */}
      <View>
        <Text accessibilityRole="header" style={[styles.h1, { color: c.textPrimary }]}>
          Settings
        </Text>
        <Text style={[styles.sub, { color: c.textSecondary }]}>
          Manage your account, notifications, and privacy preferences.
        </Text>
      </View>

      {/* ── Section 1: Account ───────────────────────────────────── */}
      <Card padding={Spacing['2xl']} flat>
        <Text accessibilityRole="header" style={[styles.h2, { color: c.textPrimary }]}>
          Account
        </Text>
        <Text style={[styles.sub, { color: c.textSecondary }]}>Your email and password settings.</Text>

        <View style={styles.accountBlock}>
          {/* Email — phone-only accounts have auth email ""; offer the
              verify-and-attach flow instead of a blank read-only box. */}
          <View>
            <Text style={[styles.fieldLabel, { color: c.textPrimary }]}>Email address</Text>
            {user?.email ? (
              <Input value={user.email} editable={false} accessibilityLabel="Email address" style={{ color: c.textSecondary }} />
            ) : (
              <View style={styles.emailLinkBlock}>
                <Text style={[styles.body, { color: c.textSecondary }]}>
                  No email on your login yet — verify one to get receipts and log in with it. We&apos;ll email
                  you a code to confirm it&apos;s yours.
                </Text>
                <EmailLink initialEmail={profile?.email ?? ''} />
              </View>
            )}
          </View>

          {/* Password */}
          <View>
            <Text style={[styles.fieldLabel, { color: c.textPrimary }]}>Password</Text>
            {!showPasswordForm ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowPasswordForm(true)}
                style={[styles.outlineButton, { borderColor: c.border, backgroundColor: c.surface }]}
              >
                <Text style={[styles.outlineButtonText, { color: c.textPrimary }]}>Change Password</Text>
              </Pressable>
            ) : (
              <View style={styles.passwordForm}>
                <PasswordInput
                  placeholder="Current password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />
                <PasswordInput
                  placeholder="New password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <PasswordInput
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <View style={styles.inlineActions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={passwordLoading}
                    onPress={() => void handlePasswordChange()}
                    style={[styles.primaryButton, { backgroundColor: c.primary }, passwordLoading && styles.disabled]}
                  >
                    <Text style={styles.primaryButtonText}>{passwordLoading ? 'Updating...' : 'Update Password'}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setShowPasswordForm(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordMsg(null);
                    }}
                    style={[styles.outlineButton, { borderColor: c.border, backgroundColor: c.surface }]}
                  >
                    <Text style={[styles.outlineButtonText, { color: c.textSecondary }]}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {passwordMsg ? (
              <Text style={[styles.msg, { color: passwordMsg.type === 'success' ? c.success : c.error }]}>
                {passwordMsg.text}
              </Text>
            ) : null}

            <Text style={[styles.hint, { color: c.textSecondary }]}>
              Can&apos;t remember it — or never set one?{' '}
              <Text
                accessibilityRole="link"
                onPress={() => router.push(ROUTES.forgotPassword)}
                style={[styles.hintLink, { color: c.primary }]}
              >
                Reset it here
              </Text>
              .
            </Text>
          </View>
        </View>
      </Card>

      {/* ── Section 2: Profile Status (pause / go live) ───────────── */}
      <Card padding={Spacing['2xl']} flat>
        <Text accessibilityRole="header" style={[styles.h2, { color: c.textPrimary }]}>
          Profile Status
        </Text>
        <Text style={[styles.sub, { color: c.textSecondary }]}>
          Pause your profile to come off search while you&apos;re flat out — your page stays online with a
          &quot;not taking enquiries&quot; note, and nothing else changes. The main control lives on your{' '}
          <Text accessibilityRole="link" onPress={() => router.push(ROUTES.portal)} style={[styles.hintLink, { color: c.primary }]}>
            dashboard
          </Text>
          .
        </Text>
        <View style={styles.sectionBody}>
          <ToggleRow
            label="Profile live in search"
            description={
              !profile?.approved
                ? 'Your profile is pending approval'
                : pausedAt
                  ? "Paused — homeowners can't find you in search"
                  : 'Live — homeowners can find you in search'
            }
            value={(profile?.approved ?? false) && !pausedAt}
            onChange={(v) => void handlePauseToggle(v)}
            disabled={!profile?.approved || pauseSaving}
          />
        </View>
      </Card>

      {/* ── Profile visibility (lives on its own page) ───────────── */}
      <Card padding={Spacing['2xl']} flat>
        <Text accessibilityRole="header" style={[styles.h2, { color: c.textPrimary }]}>
          Profile Visibility
        </Text>
        <Text style={[styles.sub, { color: c.textSecondary }]}>
          Choose which sections show on your public profile — availability, BLDESY Score, gallery, reviews
          and more.
        </Text>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push(ROUTES.portalProfileVisibility)}
          style={[styles.outlineButton, styles.visibilityButton, { borderColor: c.border, backgroundColor: c.surface }]}
        >
          <Text style={[styles.outlineButtonText, styles.outlineButtonTextStrong, { color: c.primary }]}>
            Open visibility settings
          </Text>
          <Ionicons name="chevron-forward" size={14} color={c.primary} />
        </Pressable>
      </Card>

      {/* ── Section 4: Work status ───────────────────────────────── */}
      <Card padding={Spacing['2xl']} flat>
        <Text accessibilityRole="header" style={[styles.h2, { color: c.textPrimary }]}>
          Work status
        </Text>
        <Text style={[styles.sub, { color: c.textSecondary }]}>Let customers know if you&apos;re taking on new work.</Text>
        <View style={[styles.sectionBody, styles.radioStack]} accessibilityRole="radiogroup">
          {availabilityOptions.map((opt) => {
            const selected = availability === opt.value;
            const dot = availabilityDot(opt.value, c);
            return (
              <Pressable
                key={opt.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => void handleAvailabilityChange(opt.value)}
                style={({ pressed }) => [
                  styles.radioCard,
                  {
                    borderColor: selected ? c.primary : c.border,
                    backgroundColor: selected ? c.primaryBg : pressed ? c.canvas : 'transparent',
                  },
                ]}
              >
                <View style={[styles.radio, { borderColor: selected ? c.primary : c.border }]}>
                  {selected ? <View style={[styles.radioDot, { backgroundColor: c.primary }]} /> : null}
                </View>
                <View style={styles.radioText}>
                  <View style={styles.radioLabelRow}>
                    <View style={[styles.statusDot, { backgroundColor: dot }]} />
                    <Text style={[styles.radioLabel, { color: c.textPrimary }]}>{opt.label}</Text>
                    {availabilityUpdating && selected ? (
                      <Text style={[styles.saving, { color: c.textSecondary }]}>Saving...</Text>
                    ) : null}
                  </View>
                  <Text style={[styles.radioDesc, { color: c.textSecondary }]}>{opt.desc}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* ── Section 4b: Notification Centre ──────────────────────── */}
      <NotificationCentre
        sms={{
          enabled: smsEnabled,
          phone: smsPhone,
          saving: smsSaving,
          message: smsMsg,
          onPhoneChange: setSmsPhone,
          onPhoneSave: () => void handleSmsPhoneSave(),
          onToggle: (next) => void handleSmsToggle(next),
        }}
      />

      {/* ── Section 4c: Phone login ──────────────────────────────── */}
      <Card padding={Spacing['2xl']} flat>
        <Text accessibilityRole="header" style={[styles.h2, { color: c.textPrimary }]}>
          Phone login
        </Text>
        <Text style={[styles.sub, { color: c.textSecondary, marginBottom: Spacing.lg }]}>
          {user?.phone
            ? 'Your mobile is verified — you can log in with a one-time code instead of your password.'
            : "Verify your mobile to log in with a one-time SMS code instead of your password. We'll text you a code to confirm it's yours."}
        </Text>
        <PhoneLink initialPhone={smsPhone} alreadyLinked={Boolean(user?.phone)} />
      </Card>

      {/* ── Section 5: Manage Subscription ─────────────────────── */}
      <SubscriptionSection userId={user?.id} />

      {/* ── Section 6: Delete Account ─────────────────────────── */}
      <Card padding={Spacing['2xl']} flat style={{ borderColor: c.error + '33', backgroundColor: c.error + '05' }}>
        <Text accessibilityRole="header" style={[styles.h2, { color: c.textPrimary }]}>
          Delete Account
        </Text>
        <Text style={[styles.sub, { color: c.textSecondary }]}>
          Permanently remove your account, builder profile, jobs you applied to, messages, and all associated
          data. This cannot be undone. If you have an active subscription, cancel it first using the section
          above.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowDeleteAccountModal(true)}
          style={[styles.dangerButton, { borderColor: c.error + '4D' }]}
        >
          <Text style={[styles.dangerButtonText, { color: c.error }]}>Delete my account</Text>
        </Pressable>
      </Card>

      <DeleteAccountModal
        visible={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        onDeleted={() => {
          setShowDeleteAccountModal(false);
          router.replace(ROUTES.home);
        }}
      />
    </PortalPage>
  );
}

/* ── Toggle row ───────────────────────────────────────────────────── */

function ToggleRow({
  label,
  description,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={[styles.toggleLabel, { color: c.textPrimary }]}>{label}</Text>
        {description ? <Text style={[styles.toggleDesc, { color: c.textSecondary }]}>{description}</Text> : null}
      </View>
      <ToggleSwitch checked={value} onChange={onChange} disabled={disabled} size="md" accessibilityLabel={label} />
    </View>
  );
}

/** lib/availability.ts dot classes → theme colours. */
function availabilityDot(status: AvailabilityStatus, c: Record<string, string>): string {
  const dot = getAvailability(status).dot;
  if (dot === 'bg-warning') return c.warning;
  if (dot === 'bg-error') return c.error;
  return c.success;
}

/* ── Subscription management section ─────────────────────────────── */

const CANCEL_REASONS = [
  'Not getting enough leads',
  'Too expensive',
  'Found a better platform',
  'Business is closing / taking a break',
  'Poor quality job leads',
  'Technical issues with the platform',
  'Not enough customers in my area',
  "I don't need the service anymore",
  'Other',
];

type SubscriptionView = 'menu' | 'cancel-reason' | 'cancel-choice' | 'cancel-confirm-keep' | 'cancel-confirm-delete';

function SubscriptionSection({ userId }: { userId?: string }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const [showPanel, setShowPanel] = useState(false);
  const [view, setView] = useState<SubscriptionView>('menu');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelOther, setCancelOther] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  function reset() {
    setView('menu');
    setCancelReason('');
    setCancelOther('');
    setDeleteConfirmText('');
  }

  function closePanel() {
    if (actionLoading) return;
    setShowPanel(false);
    reset();
  }

  async function handleCancelKeepData() {
    if (!userId) return;
    setActionLoading(true);
    try {
      await cancelSubscription();
      setErrorMsg('');
      setShowPanel(false);
      reset();
      setSuccessMsg('Subscription cancelled. Your data is saved — you can reactivate anytime from settings.');
    } catch (e) {
      setSuccessMsg('');
      setErrorMsg(e instanceof ApiError ? e.message || 'Failed to cancel subscription.' : 'Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancelDeleteData() {
    if (!userId) return;
    setActionLoading(true);
    try {
      // Server route cancels the Stripe subscription first, then deletes the
      // profile with the service role.
      await deleteBuilderProfile();
      setShowPanel(false);
      reset();
      router.navigate(ROUTES.home);
    } catch (e) {
      setSuccessMsg('');
      setErrorMsg(e instanceof ApiError ? e.message || ERR_DELETE_PROFILE_FAILED : 'Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <>
      <Card padding={Spacing['2xl']} flat>
        <View style={styles.subscriptionHeader}>
          <View style={styles.subscriptionText}>
            <Text accessibilityRole="header" style={[styles.h2, { color: c.textPrimary }]}>
              Subscription
            </Text>
            <Text style={[styles.subTight, { color: c.textSecondary }]}>Cancel your plan</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setShowPanel(true);
              setView('menu');
              setSuccessMsg('');
            }}
            style={[styles.outlineButton, { borderColor: c.border, backgroundColor: c.surface }]}
          >
            <Text style={[styles.outlineButtonText, { color: c.textSecondary }]}>Manage Subscription</Text>
          </Pressable>
        </View>

        {successMsg ? (
          <View style={[styles.notice, { backgroundColor: c.successBg, borderColor: c.successBorder }]}>
            <Text style={[styles.noticeText, { color: c.success }]}>{successMsg}</Text>
          </View>
        ) : null}

        {errorMsg ? (
          <View accessibilityRole="alert" style={[styles.notice, styles.noticeRow, { backgroundColor: c.error + '0D', borderColor: c.error + '4D' }]}>
            <Text style={[styles.noticeText, { color: c.error, flex: 1 }]}>{errorMsg}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Dismiss error" onPress={() => setErrorMsg('')} hitSlop={6}>
              <Ionicons name="close" size={16} color={c.error} />
            </Pressable>
          </View>
        ) : null}
      </Card>

      {/* ── Modal ─────────────────────────────────────────────── */}
      <Modal visible={showPanel} transparent animationType="fade" onRequestClose={closePanel}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closePanel} accessibilityLabel="Close" />
          <View style={[styles.dialog, Shadows.xl, { backgroundColor: c.surface }]}>
            <ScrollView contentContainerStyle={styles.dialogContent} keyboardShouldPersistTaps="handled">
              {view === 'menu' ? (
                <View>
                  <Text accessibilityRole="header" style={[styles.dialogTitle, { color: c.textPrimary }]}>
                    Manage Subscription
                  </Text>
                  <Text style={[styles.dialogSub, { color: c.textSecondary }]}>Choose what you&apos;d like to do.</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setView('cancel-reason')}
                    style={({ pressed }) => [styles.option, { borderColor: c.border, backgroundColor: pressed ? c.canvas : 'transparent' }]}
                  >
                    <View style={[styles.optionIcon, { backgroundColor: c.error + '1A' }]}>
                      <Ionicons name="close" size={20} color={c.error} />
                    </View>
                    <View style={styles.optionText}>
                      <Text style={[styles.optionTitle, { color: c.textPrimary }]}>Cancel Subscription</Text>
                      <Text style={[styles.optionDesc, { color: c.textSecondary }]}>
                        Cancel your plan — you can reactivate anytime
                      </Text>
                    </View>
                  </Pressable>
                </View>
              ) : null}

              {view === 'cancel-reason' ? (
                <View>
                  <Text accessibilityRole="header" style={[styles.dialogTitle, { color: c.textPrimary }]}>
                    We&apos;re sorry to see you go
                  </Text>
                  <Text style={[styles.dialogSub, { color: c.textSecondary }]}>Help us improve — why are you cancelling?</Text>
                  <View style={styles.reasons} accessibilityRole="radiogroup">
                    {CANCEL_REASONS.map((reason) => {
                      const selected = cancelReason === reason;
                      return (
                        <Pressable
                          key={reason}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: selected }}
                          onPress={() => setCancelReason(reason)}
                          style={[
                            styles.reason,
                            { borderColor: selected ? c.error : c.border, backgroundColor: selected ? c.error + '0D' : 'transparent' },
                          ]}
                        >
                          <View style={[styles.reasonRadio, { borderColor: selected ? c.error : c.border }]}>
                            {selected ? <View style={[styles.reasonDot, { backgroundColor: c.error }]} /> : null}
                          </View>
                          <Text style={[styles.reasonText, { color: c.textPrimary }]}>{reason}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {cancelReason === 'Other' ? (
                    <TextInput
                      value={cancelOther}
                      onChangeText={setCancelOther}
                      placeholder="Tell us more..."
                      placeholderTextColor={c.textSecondary + '66'}
                      multiline
                      numberOfLines={3}
                      style={[styles.textarea, { borderColor: c.border, backgroundColor: c.surface, color: c.textPrimary }]}
                    />
                  ) : null}
                  <View style={styles.dialogActions}>
                    <Pressable accessibilityRole="button" onPress={() => setView('menu')} style={[styles.dialogButton, { borderColor: c.border }]}>
                      <Text style={[styles.dialogButtonText, { color: c.textSecondary }]}>Back</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={!cancelReason}
                      onPress={() => setView('cancel-choice')}
                      style={[styles.dialogButton, styles.dialogButtonFilled, { backgroundColor: c.error }, !cancelReason && styles.disabled]}
                    >
                      <Text style={[styles.dialogButtonText, { color: '#ffffff' }]}>Continue</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {view === 'cancel-choice' ? (
                <View>
                  <Text accessibilityRole="header" style={[styles.dialogTitle, { color: c.textPrimary }]}>
                    What happens to your data?
                  </Text>
                  <Text style={[styles.dialogSub, { color: c.textSecondary }]}>Choose how you&apos;d like to handle your account.</Text>
                  <View style={styles.optionStack}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setView('cancel-confirm-keep')}
                      style={({ pressed }) => [styles.option, { borderColor: c.border, backgroundColor: pressed ? c.canvas : 'transparent' }]}
                    >
                      <View style={[styles.optionIcon, { backgroundColor: c.primary + '1A' }]}>
                        <Ionicons name="archive-outline" size={20} color={c.primary} />
                      </View>
                      <View style={styles.optionText}>
                        <Text style={[styles.optionTitle, { color: c.textPrimary }]}>Keep my data</Text>
                        <Text style={[styles.optionDesc, { color: c.textSecondary }]}>
                          Deactivate your profile but keep all your projects, reviews, and credentials. You can
                          reactivate anytime.
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setView('cancel-confirm-delete')}
                      style={({ pressed }) => [styles.option, { borderColor: c.border, backgroundColor: pressed ? c.canvas : 'transparent' }]}
                    >
                      <View style={[styles.optionIcon, { backgroundColor: c.error + '1A' }]}>
                        <Ionicons name="trash-outline" size={20} color={c.error} />
                      </View>
                      <View style={styles.optionText}>
                        <Text style={[styles.optionTitle, { color: c.textPrimary }]}>Delete my data</Text>
                        <Text style={[styles.optionDesc, { color: c.textSecondary }]}>
                          Permanently delete your builder profile, projects, and all associated data. This cannot be
                          undone.
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                  <View style={[styles.reasonBox, { backgroundColor: c.canvas, borderColor: c.border }]}>
                    <Text style={[styles.reasonBoxText, { color: c.textSecondary }]}>
                      <Text style={styles.reasonBoxStrong}>Reason:</Text> {cancelReason}
                    </Text>
                    {cancelOther ? <Text style={[styles.reasonBoxText, { color: c.textSecondary, marginTop: Spacing.xs }]}>{cancelOther}</Text> : null}
                  </View>
                  <Pressable accessibilityRole="button" onPress={() => setView('cancel-reason')} style={styles.backLink}>
                    <Text style={[styles.backLinkText, { color: c.textSecondary }]}>← Back to reason</Text>
                  </Pressable>
                </View>
              ) : null}

              {view === 'cancel-confirm-keep' ? (
                <View>
                  <View style={[styles.confirmIcon, { backgroundColor: c.primary + '1A' }]}>
                    <Ionicons name="archive-outline" size={24} color={c.primary} />
                  </View>
                  <Text accessibilityRole="header" style={[styles.dialogTitle, { color: c.textPrimary }]}>
                    Cancel and keep data
                  </Text>
                  <Text style={[styles.dialogSub, { color: c.textSecondary }]}>
                    Your account will be deactivated but your data stays safe:
                  </Text>
                  <View style={styles.checkList}>
                    {['Profile hidden from search', 'Projects, reviews & credentials saved', 'Reactivate anytime from settings'].map((line) => (
                      <View key={line} style={styles.checkItem}>
                        <Ionicons name="checkmark" size={16} color={c.primary} />
                        <Text style={[styles.checkText, { color: c.textSecondary }]}>{line}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.dialogActions}>
                    <Pressable accessibilityRole="button" onPress={() => setView('cancel-choice')} style={[styles.dialogButton, { borderColor: c.border }]}>
                      <Text style={[styles.dialogButtonText, { color: c.textSecondary }]}>Back</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={actionLoading}
                      onPress={() => void handleCancelKeepData()}
                      style={[styles.dialogButton, styles.dialogButtonFilled, { backgroundColor: c.primary }, actionLoading && styles.disabled]}
                    >
                      <Text style={[styles.dialogButtonText, { color: '#ffffff' }]}>
                        {actionLoading ? 'Processing...' : 'Deactivate & Keep Data'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {view === 'cancel-confirm-delete' ? (
                <View>
                  <View style={[styles.confirmIcon, { backgroundColor: c.error + '1A' }]}>
                    <Ionicons name="warning-outline" size={24} color={c.error} />
                  </View>
                  <Text accessibilityRole="header" style={[styles.dialogTitle, { color: c.textPrimary }]}>
                    Delete everything?
                  </Text>
                  <Text style={[styles.dialogSub, { color: c.textSecondary }]}>
                    This will permanently delete your builder profile, all projects, credentials, team members, and
                    reviews. <Text style={[styles.reasonBoxStrong, { color: c.error }]}>This cannot be undone.</Text>
                  </Text>
                  <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>
                    Type <Text style={[styles.reasonBoxStrong, { color: c.textPrimary }]}>DELETE</Text> to confirm
                  </Text>
                  <TextInput
                    value={deleteConfirmText}
                    onChangeText={setDeleteConfirmText}
                    placeholder="DELETE"
                    placeholderTextColor={c.textSecondary + '4D'}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    style={[styles.textInput, { borderColor: c.error + '4D', backgroundColor: c.surface, color: c.textPrimary }]}
                  />
                  <View style={styles.dialogActions}>
                    <Pressable accessibilityRole="button" onPress={() => setView('cancel-choice')} style={[styles.dialogButton, { borderColor: c.border }]}>
                      <Text style={[styles.dialogButtonText, { color: c.textSecondary }]}>Back</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={actionLoading || deleteConfirmText !== 'DELETE'}
                      onPress={() => void handleCancelDeleteData()}
                      style={[
                        styles.dialogButton,
                        styles.dialogButtonFilled,
                        { backgroundColor: c.error },
                        (actionLoading || deleteConfirmText !== 'DELETE') && styles.disabled,
                      ]}
                    >
                      <Text style={[styles.dialogButtonText, { color: '#ffffff' }]}>
                        {actionLoading ? 'Deleting...' : 'Permanently Delete'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  h1: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  h2: {
    fontSize: 18,
    lineHeight: 28,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  sub: {
    marginTop: Spacing.xs,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  subTight: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  accountBlock: {
    marginTop: Spacing['2xl'],
    gap: Spacing.xl,
  },
  emailLinkBlock: {
    gap: Spacing.sm,
  },
  fieldLabel: {
    marginBottom: 6,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  outlineButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    minHeight: 44,
  },
  outlineButtonText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  outlineButtonTextStrong: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  visibilityButton: {
    marginTop: Spacing.xl,
  },
  passwordForm: {
    gap: Spacing.md,
  },
  inlineActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  primaryButton: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  msg: {
    marginTop: Spacing.sm,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  hint: {
    marginTop: Spacing.md,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  hintLink: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  sectionBody: {
    marginTop: Spacing['2xl'],
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  toggleText: {
    flex: 1,
    minWidth: 0,
  },
  toggleLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  toggleDesc: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  radioStack: {
    gap: Spacing.md,
  },
  radioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioText: {
    flex: 1,
    minWidth: 0,
  },
  radioLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  saving: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  radioDesc: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  dangerButton: {
    marginTop: Spacing.xl,
    alignSelf: 'flex-start',
    borderRadius: Radius.lg,
    borderWidth: 2,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  dangerButtonText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  subscriptionText: {
    flex: 1,
    minWidth: 160,
  },
  notice: {
    marginTop: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  dialog: {
    width: '100%',
    maxWidth: 448,
    maxHeight: '85%',
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  dialogContent: {
    padding: Spacing['2xl'],
  },
  dialogTitle: {
    fontSize: 18,
    lineHeight: 28,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  dialogSub: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  optionStack: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    minWidth: 0,
  },
  optionTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  optionDesc: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  reasons: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 2,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  reasonRadio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  reasonText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  textarea: {
    marginBottom: Spacing.lg,
    minHeight: 84,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 14,
    fontFamily: FontFamily.body,
    textAlignVertical: 'top',
  },
  textInput: {
    marginBottom: Spacing.xl,
    height: 44,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 14,
    fontFamily: FontFamily.body,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  dialogButton: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogButtonFilled: {
    borderWidth: 0,
  },
  dialogButtonText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  reasonBox: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  reasonBoxText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  reasonBoxStrong: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  backLink: {
    minHeight: 32,
    justifyContent: 'center',
  },
  backLinkText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  confirmIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  checkList: {
    gap: 6,
    marginBottom: Spacing['2xl'],
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  checkText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
});
