/**
 * SettingsPasswordForm — "Change Password" on the shared settings page.
 * The web's shared page updates the password with only new + confirm; the app
 * goes through `changePassword` (POST /api/auth/change-password, which
 * re-verifies the current password server-side), so it adds the portal
 * settings page's "Current password" field. Copy from both pages verbatim.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PasswordInput } from '@/components/auth/password-input';
import { ErrorBanner } from '@/components/jobs/error-banner';
import { FieldLabel } from '@/components/jobs/field-label';
import { Button } from '@/components/ui';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { changePassword, validatePasswordChange } from '@/lib/data/settings';

/** Verbatim app/settings/page.tsx copy. */
export const PASSWORD_UPDATED = 'Password updated successfully.';

export function SettingsPasswordForm() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [showForm, setShowForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  function reset() {
    setShowForm(false);
    setError('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }

  async function handleChangePassword() {
    setError('');
    setSuccess('');
    const invalid = validatePasswordChange(currentPassword, newPassword, confirmPassword);
    if (invalid) {
      setError(invalid);
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(PASSWORD_UPDATED);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update your password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!showForm) {
    return (
      <View style={{ gap: Spacing.md }}>
        {success ? <ErrorBanner message={success} tone="success" onDismiss={() => setSuccess('')} /> : null}
        <Button variant="secondary" size="sm" onPress={() => setShowForm(true)}>
          Change Password
        </Button>
      </View>
    );
  }

  return (
    <View style={{ gap: Spacing.md }}>
      <View>
        <FieldLabel muted>Current password</FieldLabel>
        <PasswordInput
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Current password"
          autoComplete="current-password"
          accessibilityLabel="Current password"
        />
      </View>
      <View>
        <FieldLabel muted>New password</FieldLabel>
        <PasswordInput
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          accessibilityLabel="New password"
        />
      </View>
      <View>
        <FieldLabel muted>Confirm password</FieldLabel>
        <PasswordInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Repeat your new password"
          autoComplete="new-password"
          accessibilityLabel="Confirm password"
        />
      </View>

      {error ? <Text style={[styles.error, { color: c.error }]}>{error}</Text> : null}

      <View style={styles.actions}>
        <Button size="sm" onPress={handleChangePassword} disabled={loading} loading={loading}>
          {loading ? 'Updating...' : 'Update Password'}
        </Button>
        <Button size="sm" variant="ghost" onPress={reset} disabled={loading}>
          Cancel
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  error: { fontSize: 14, fontFamily: FontFamily.body },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});
