/**
 * WaitlistForm — port of ~/bldesy-web/components/waitlist/waitlist-form.tsx:
 * one reusable form, two doors, two steps.
 *
 *  - On the /waitlist screen (source "waitlist_page" / "gated_redirect") the
 *    screen supplies the hero heading, so the form hides its own.
 *  - Everywhere else (the zero-results wall, the coverage page) the form shows
 *    its own heading, pre-filled with whatever trade + suburb that surface knows.
 *
 * `source` says WHICH SURFACE this is (lib/data/public-forms WAITLIST_SOURCES).
 * searchedTrade / searchedSuburb record the combo we could not serve; they
 * ride the POST untouched and are never rendered as fields.
 *
 * Step 1 is the whole ask: suburb + ONE contact (email OR Australian mobile)
 * — POST /api/waitlist registers the signup. Step 2 then replaces it in the
 * card: the job/story question (the draw entry — AI trade-tagged with a
 * confirmable chip), urgency, whichever contact channel they DIDN'T give,
 * saved via PATCH with the signed details token. Skipping step 2 loses nothing.
 * Both consents are captured on step 1 beside the field that makes each one
 * meaningful; neither is ever pre-ticked.
 *
 * FORCED LIGHT: the palette is the website's literal hexes (components/waitlist/
 * palette.ts) — host it on a white card on themed screens. The website's
 * Turnstile widget has no app equivalent: the app's X-Mobile-Secret header
 * (lib/api.ts) replaces it server-side.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import {
  CHECK_PATH,
  HeroIcon,
  MAIL_PATH,
  MAP_PIN_PATHS,
  PHONE_PATH,
  SPARKLES_PATH,
} from '@/components/marketing/hero-icon';
import { OptionPicker, type OptionPickerPalette, type PickerOption } from '@/components/marketing/option-picker';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { CLASSIFY_MIN_LENGTH, classifyWaitlistDescription } from '@/lib/data/marketing-waitlist';
import {
  WAITLIST_NETWORK_ERROR,
  joinWaitlist,
  publicFormErrorMessage,
  saveWaitlistDetails,
  type WaitlistEntryType,
  type WaitlistSource,
} from '@/lib/data/public-forms';
import { getFirstTouchAttribution, trackFunnelEvent } from '@/lib/data/tracking';
import { getPostcodeForSuburb, getSuburbSuggestions } from '@/lib/geo';
import { WEB_PAGES } from '@/lib/routes';
import { isValidAuMobile } from '@/lib/web/phone';
import { getTradeBySlug } from '@/lib/web/trades';

import {
  DRAW_ELIGIBILITY_SHORT,
  DRAW_ENTRY_CTA,
  DRAW_LIVE,
  DRAW_NAME,
  DRAW_TERMS_LINK_TEXT,
  LEGACY_PRIZE_AUD,
  drawCardPhrase,
  drawEntryHeading,
  drawStep1Line,
} from './draw-prize';
import { LaunchBadge } from './launch-badge';
import { WL } from './palette';
import { normaliseMateCode } from './referral-codes';
import { WaitlistReferralCard } from './waitlist-referral-card';
import {
  DEFAULT_FORM_TITLE,
  EMAIL_REGEX,
  HOMEOWNER_TRADES,
  ON_WAITLIST_PAGE,
  URGENCY_OPTIONS,
  WAITLIST_ERRORS,
  contactIcon,
  contactVerb,
  parseContact,
  validateStep2,
  type ContactChannel,
  type UrgencyValue,
} from './waitlist-logic';

export { LaunchBadge } from './launch-badge';
export { WhatYouGet } from './what-you-get';

/** What step 1 (and a resumed repeat) hands back — the shape the screen's onJoined sees. */
export interface WaitlistJoinedResult {
  draw_entry_no: number;
  draw_entered: boolean;
  trade_name: string | null;
  suburb: string | null;
  marketing_opt_in: boolean;
  details_token: string | null;
  /** Their shareable MATE- code; null when minting failed (card hides). */
  own_referral_code: string | null;
  referral_bonus_entries: number;
  /** A repeat email/phone resumed the existing signup rather than adding a second row. */
  already: boolean;
}

export interface WaitlistFormProps {
  source: WaitlistSource;
  defaultTrade?: string;
  defaultSuburb?: string;
  defaultPostcode?: string;
  /**
   * THE COMBO WE COULD NOT SERVE. Immutable: never rendered as a field, never
   * editable, never used to seed defaultTrade/defaultSuburb — it rides the POST
   * as its own body field so it survives the visitor editing the suburb box or
   * the trade dropdown.
   */
  searchedTrade?: string;
  searchedSuburb?: string;
  /** This month's draw prize in whole dollars when the surface can read one; defaults to the floor. */
  drawPrize?: number;
  /** A mate's MATE- code carried by a deep link — rides the POST. */
  defaultMateCode?: string;
  title?: string;
  subtitle?: string;
  /** Fires once step 1 lands — lets the /waitlist screen retire its join-focused sections. */
  onJoined?: (result: WaitlistJoinedResult) => void;
}

const TRADE_OPTIONS: readonly PickerOption[] = HOMEOWNER_TRADES.map((t) => ({ value: t.slug, label: t.name }));

const PICKER_PALETTE: Partial<OptionPickerPalette> = {
  fieldBg: WL.white,
  fieldBorder: WL.border,
  text: WL.ink,
  placeholder: WL.placeholder,
  accent: WL.green,
  sheetBg: WL.white,
  divider: WL.cardBorder,
  muted: WL.muted,
};

function openWebPage(url: string) {
  WebBrowser.openBrowserAsync(url).catch(() => {});
}

export function WaitlistForm({
  source,
  defaultTrade = '',
  defaultSuburb = '',
  defaultPostcode = '',
  searchedTrade = '',
  searchedSuburb = '',
  drawPrize = LEGACY_PRIZE_AUD,
  defaultMateCode = '',
  title,
  subtitle,
  onJoined,
}: WaitlistFormProps) {
  const [description, setDescription] = useState('');

  // Trade tagging. When the surface already knows the trade, start confirmed
  // and skip the AI call.
  const [tradeSlug, setTradeSlug] = useState(defaultTrade);
  const [subTrade, setSubTrade] = useState('');
  const [entryType, setEntryType] = useState<WaitlistEntryType | null>(null);
  const [manualTrade, setManualTrade] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const classifiedFor = useRef<string>(defaultTrade ? '__preset__' : '');

  const [suburb, setSuburb] = useState(defaultSuburb);
  const [postcode, setPostcode] = useState(defaultPostcode);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // The step-1 smart field (email OR mobile); parsed into email/phone on
  // submit. channel records which one they gave, so step 2 asks for the other.
  const [contact, setContact] = useState('');
  const [channel, setChannel] = useState<ContactChannel | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [urgency, setUrgency] = useState<'' | UrgencyValue>('');
  const [mateInputOpen, setMateInputOpen] = useState(false);
  const [mateInput, setMateInput] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // result set = step 1 registered; finished = step 2 saved or skipped.
  const [result, setResult] = useState<WaitlistJoinedResult | null>(null);
  const [finished, setFinished] = useState(false);

  const suburbRef = useRef<TextInput>(null);
  const contactRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const formStarted = useRef(false);

  // Suburb autocomplete — on-device dataset, same answers as the website's typeahead.
  const suggestions = useMemo(
    () => (showSuggestions ? getSuburbSuggestions(suburb) : []),
    [showSuggestions, suburb],
  );

  // The rundown is email-only, so the consent has to be pinned to whichever
  // field currently holds the address: on step 1 the smart contact field,
  // from step 2 onward the stored email.
  const consentEmail = (email || contact).trim();
  const emailIsValid = EMAIL_REGEX.test(consentEmail);
  useEffect(() => {
    if (!emailIsValid && marketingOptIn) setMarketingOptIn(false);
  }, [emailIsValid, marketingOptIn]);

  const classifyTrade = useCallback(async () => {
    const text = description.trim();
    if (text.length < CLASSIFY_MIN_LENGTH) return;
    if (classifiedFor.current === text) return;
    if (tradeSlug && manualTrade) return;
    if (classifiedFor.current === '__preset__') return;

    classifiedFor.current = text;
    setClassifying(true);
    try {
      const data = await classifyWaitlistDescription(text);
      if (data.entry_type) setEntryType(data.entry_type);
      if (data.trade_category) {
        setTradeSlug(data.trade_category);
        setSubTrade(data.sub_trade ?? '');
        setManualTrade(false);
      }
    } finally {
      setClassifying(false);
    }
  }, [description, manualTrade, tradeSlug]);

  // Proactively AI-tag the trade as the user types (debounced) so the chip
  // appears without needing to blur.
  useEffect(() => {
    if (description.trim().length < 8) return;
    const t = setTimeout(() => {
      void classifyTrade();
    }, 800);
    return () => clearTimeout(t);
  }, [description, classifyTrade]);

  function onFormStarted() {
    if (formStarted.current) return;
    formStarted.current = true;
    trackFunnelEvent('waitlist_form_started', { source });
  }

  function selectSuburb(value: string) {
    setSuburb(value);
    setShowSuggestions(false);
    setPostcode(getPostcodeForSuburb(value) ?? '');
  }

  /* ── Step 1 — register the signup ────────────────────────────────── */
  async function handleJoin() {
    if (submitting) return;
    setError(null);

    const parsed = parseContact(contact);
    if (!parsed.ok) {
      setError(parsed.error);
      contactRef.current?.focus();
      return;
    }
    if (!suburb.trim()) {
      setError(WAITLIST_ERRORS.missingSuburb);
      suburbRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const data = await joinWaitlist({
        suburb: suburb.trim(),
        postcode: postcode || null,
        email: parsed.email || null,
        phone: parsed.phone || null,
        // The surface's preset trade rides along so the row keeps it even if
        // they never touch step 2.
        trade_category: tradeSlug || null,
        source,
        // THE COMBO WE COULD NOT SERVE — from props, never from the state above.
        searched_trade: searchedTrade || null,
        searched_suburb: searchedSuburb || null,
        referral_code: defaultMateCode || mateInput.trim() || null,
        sms_opt_in: parsed.phone ? smsOptIn : undefined,
        marketing_opt_in: parsed.email ? marketingOptIn : undefined,
        firstTouch: getFirstTouchAttribution(),
      });
      setEmail(parsed.email);
      setPhone(parsed.phone);
      setChannel(parsed.channel);
      const next: WaitlistJoinedResult = {
        draw_entry_no: data.draw_entry_no,
        draw_entered: data.draw_entered === true,
        trade_name: data.trade_name ?? null,
        suburb: data.suburb ?? suburb.trim(),
        // What was actually sent, not a hardcoded false — this drives both the
        // confirmation line and whether step 2 asks again.
        marketing_opt_in: Boolean(parsed.email && marketingOptIn),
        details_token: data.details_token ?? null,
        own_referral_code: data.own_referral_code ?? null,
        referral_bonus_entries: data.referral_bonus_entries ?? 0,
        already: data.already === true,
      };
      setResult(next);
      // A repeat contact RESUMES the existing signup. Already in the draw →
      // straight to the entry-#N confirmation rather than asking the question
      // again (the website's rule for a resumed signup).
      if (next.already && next.draw_entered) setFinished(true);
      onJoined?.(next);
    } catch (e) {
      setError(publicFormErrorMessage(e, WAITLIST_NETWORK_ERROR));
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Step 2 — save the optional details ──────────────────────────── */
  async function handleSaveDetails() {
    if (submitting || !result) return;
    setError(null);

    const phoneTrimmed = channel === 'email' ? phone.trim() : '';
    const emailTrimmed = channel === 'phone' ? email.trim() : '';
    const invalid = validateStep2(channel, phone, email);
    if (invalid) {
      setError(invalid);
      (phoneTrimmed ? phoneRef : emailRef).current?.focus();
      return;
    }

    // No token (dev without the signing secret): the signup already stands,
    // so just finish rather than dead-ending the user.
    if (!result.details_token) {
      setFinished(true);
      return;
    }

    setSubmitting(true);
    try {
      const data = await saveWaitlistDetails({
        details_token: result.details_token,
        job_description: description.trim() || null,
        entry_type: entryType,
        trade_category: tradeSlug || null,
        sub_trade: subTrade || null,
        urgency: urgency || null,
        phone: phoneTrimmed || null,
        email: emailTrimmed || null,
        referral_code: defaultMateCode || mateInput.trim() || null,
        marketing_opt_in: marketingOptIn,
        sms_opt_in: phoneTrimmed ? smsOptIn : undefined,
      });
      setResult({
        ...result,
        draw_entry_no: data.draw_entry_no ?? result.draw_entry_no,
        draw_entered: data.draw_entered === true || result.draw_entered,
        trade_name: data.trade_name ?? result.trade_name,
        marketing_opt_in: marketingOptIn,
        own_referral_code: data.own_referral_code ?? result.own_referral_code,
        referral_bonus_entries: data.referral_bonus_entries ?? result.referral_bonus_entries,
      });
      setFinished(true);
    } catch (e) {
      setError(publicFormErrorMessage(e, WAITLIST_NETWORK_ERROR));
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Mate's referral code — shared by BOTH steps ─────────────────── */
  const normalisedMate = normaliseMateCode(mateInput);
  const mateCodeBlock = defaultMateCode ? (
    <View style={styles.mateApplied}>
      <HeroIcon d={CHECK_PATH} size={16} color={WL.green} strokeWidth={2} />
      <Text style={styles.mateAppliedText}>
        Mate&apos;s code <Text style={styles.mateCode}>{defaultMateCode}</Text> applied — when you join, they get a
        bonus entry in {DRAW_NAME}.
      </Text>
    </View>
  ) : !mateInputOpen ? (
    <Pressable accessibilityRole="button" onPress={() => setMateInputOpen(true)} hitSlop={6} style={styles.mateToggle}>
      <Text style={styles.linkMuted}>Got a mate&apos;s code?</Text>
    </Pressable>
  ) : (
    <View>
      <TextInput
        value={mateInput}
        onChangeText={setMateInput}
        placeholder="MATE-XXXXX"
        placeholderTextColor={WL.placeholder}
        autoCapitalize="characters"
        autoCorrect={false}
        accessibilityLabel="Mate's code"
        style={[styles.input, styles.inputPlain]}
      />
      <Text style={styles.help} accessibilityLiveRegion="polite">
        {mateInput.trim() === '' ? (
          <>Paste the code your mate sent you — they get a bonus draw entry.</>
        ) : normalisedMate ? (
          <Text style={styles.helpGood}>{normalisedMate} — looks good.</Text>
        ) : (
          <>Codes look like MATE-XXXXX — keep typing.</>
        )}
      </Text>
    </View>
  );

  /* ── Confirmation-led step 2 ─────────────────────────────────────── */
  if (result) {
    const place = result.suburb || 'your area';
    const verb = contactVerb(email);
    const tradeName = tradeSlug ? (getTradeBySlug(tradeSlug)?.name ?? null) : null;
    const showChip = Boolean(tradeName) && !manualTrade;

    const confirmationHeader = (
      <View style={styles.confirmHeader} accessibilityRole="header">
        <View style={styles.confirmCircle}>
          <HeroIcon d={CHECK_PATH} size={32} color={WL.green} strokeWidth={2} />
        </View>
        <Text style={styles.confirmTitle}>You&apos;re on the list</Text>
        <View style={styles.confirmBadge}>
          <LaunchBadge tone="onLight" forceLight />
        </View>
        <Text style={styles.confirmBody}>
          We&apos;ll {verb} you when verified tradies go live in <Text style={styles.strongInk}>{place}</Text>
          {' — '}and you&apos;re first in line.
        </Text>
      </View>
    );

    const whatsNext = (
      <View style={styles.whatsNext}>
        <Text style={styles.whatsNextTitle}>What happens next</Text>
        <Text style={styles.whatsNextBody}>
          On launch day we {verb} you the verified tradies covering your suburb — you&apos;re at the front of the
          queue, before we open to the public. No empty searches, no chasing.
        </Text>
        {result.marketing_opt_in ? (
          <Text style={[styles.whatsNextBody, { marginTop: Spacing.md }]}>
            You&apos;re also on the BLDESY rundown, once a fortnight — we&apos;ll send the first one when it&apos;s
            ready.
          </Text>
        ) : null}
      </View>
    );

    // Terminal — the draw question was answered (entry #N) or skipped.
    if (finished) {
      return (
        <View>
          {confirmationHeader}
          {result.draw_entered ? (
            <View style={styles.center}>
              <View style={styles.entryCard}>
                <Text style={styles.entryLabel}>Your {drawCardPhrase(drawPrize)} draw entry</Text>
                <Text style={styles.entryNumber}>#{result.draw_entry_no}</Text>
              </View>
              <Pressable accessibilityRole="link" onPress={() => openWebPage(WEB_PAGES.drawTerms)} hitSlop={6}>
                <Text style={[styles.help, styles.underline, { marginTop: Spacing.sm }]}>Draw T&amp;Cs</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.skipped}>
              You skipped the draw question — you&apos;re still on the list and first in line.
            </Text>
          )}
          {/* Sharing doesn't require a draw entry, so the card shows in both branches. */}
          {result.own_referral_code ? (
            <WaitlistReferralCard code={result.own_referral_code} bonusEntries={result.referral_bonus_entries} />
          ) : null}
          {whatsNext}
        </View>
      );
    }

    // Not finished — confirmation up top, the draw question underneath.
    return (
      <View style={{ gap: Spacing['2xl'] }}>
        {confirmationHeader}
        <View style={styles.step2Card}>
          <View>
            <Text style={styles.step2Title}>{drawEntryHeading(drawPrize)}</Text>
            <Text style={styles.step2Sub}>
              Answer one quick question to go in the draw — skip it and you keep your spot either way.
            </Text>
          </View>

          {/* The draw entry — job or story. Answering enters the draw. */}
          <View>
            <Text style={styles.label}>
              What&apos;s your biggest frustration hiring tradies — or which trades do you need most?
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              onBlur={() => void classifyTrade()}
              multiline
              numberOfLines={3}
              placeholder="e.g. They never turn up when they say — mostly need plumbers & sparkies"
              placeholderTextColor={WL.placeholder}
              accessibilityLabel="What's your biggest frustration hiring tradies — or which trades do you need most?"
              accessibilityHint="A sentence is plenty — whatever you write goes in the draw."
              style={[styles.input, styles.textarea]}
            />
            <Text style={styles.help}>A sentence is plenty — whatever you write goes in the draw.</Text>
          </View>

          {/* AI trade tag — silent inference + a confirmable chip. The slot is
              reserved as soon as a description is typed so the urgency pills
              don't jump under the user's finger. */}
          {description.trim().length >= CLASSIFY_MIN_LENGTH || classifying || showChip || manualTrade ? (
            <View>
              <Text style={styles.label}>Trade</Text>
              <View style={styles.tagSlot}>
                {!classifying && !showChip && !manualTrade ? (
                  <Text style={styles.placeholderText}>We&apos;ll tag the trade from your description automatically.</Text>
                ) : null}
                {classifying ? (
                  <View style={styles.classifying} accessibilityLiveRegion="polite">
                    <ActivityIndicator size="small" color={WL.green} />
                    <Text style={styles.help}>Reading your job…</Text>
                  </View>
                ) : null}
                {!classifying && showChip ? (
                  <View style={styles.chipRow} accessibilityLiveRegion="polite">
                    <View style={styles.tradeChip}>
                      <HeroIcon d={SPARKLES_PATH} size={16} color={WL.green} strokeWidth={1.8} />
                      <Text style={styles.tradeChipText}>
                        Looks like: {tradeName}
                        {subTrade ? ` · ${subTrade}` : ''}
                      </Text>
                    </View>
                    <Pressable accessibilityRole="button" onPress={() => setManualTrade(true)} hitSlop={6}>
                      <Text style={styles.linkMuted}>Not right? Change</Text>
                    </Pressable>
                  </View>
                ) : null}
                {!classifying && manualTrade ? (
                  <OptionPicker
                    value={tradeSlug}
                    options={TRADE_OPTIONS}
                    onChange={(v) => {
                      setTradeSlug(v);
                      setSubTrade('');
                    }}
                    placeholder="Pick the trade that fits"
                    accessibilityLabel="Trade"
                    palette={PICKER_PALETTE}
                  />
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Urgency — feeds the hot-lead alert + launch matching priority. */}
          <View>
            <Text style={styles.label}>
              How soon do you need it? <Text style={styles.labelOptional}>(optional)</Text>
            </Text>
            <View style={styles.pills} accessibilityRole="radiogroup" accessibilityLabel="Urgency">
              {URGENCY_OPTIONS.map(([value, label]) => {
                const active = urgency === value;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    onPress={() => setUrgency(active ? '' : value)}
                    style={[styles.pill, active && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Second contact channel — whichever one step 1 didn't capture. */}
          {channel === 'phone' ? (
            <View>
              <Text style={styles.label}>
                Email <Text style={styles.labelOptional}>(optional)</Text>
              </Text>
              <TextInput
                ref={emailRef}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                placeholder="you@email.com"
                placeholderTextColor={WL.placeholder}
                accessibilityLabel="Email (optional)"
                style={[styles.input, styles.inputPlain]}
              />
            </View>
          ) : (
            <View>
              <Text style={styles.label}>
                Mobile <Text style={styles.labelOptional}>(optional)</Text>
              </Text>
              <TextInput
                ref={phoneRef}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                placeholder="0400 000 000"
                placeholderTextColor={WL.placeholder}
                accessibilityLabel="Mobile (optional)"
                style={[styles.input, styles.inputPlain]}
              />
              {/* SMS consent rides with the phone they're adding — the tick authorises scheduled SMS, nothing else does. */}
              {isValidAuMobile(phone.trim()) ? (
                <ConsentCheck
                  checked={smsOptIn}
                  onChange={setSmsOptIn}
                  label="Text me launch updates (optional). Every message includes an opt-out link."
                  style={{ marginTop: Spacing.sm }}
                />
              ) : null}
            </View>
          )}

          {mateCodeBlock}

          {/* Digest opt-in, SECOND CHANCE — only when step 1 couldn't ask. Email-only. */}
          {!result.marketing_opt_in ? (
            <ConsentCheck
              checked={marketingOptIn}
              onChange={setMarketingOptIn}
              disabled={!emailIsValid}
              label="Send me the BLDESY rundown, once a fortnight — what jobs actually cost, and how to spot a dodgy quote. Unsubscribe anytime."
              note={!emailIsValid ? 'Add an email above to get the rundown.' : undefined}
            />
          ) : null}

          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          <View style={styles.step2Actions}>
            <SubmitButton
              label={submitting ? 'Entering…' : DRAW_ENTRY_CTA}
              onPress={() => void handleSaveDetails()}
              disabled={submitting}
              busy={submitting}
            />
            <Pressable accessibilityRole="button" onPress={() => setFinished(true)} hitSlop={6}>
              <Text style={[styles.linkMuted, { fontSize: 14 }]}>Skip — I&apos;m done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  /* ── Step 1 — suburb + contact ───────────────────────────────────── */
  const showHeading = title !== undefined || !ON_WAITLIST_PAGE.has(source);
  const headingTitle = title ?? DEFAULT_FORM_TITLE;
  const contactGlyph = contactIcon(contact) === 'phone' ? PHONE_PATH : MAIL_PATH;

  return (
    <View style={styles.stack}>
      {showHeading ? (
        <View style={styles.heading}>
          <Text style={styles.headingTitle} accessibilityRole="header">
            {headingTitle}
          </Text>
          {subtitle ? <Text style={styles.headingSub}>{subtitle}</Text> : null}
        </View>
      ) : null}
      <StepHeader step={1} label="Step 1 of 2 · takes 30 seconds" />

      {/* Suburb — autocomplete + auto postcode */}
      <View>
        <View style={styles.fieldWrap}>
          <View style={styles.leadingIcon}>
            <HeroIcon d={MAP_PIN_PATHS} size={18} color={WL.green} strokeWidth={1.8} />
          </View>
          <TextInput
            ref={suburbRef}
            value={suburb}
            onChangeText={(v) => {
              setSuburb(v);
              setPostcode('');
              setShowSuggestions(true);
            }}
            onFocus={() => {
              setShowSuggestions(true);
              onFormStarted();
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            autoCorrect={false}
            autoCapitalize="words"
            placeholder="Suburb or postcode"
            placeholderTextColor={WL.placeholder}
            accessibilityLabel="Suburb"
            style={[styles.input, styles.inputWithIcon]}
          />
        </View>
        {showSuggestions && suggestions.length > 0 ? (
          <View style={styles.suggestions} accessibilityRole="menu">
            {suggestions.map((s) => (
              <Pressable
                key={s}
                accessibilityRole="menuitem"
                onPress={() => selectSuburb(s)}
                style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: WL.mint }]}
              >
                <Text style={styles.suggestionText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {/* Contact — one smart field, email OR mobile. The icon follows what they're typing. */}
      <View style={styles.fieldWrap}>
        <View style={styles.leadingIcon}>
          <HeroIcon d={contactGlyph} size={18} color={WL.green} strokeWidth={1.8} />
        </View>
        <TextInput
          ref={contactRef}
          value={contact}
          onChangeText={setContact}
          onFocus={onFormStarted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Email or mobile"
          placeholderTextColor={WL.placeholder}
          accessibilityLabel="Email or mobile"
          style={[styles.input, styles.inputWithIcon]}
        />
      </View>

      <SubmitButton
        label={submitting ? 'Joining…' : 'Get on the list →'}
        onPress={() => void handleJoin()}
        disabled={submitting}
        busy={submitting}
      />

      {/* The draw is answer-gated — the step-2 question enters you, joining alone doesn't. */}
      <Text style={styles.drawLine}>
        {DRAW_LIVE ? (
          drawStep1Line(drawPrize)
        ) : (
          <>
            One quick question after you join enters you in the draw for a{' '}
            <Text style={styles.strongInk}>{drawCardPhrase(drawPrize)}</Text>.
          </>
        )}
      </Text>

      {/* Optional trade — skippable. Selecting here counts as a manual pick. */}
      <OptionPicker
        value={tradeSlug}
        options={TRADE_OPTIONS}
        onChange={(v) => {
          setTradeSlug(v);
          setSubTrade('');
          if (v) {
            setManualTrade(true);
            classifiedFor.current = '__preset__';
          }
        }}
        placeholder="What do you need done? (optional)"
        accessibilityLabel="What do you need done? (optional)"
        palette={PICKER_PALETTE}
      />

      {mateCodeBlock}

      {/* SMS-updates consent — only when the smart field holds a mobile. */}
      {isValidAuMobile(contact.trim()) ? (
        <ConsentCheck
          checked={smsOptIn}
          onChange={setSmsOptIn}
          label="Text me launch updates (optional). Every message includes an opt-out link."
        />
      ) : null}

      {/* Digest consent — the email-side mirror of the SMS tick. Never pre-ticked. */}
      {EMAIL_REGEX.test(contact.trim()) ? (
        <ConsentCheck
          checked={marketingOptIn}
          onChange={setMarketingOptIn}
          label="Send me the BLDESY rundown, once a fortnight (optional) — what jobs actually cost, and how to spot a dodgy quote. Unsubscribe anytime."
        />
      ) : null}

      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {/* Consent disclosure — the basis the launch audience already sends on. */}
      <Text style={styles.disclosure}>
        Free for homeowners — tradies pay a flat fee, you never do. By joining, you agree to receive email or SMS
        updates about your BLDESY waitlist status and when verified tradies go live in your suburb. Unsubscribe
        anytime — see our{' '}
        <Text style={styles.disclosureLink} onPress={() => openWebPage(WEB_PAGES.privacy)} accessibilityRole="link">
          Privacy Policy
        </Text>{' '}
        and{' '}
        <Text style={styles.disclosureLink} onPress={() => openWebPage(WEB_PAGES.drawTerms)} accessibilityRole="link">
          {DRAW_TERMS_LINK_TEXT}
        </Text>{' '}
        (draw open to {DRAW_ELIGIBILITY_SHORT}).
      </Text>
    </View>
  );
}

/* ── Small bits ──────────────────────────────────────────────────── */

function StepHeader({ step, label }: { step: 1 | 2; label: string }) {
  return (
    <View style={styles.stepHeader}>
      <Text style={styles.stepLabel}>{label}</Text>
      <View style={styles.dashes} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={[styles.dash, { backgroundColor: WL.green }]} />
        <View style={[styles.dash, { backgroundColor: step === 2 ? WL.green : WL.dashOff }]} />
      </View>
    </View>
  );
}

function SubmitButton({
  label,
  onPress,
  disabled,
  busy,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.submit,
        pressed && { backgroundColor: WL.ctaDark, transform: [{ scale: 0.98 }] },
        disabled && { opacity: 0.7 },
      ]}
    >
      <Text style={styles.submitLabel}>{label}</Text>
    </Pressable>
  );
}

function ConsentCheck({
  checked,
  onChange,
  label,
  note,
  disabled = false,
  style,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  note?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={[styles.consent, disabled && { opacity: 0.6 }, style]}
    >
      <View style={[styles.checkbox, checked && styles.checkboxOn]}>
        {checked ? <HeroIcon d={CHECK_PATH} size={12} color="#ffffff" strokeWidth={3} /> : null}
      </View>
      <Text style={styles.consentText}>
        {label}
        {note ? <Text style={styles.consentNote}>{'\n'}{note}</Text> : null}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.md,
  },
  heading: {
    alignItems: 'center',
    paddingBottom: Spacing.xs,
  },
  headingTitle: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
    color: WL.ink,
  },
  headingSub: {
    marginTop: Spacing.xs,
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: WL.muted,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  stepLabel: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: WL.muted,
  },
  dashes: {
    flexDirection: 'row',
    gap: 4,
  },
  dash: {
    height: 6,
    width: 16,
    borderRadius: 3,
  },
  fieldWrap: {
    position: 'relative',
  },
  leadingIcon: {
    position: 'absolute',
    left: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  input: {
    height: 52,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: WL.border,
    backgroundColor: WL.white,
    fontFamily: FontFamily.body,
    fontSize: 16, // iOS auto-zoom guard; web is text-sm
    color: WL.ink,
  },
  inputWithIcon: {
    paddingLeft: 40,
    paddingRight: 12,
  },
  inputPlain: {
    paddingHorizontal: 16,
  },
  textarea: {
    height: undefined,
    minHeight: 84,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  suggestions: {
    marginTop: 4,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: WL.border,
    backgroundColor: WL.white,
    overflow: 'hidden',
  },
  suggestion: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestionText: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    color: WL.ink,
  },
  submit: {
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: WL.cta,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  submitLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
    color: WL.white,
  },
  drawLine: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    color: WL.muted,
  },
  strongInk: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    color: WL.ink,
  },
  mateApplied: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: WL.mint,
    padding: Spacing.md,
  },
  mateAppliedText: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: 12,
    lineHeight: 18,
    color: WL.ink,
  },
  mateCode: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    color: WL.green,
  },
  mateToggle: {
    alignSelf: 'flex-start',
  },
  linkMuted: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
    color: WL.muted,
    textDecorationLine: 'underline',
  },
  help: {
    marginTop: 6,
    fontFamily: FontFamily.body,
    fontSize: 12,
    lineHeight: 18,
    color: WL.muted,
  },
  helpGood: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    color: WL.green,
  },
  underline: {
    textDecorationLine: 'underline',
  },
  consent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: Radius.lg,
    backgroundColor: WL.cream,
    padding: Spacing.md,
  },
  checkbox: {
    width: 18,
    height: 18,
    marginTop: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: WL.border,
    backgroundColor: WL.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: WL.green,
    borderColor: WL.green,
  },
  consentText: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: 12,
    lineHeight: 18,
    color: WL.muted,
  },
  consentNote: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  error: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 20,
    color: WL.error,
  },
  disclosure: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: WL.placeholder,
  },
  disclosureLink: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    color: WL.green,
    textDecorationLine: 'underline',
  },

  /* Step 2 */
  confirmHeader: {
    alignItems: 'center',
  },
  confirmCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: WL.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  confirmTitle: {
    fontFamily: FontFamily.display,
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
    color: WL.ink,
  },
  confirmBadge: {
    marginTop: Spacing.md,
  },
  confirmBody: {
    marginTop: Spacing.md,
    maxWidth: 420,
    fontFamily: FontFamily.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: WL.muted,
  },
  step2Card: {
    gap: Spacing.xl,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: WL.cardBorder,
    backgroundColor: WL.white,
    padding: Spacing.xl,
  },
  step2Title: {
    fontFamily: FontFamily.display,
    fontSize: 20,
    lineHeight: 26,
    color: WL.ink,
  },
  step2Sub: {
    marginTop: Spacing.xs,
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    color: WL.muted,
  },
  label: {
    marginBottom: 6,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 20,
    color: WL.ink,
  },
  labelOptional: {
    fontFamily: FontFamily.body,
    fontWeight: '400',
    color: WL.placeholder,
  },
  tagSlot: {
    minHeight: 36,
    justifyContent: 'center',
  },
  placeholderText: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    color: WL.placeholder,
  },
  classifying: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tradeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    backgroundColor: WL.mint,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tradeChipText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
    color: WL.green,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  pill: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: WL.border,
    backgroundColor: WL.white,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pillActive: {
    borderColor: WL.green,
    backgroundColor: WL.mint,
  },
  pillText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
    color: WL.muted,
  },
  pillTextActive: {
    color: WL.green,
  },
  step2Actions: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  center: {
    alignItems: 'center',
  },
  entryCard: {
    marginTop: Spacing.xl,
    alignItems: 'center',
    borderRadius: Radius.xl,
    backgroundColor: WL.green,
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.lg,
    shadowColor: WL.green,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  entryLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.8)',
  },
  entryNumber: {
    marginTop: Spacing.xs,
    fontFamily: FontFamily.display,
    fontSize: 36,
    lineHeight: 40,
    color: WL.white,
  },
  skipped: {
    marginTop: Spacing.lg,
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: WL.muted,
  },
  whatsNext: {
    marginTop: Spacing['2xl'],
    borderRadius: Radius.lg,
    backgroundColor: WL.cream,
    padding: Spacing.lg,
  },
  whatsNextTitle: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 22,
    color: WL.ink,
  },
  whatsNextBody: {
    marginTop: Spacing.xs,
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    color: WL.muted,
  },
});
