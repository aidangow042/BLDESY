/**
 * SmsLinkForm — port of ~/bldesy-web/components/tradie/sms-link-form.tsx:
 * "Not near your paperwork?" — two-field SMS capture (first name + mobile).
 * POST /api/sms-link texts the application short link now and a single day-2
 * reminder. The web's honeypot + Turnstile are replaced server-side by the
 * app's X-Mobile-Secret (lib/api.ts); the per-IP rate limit still applies.
 *
 * The consent line matches the real opt-out mechanism: every message carries
 * an opt-out LINK — never "reply STOP".
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  TRADIE_FORM_NETWORK_ERROR,
  publicFormErrorMessage,
  requestSmsLink,
  type SmsLinkSource,
} from '@/lib/data/public-forms';
import { getFirstTouchAttribution } from '@/lib/data/tracking';
import { isValidAuMobile } from '@/lib/web/phone';

export const SMS_LINK_ERRORS = {
  missingName: 'Add your first name.',
  badMobile: "That mobile doesn't look right — use an Australian mobile (04…).",
} as const;

interface SmsLinkFormProps {
  source: SmsLinkSource;
}

export function SmsLinkForm({ source }: SmsLinkFormProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (state !== 'idle') return;
    setError(null);
    if (!firstName.trim()) {
      setError(SMS_LINK_ERRORS.missingName);
      return;
    }
    if (!isValidAuMobile(phone)) {
      setError(SMS_LINK_ERRORS.badMobile);
      return;
    }
    setState('sending');
    try {
      // First-touch UTMs ride along so an ad-driven "text me the link" still attributes to its ad.
      await requestSmsLink({
        first_name: firstName,
        phone,
        source,
        firstTouch: getFirstTouchAttribution(),
      });
      // The server records the sms_link_requested funnel row itself.
      setState('sent');
    } catch (e) {
      setError(publicFormErrorMessage(e, TRADIE_FORM_NETWORK_ERROR));
      setState('idle');
    }
  }

  if (state === 'sent') {
    return (
      <View style={[styles.sent, { backgroundColor: c.primaryBg, borderColor: c.primary + '4D' }]}>
        <Text style={[styles.sentTitle, { color: c.textPrimary }]}>Link sent — check your phone.</Text>
        <Text style={[styles.sentBody, { color: c.textSecondary }]}>
          We&apos;ll text one reminder in a couple of days if you haven&apos;t started. That&apos;s it.
        </Text>
      </View>
    );
  }

  const inputStyle = [styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.textPrimary }];

  return (
    <View style={styles.form}>
      <TextInput
        value={firstName}
        onChangeText={setFirstName}
        placeholder="First name"
        placeholderTextColor={c.textSecondary + '99'}
        textContentType="givenName"
        autoCapitalize="words"
        maxLength={100}
        accessibilityLabel="First name"
        style={inputStyle}
      />
      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="04xx xxx xxx"
        placeholderTextColor={c.textSecondary + '99'}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        maxLength={20}
        accessibilityLabel="Mobile"
        style={inputStyle}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: state === 'sending', busy: state === 'sending' }}
        disabled={state === 'sending'}
        onPress={() => void handleSubmit()}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: pressed ? c.primaryDark : c.primary },
          state === 'sending' && { opacity: 0.6 },
        ]}
      >
        <Text style={styles.buttonLabel}>{state === 'sending' ? 'Sending…' : 'Text me the link'}</Text>
      </Pressable>

      {error ? (
        <Text style={[styles.error, { color: c.error }]} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <Text style={[styles.consent, { color: c.textSecondary }]}>
        By tapping &ldquo;Text me the link&rdquo; you agree to get the link plus one reminder by SMS from BLDESY.
        Every message includes an opt-out link.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.sm,
  },
  input: {
    height: 44,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontFamily: FontFamily.body,
    fontSize: 16,
  },
  button: {
    height: 44,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  buttonLabel: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
    color: '#ffffff',
  },
  error: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 18,
  },
  consent: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    lineHeight: 17,
    opacity: 0.8,
  },
  sent: {
    borderRadius: Radius.xl,
    borderWidth: 2,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  sentTitle: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 20,
  },
  sentBody: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 20,
  },
});
