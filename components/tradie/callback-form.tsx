/**
 * CallbackForm — port of ~/bldesy-web/components/tradie/callback-form.tsx: the
 * paid-channel conversion on /for-tradies ("flick us your number and we'll
 * bell you"). The CTA is a callback, never a commitment: name + trade + mobile,
 * and the optional "what's eating you most" dropdown is the light qualifier.
 *
 * The web mints ONE event_id and fires the browser pixel's Lead with it so the
 * route's CAPI Lead dedupes; the app has no pixel, so the id is minted and sent
 * for the server half only. First-touch UTMs ride along (utm_content = the ad
 * id). Honeypot + Turnstile are replaced server-side by X-Mobile-Secret.
 */
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { OptionPicker } from '@/components/marketing/option-picker';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  TRADIE_FORM_NETWORK_ERROR,
  publicFormErrorMessage,
  requestCallback,
} from '@/lib/data/public-forms';
import { getFirstTouchAttribution, uuid } from '@/lib/data/tracking';
import { isValidAuMobile } from '@/lib/web/phone';
import { TRADE_CATEGORIES } from '@/lib/web/trades';

export const QUALIFIERS = [
  'Paying for dud leads right now',
  'New ABN — no reviews yet',
  'Booked out, just looking',
  'Something else',
] as const;

export const CALLBACK_ERRORS = {
  missingName: 'Add your name.',
  badMobile: "That mobile doesn't look right — use an Australian mobile (04…).",
} as const;

export function CallbackForm() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [name, setName] = useState('');
  const [trade, setTrade] = useState('');
  const [qualifier, setQualifier] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  // The web posts the trade NAME (not the slug) — the picker's values are names.
  const tradeOptions = useMemo(
    () =>
      TRADE_CATEGORIES.flatMap((cat) => cat.trades.map((t) => t.name))
        .sort()
        .map((n) => ({ value: n, label: n })),
    [],
  );
  const qualifierOptions = useMemo(() => QUALIFIERS.map((q) => ({ value: q, label: q })), []);

  async function handleSubmit() {
    if (state !== 'idle') return;
    setError(null);
    if (!name.trim()) {
      setError(CALLBACK_ERRORS.missingName);
      return;
    }
    if (!isValidAuMobile(phone)) {
      setError(CALLBACK_ERRORS.badMobile);
      return;
    }
    setState('sending');
    try {
      await requestCallback({
        name,
        phone,
        trade: trade || null,
        qualifier: qualifier || null,
        event_id: uuid(),
        firstTouch: getFirstTouchAttribution(),
      });
      // The server records the callback_requested funnel row + CAPI itself.
      setState('sent');
    } catch (e) {
      setError(publicFormErrorMessage(e, TRADIE_FORM_NETWORK_ERROR));
      setState('idle');
    }
  }

  if (state === 'sent') {
    return (
      <View style={[styles.sent, { backgroundColor: c.primaryBg, borderColor: c.primary + '4D' }]}>
        <Text style={[styles.sentTitle, { color: c.textPrimary }]}>Got it — we&apos;ll bell you today.</Text>
        <Text style={[styles.sentBody, { color: c.textSecondary }]}>
          Keep an eye out for a text from BLDESY and a call from a Sydney number. One call, no lock-in — your
          founding profile&apos;s free.
        </Text>
      </View>
    );
  }

  const inputStyle = [styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.textPrimary }];

  return (
    <View style={styles.form}>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Name"
        placeholderTextColor={c.textSecondary + '99'}
        textContentType="name"
        autoCapitalize="words"
        maxLength={100}
        accessibilityLabel="Name"
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
      <OptionPicker
        value={trade}
        options={tradeOptions}
        onChange={setTrade}
        placeholder="Your trade"
        accessibilityLabel="Your trade"
        compact
      />
      <OptionPicker
        value={qualifier}
        options={qualifierOptions}
        onChange={setQualifier}
        placeholder="What's eating you most? (optional)"
        accessibilityLabel="What's eating you most about how you get work?"
        compact
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
        <Text style={styles.buttonLabel}>
          {state === 'sending' ? 'Sending…' : "Flick us your number — we'll bell you"}
        </Text>
      </Pressable>

      {error ? (
        <Text style={[styles.error, { color: c.error }]} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <Text style={[styles.consent, { color: c.textSecondary }]}>
        We&apos;ll text a confirmation and call you today about your founding profile. One call — no charge, no
        lock-in, no spam.
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
    minHeight: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
  },
  buttonLabel: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
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
    padding: Spacing.xl,
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
