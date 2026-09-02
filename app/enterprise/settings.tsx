/**
 * /enterprise/settings — Company Settings. Port of
 * ~/bldesy-web/app/enterprise/settings/page.tsx (company name, contact
 * name / phone / email, industry focus, NotificationCentre role="enterprise"
 * with SMS application alerts on the contact phone) plus the account rows the
 * website keeps on its settings pages — Change Password and Delete Account
 * (copy from app/portal/settings/page.tsx) — through lib/data/settings.ts.
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useEnterprise } from '@/components/enterprise/enterprise-context';
import { HubInput } from '@/components/enterprise/hub-form';
import {
  HubModal,
  HubScreen,
  InlineBanner,
  PageTitle,
  PillButton,
  SectionCard,
  Spinner,
  useHubTheme,
} from '@/components/enterprise/hub-primitives';
import { NotificationCentre } from '@/components/enterprise/notification-centre';
import { useToast } from '@/components/ui';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { updateOwnEnterpriseProfile } from '@/lib/data/enterprise';
import { changePassword, deleteAccount, ERR_DELETE_ACCOUNT_FAILED, ERR_PASSWORD_UPDATE } from '@/lib/data/settings';
import { toHref } from '@/lib/enterprise-hub/nav';
import { dispatchProfileChanged } from '@/lib/events/profile';
import { ROUTES } from '@/lib/routes';
import { isValidAuMobile } from '@/lib/web/phone';

const ERR_SAVE = "Couldn't save — please try again.";
const SAVED = 'Settings saved successfully.';
const ERR_SMS_PHONE = 'Add a valid Australian mobile in Contact Phone above first.';
const SMS_PHONE_HINT = "SMS application alerts use your Contact Phone above — make sure it's a mobile.";
const PASSWORD_UPDATED = 'Password updated successfully.';

type Msg = { type: 'success' | 'error'; text: string } | null;

export default function EnterpriseSettingsScreen() {
  const c = useHubTheme();
  const toast = useToast();
  const { profile, refreshProfile } = useEnterprise();

  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [industryFocus, setIndustryFocus] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SMS application alerts (persisted to enterprise_profiles, uses contact_phone)
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsSaving, setSmsSaving] = useState(false);
  const [smsMsg, setSmsMsg] = useState<Msg>(null);

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<Msg>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Delete account
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const hydrated = useRef(false);
  useEffect(() => {
    if (!profile || hydrated.current) return;
    hydrated.current = true;
    setCompanyName(profile.company_name || '');
    setContactName(profile.contact_name || '');
    setContactEmail(profile.contact_email || '');
    setContactPhone(profile.contact_phone || '');
    setIndustryFocus(profile.industry_focus || '');
    setSmsEnabled(profile.sms_alerts_enabled ?? false);
  }, [profile]);

  async function handleSave() {
    setError(null);
    setSaving(true);
    setSuccess(false);
    try {
      await updateOwnEnterpriseProfile({
        company_name: companyName.trim(),
        contact_name: contactName.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        industry_focus: industryFocus.trim() || null,
      });
      setSuccess(true);
      dispatchProfileChanged();
      await refreshProfile();
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError(ERR_SAVE);
    } finally {
      setSaving(false);
    }
  }

  // Toggle SMS alerts. Enabling needs a valid mobile in the contact phone; the
  // number is persisted alongside the flag so dispatch always has one to text.
  async function handleSmsToggle(next: boolean) {
    setSmsMsg(null);
    if (next && !isValidAuMobile(contactPhone)) {
      setSmsMsg({ type: 'error', text: ERR_SMS_PHONE });
      return;
    }
    setSmsSaving(true);
    try {
      await updateOwnEnterpriseProfile({
        sms_alerts_enabled: next,
        ...(next ? { contact_phone: contactPhone.trim() } : {}),
      });
      setSmsEnabled(next);
      await refreshProfile();
      setSmsMsg({ type: 'success', text: next ? 'SMS application alerts on.' : 'SMS application alerts off.' });
    } catch {
      setSmsMsg({ type: 'error', text: ERR_SAVE });
    } finally {
      setSmsSaving(false);
    }
  }

  // Server route re-verifies the CURRENT password before changing (a stolen
  // session must not be enough to rotate the password).
  async function handlePasswordChange() {
    setPasswordMsg(null);
    setPasswordLoading(true);
    try {
      if (newPassword !== confirmPassword) throw new Error('Passwords do not match.');
      await changePassword(currentPassword, newPassword);
      setPasswordMsg({ type: 'success', text: PASSWORD_UPDATED });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (e) {
      setPasswordMsg({
        type: 'error',
        text: e instanceof ApiError ? e.message || ERR_PASSWORD_UPDATE : e instanceof Error ? e.message : ERR_PASSWORD_UPDATE,
      });
    } finally {
      setPasswordLoading(false);
    }
  }

  function cancelPasswordForm() {
    setShowPasswordForm(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordMsg(null);
  }

  async function handleDeleteAccount() {
    setDeleteError('');
    setDeleteLoading(true);
    try {
      await deleteAccount(deletePassword);
      toast.show('Your account has been deleted.', { variant: 'success' });
      router.replace(toHref(ROUTES.home));
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message || ERR_DELETE_ACCOUNT_FAILED : ERR_DELETE_ACCOUNT_FAILED);
      setDeleteLoading(false);
    }
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: c.canvas }}>
        <Spinner minHeight={320} />
      </View>
    );
  }

  const canDelete = deleteConfirmText.trim().toUpperCase() === 'DELETE' && deletePassword.length > 0 && !deleteLoading;

  return (
    <HubScreen gap={Spacing['2xl']}>
      <PageTitle title="Company Settings" subtitle="Update your company information" />

      {success ? <InlineBanner tone="success">{SAVED}</InlineBanner> : null}

      <SectionCard padding={Spacing['2xl']}>
        <View style={styles.fields}>
          <HubInput label="Company Name" value={companyName} onChangeText={setCompanyName} />
          <View style={styles.twoCol}>
            <HubInput label="Contact Name" value={contactName} onChangeText={setContactName} containerStyle={{ flex: 1 }} />
            <HubInput
              label="Contact Phone"
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
              containerStyle={{ flex: 1 }}
            />
          </View>
          <HubInput
            label="Contact Email"
            value={contactEmail}
            onChangeText={setContactEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <HubInput
            label="Industry Focus"
            value={industryFocus}
            onChangeText={setIndustryFocus}
            placeholder="e.g. Commercial construction, residential developments"
          />
          {error ? <Text style={[styles.error, { color: c.error }]}>{error}</Text> : null}
          <PillButton label={saving ? 'Saving...' : 'Save Changes'} onPress={handleSave} loading={saving} />
        </View>
      </SectionCard>

      <NotificationCentre
        role="enterprise"
        sms={{
          enabled: smsEnabled,
          saving: smsSaving,
          message: smsMsg,
          onToggle: handleSmsToggle,
          hidePhoneField: true,
          phoneHint: SMS_PHONE_HINT,
        }}
      />

      {/* Account — password */}
      <SectionCard padding={Spacing['2xl']}>
        <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>Account</Text>
        <Text style={[styles.sectionSub, { color: c.textSecondary }]}>Your email and password settings.</Text>
        <View style={{ marginTop: Spacing.xl }}>
          <Text style={[styles.fieldLabel, { color: c.textPrimary }]}>Password</Text>
          {!showPasswordForm ? (
            <PillButton
              label="Change Password"
              variant="outline"
              onPress={() => setShowPasswordForm(true)}
              style={{ borderRadius: Radius.lg }}
            />
          ) : (
            <View style={styles.fields}>
              <HubInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Current password"
                secureTextEntry
                autoComplete="current-password"
              />
              <HubInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New password"
                secureTextEntry
                autoComplete="new-password"
              />
              <HubInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                secureTextEntry
                autoComplete="new-password"
              />
              <View style={styles.actionRow}>
                <PillButton
                  label={passwordLoading ? 'Updating...' : 'Update Password'}
                  variant="primary"
                  onPress={handlePasswordChange}
                  loading={passwordLoading}
                  style={{ borderRadius: Radius.lg }}
                />
                <PillButton label="Cancel" variant="outline" onPress={cancelPasswordForm} style={{ borderRadius: Radius.lg }} />
              </View>
            </View>
          )}
          {passwordMsg ? (
            <Text style={[styles.msg, { color: passwordMsg.type === 'success' ? c.success : c.error }]}>{passwordMsg.text}</Text>
          ) : null}
        </View>
      </SectionCard>

      {/* Delete Account */}
      <SectionCard tone="error" padding={Spacing['2xl']}>
        <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>Delete Account</Text>
        <Text style={[styles.sectionSub, { color: c.textSecondary }]}>
          This permanently removes your account and all associated data. You won&apos;t be able to recover it.
        </Text>
        <PillButton
          label="Delete my account"
          variant="outline-error"
          onPress={() => {
            setShowDelete(true);
            setDeleteConfirmText('');
            setDeletePassword('');
            setDeleteError('');
          }}
          style={{ marginTop: Spacing.xl, borderRadius: Radius.lg }}
        />
      </SectionCard>

      {/* Delete confirmation modal */}
      <HubModal visible={showDelete} onClose={() => !deleteLoading && setShowDelete(false)} accessibilityLabel="Delete your account?">
        <Text accessibilityRole="header" style={[styles.modalTitle, { color: c.textPrimary }]}>
          Delete your account?
        </Text>
        <Text style={[styles.modalBody, { color: c.textSecondary }]}>
          This permanently removes your account and all associated data. You won&apos;t be able to recover it.
        </Text>
        <View style={styles.bullets}>
          <Text style={[styles.bullet, { color: c.textSecondary }]}>• Your messages and conversations will be permanently deleted</Text>
          <Text style={[styles.bullet, { color: c.textSecondary }]}>• You&apos;ll be signed out immediately</Text>
        </View>
        <View style={[styles.warn, { borderColor: c.warning + '33', backgroundColor: c.warning + '0D' }]}>
          <Text style={[styles.warnText, { color: c.warning }]}>
            If you have an active Stripe subscription, cancel it before deleting your account so you aren&apos;t billed for the
            next cycle.
          </Text>
        </View>
        <Text style={[styles.confirmLabel, { color: c.textPrimary }]}>
          Type <Text style={{ color: c.error, fontFamily: FontFamily.bodyBold, fontWeight: '700' }}>DELETE</Text> to confirm
        </Text>
        <HubInput
          value={deleteConfirmText}
          onChangeText={setDeleteConfirmText}
          placeholder="DELETE"
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!deleteLoading}
        />
        <Text style={[styles.confirmLabel, { color: c.textPrimary, marginTop: Spacing.lg }]}>Confirm your password</Text>
        <HubInput
          value={deletePassword}
          onChangeText={setDeletePassword}
          placeholder="Your current password"
          secureTextEntry
          autoComplete="current-password"
          editable={!deleteLoading}
        />
        {deleteError ? <Text style={[styles.deleteError, { color: c.error }]}>{deleteError}</Text> : null}
        <View style={styles.modalActions}>
          <PillButton label="Cancel" variant="outline" onPress={() => setShowDelete(false)} disabled={deleteLoading} />
          <PillButton label="Delete my account" variant="error" onPress={handleDeleteAccount} disabled={!canDelete} loading={deleteLoading} />
        </View>
      </HubModal>
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: Spacing.xl,
  },
  twoCol: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  error: {
    fontSize: 14,
    fontFamily: FontFamily.body,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  sectionSub: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    marginBottom: 6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  msg: {
    marginTop: Spacing.md,
    fontSize: 14,
    fontFamily: FontFamily.body,
  },
  modalTitle: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
    marginBottom: Spacing.lg,
  },
  bullets: {
    gap: 6,
    marginBottom: Spacing.xl,
  },
  bullet: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  warn: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  warnText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  confirmLabel: {
    fontSize: 12,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    marginBottom: 6,
  },
  deleteError: {
    marginTop: Spacing.md,
    fontSize: 12,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  modalActions: {
    marginTop: Spacing.xl,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
});
