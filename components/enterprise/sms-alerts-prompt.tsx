/**
 * SmsAlertsPromptGate / SmsAlertsPrompt — port of
 * ~/bldesy-web/components/onboarding/sms-alerts-prompt.tsx (enterprise role).
 *
 * Show-once gate: renders the prompt the first time a business lands on the
 * dashboard post-signup unless they've already opted in or dismissed it
 * (tracked per-user — AsyncStorage stands in for the web's localStorage).
 * Enabling writes `contact_phone` + `sms_alerts_enabled` to the own
 * enterprise_profiles row, exactly as the website does.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { FontFamily, Spacing } from '@/constants/theme';
import { updateOwnEnterpriseProfile } from '@/lib/data/enterprise';
import { dispatchProfileChanged } from '@/lib/events/profile';
import { isValidAuMobile } from '@/lib/web/phone';

import { HubInput } from './hub-form';
import { HubModal, PillButton, useHubTheme } from './hub-primitives';

const COPY = {
  title: 'Get SMS application alerts',
  body:
    "Turn on text alerts and we'll message you the moment a tradie applies to one of your jobs or contracts — so you never miss a candidate.",
} as const;

export const ERR_SMS_MOBILE = 'Enter a valid Australian mobile number (e.g. 0412 345 678).';
export const ERR_SMS_SAVE = "Couldn't save that — please try again.";

function seenKey(userId: string): string {
  return `bldesy_sms_prompt_seen_${userId}`;
}

export function SmsAlertsPromptGate({
  userId,
  initialPhone,
  alreadyEnabled,
  onEnabled,
}: {
  userId: string | null | undefined;
  initialPhone: string | null;
  alreadyEnabled: boolean;
  /** Called after a successful opt-in so the parent can refresh its profile. */
  onEnabled?: () => void;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!userId || alreadyEnabled) return;
    let cancelled = false;
    AsyncStorage.getItem(seenKey(userId))
      .then((seen) => {
        if (!cancelled && !seen) setShow(true);
      })
      .catch(() => {
        // storage unavailable — fall through and show once this session.
        if (!cancelled) setShow(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, alreadyEnabled]);

  function close() {
    if (userId) AsyncStorage.setItem(seenKey(userId), '1').catch(() => {});
    setShow(false);
  }

  if (!show || !userId) return null;
  return (
    <SmsAlertsPrompt
      initialPhone={initialPhone}
      onClose={close}
      onEnabled={() => {
        close();
        onEnabled?.();
      }}
    />
  );
}

export function SmsAlertsPrompt({
  initialPhone,
  onClose,
  onEnabled,
}: {
  initialPhone: string | null;
  onClose: () => void;
  onEnabled: () => void;
}) {
  const c = useHubTheme();
  const [phone, setPhone] = useState(initialPhone ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnable() {
    setError(null);
    if (!isValidAuMobile(phone)) {
      setError(ERR_SMS_MOBILE);
      return;
    }
    setSaving(true);
    try {
      await updateOwnEnterpriseProfile({ contact_phone: phone.trim(), sms_alerts_enabled: true });
      dispatchProfileChanged();
      onEnabled();
    } catch {
      setError(ERR_SMS_SAVE);
    } finally {
      setSaving(false);
    }
  }

  return (
    <HubModal visible onClose={onClose} dismissable={!saving} accessibilityLabel={COPY.title}>
      <View style={[styles.icon, { backgroundColor: c.indigo }]}>
        <Ionicons name="chatbubble-ellipses-outline" size={20} color="#ffffff" />
      </View>
      <Text accessibilityRole="header" style={[styles.title, { color: c.textPrimary }]}>
        {COPY.title}
      </Text>
      <Text style={[styles.body, { color: c.textSecondary }]}>{COPY.body}</Text>

      <HubInput
        label="Mobile number"
        value={phone}
        onChangeText={setPhone}
        placeholder="0412 345 678"
        keyboardType="phone-pad"
        autoComplete="tel"
        containerStyle={{ marginTop: Spacing.xl }}
      />
      <Text style={[styles.note, { color: c.textSecondary }]}>
        Standard SMS rates may apply. You can turn this off anytime in Settings.
      </Text>
      {error ? <Text style={[styles.error, { color: c.error }]}>{error}</Text> : null}

      <View style={styles.actions}>
        <PillButton
          label={saving ? 'Saving…' : 'Enable SMS alerts'}
          onPress={handleEnable}
          loading={saving}
          style={{ flex: 1 }}
          fullWidth
        />
        <PillButton label="Not now" onPress={onClose} variant="outline" disabled={saving} />
      </View>
    </HubModal>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  body: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  note: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  error: {
    marginTop: Spacing.sm,
    fontSize: 14,
    fontFamily: FontFamily.body,
  },
  actions: {
    marginTop: Spacing['2xl'],
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
