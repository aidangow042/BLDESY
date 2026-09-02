/**
 * /help — port of ~/bldesy-web/app/help/page.tsx: the FAQ accordion and the
 * contact form (POST /api/contact via lib/data/public-forms). The Turnstile
 * widget has no app equivalent — X-Mobile-Secret replaces it server-side.
 *
 * App-specific and deliberate: the "Quick links" card (Terms / Privacy open
 * the live website pages; "Rate BLDESY! on App Store" is kept as-is).
 */
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { AppShell } from '@/components/layout';
import { Footer } from '@/components/layout/footer';
import { FAQItem, LEGAL_PAGES, openLegalPage, type FAQ } from '@/components/marketing';
import { useToast } from '@/components/ui';
import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ApiError } from '@/lib/api';
import { CONTACT_FAILED_ERROR, CONTACT_NETWORK_ERROR, submitContactForm } from '@/lib/data/public-forms';
import { COVERAGE } from '@/lib/web/service-areas';

const FAQS: FAQ[] = [
  {
    question: 'How do I find a tradie?',
    answer:
      'Search by trade and suburb, browse the map, or ask the AI assistant to point you at the right trade. Every tradie profile shows their checked credentials, qualifications, and the areas they service.',
  },
  {
    question: 'Is BLDESY! free for homeowners?',
    answer:
      'Yes — free now and always. Searching, posting a job, messaging tradies and leaving reviews will never cost you anything. Tradies pay a flat monthly fee; you never do.',
  },
  {
    question: 'How do I post a job?',
    answer:
      "From launch day: tap Post a Job, describe the work — trade, suburb, budget, photos — and verified tradies covering your area can respond. Right now, join the waitlist and we'll tell you the moment your suburb opens.",
  },
  {
    question: 'How do tradies get verified?',
    answer:
      "Every tradie is checked five ways before their profile appears — ABN against the Australian Business Register, licence with NSW Fair Trading or QBCC, photo ID matched to the account, White Card, and insurance certificates AI-checked and human-reviewed. No self-declared credentials. Licensed trades are checked five ways; trades that don't carry a licence — like cleaning — are still ABN-checked, ID-matched and insurance-checked; licence and White Card just don't apply.",
  },
  {
    question: 'How do I leave a review?',
    answer:
      "Once a job's done through BLDESY, you'll get a prompt to rate work quality, punctuality, communication and value. Honest reviews are the only kind we allow — we don't fake or filter them.",
  },
  {
    question: 'What areas does BLDESY! cover?',
    answer: `We’re launching in inner Sydney first — ${COVERAGE.line} — and expanding area by area from there. If your area isn’t covered yet, sign up and we’ll notify you when tradies in your region join the platform.`,
  },
  {
    question: 'How much do tradies pay to be on BLDESY!?',
    answer:
      'Tradies pay a flat monthly subscription fee to be listed on BLDESY!. There are no per-lead fees, no commission on jobs, and no hidden charges. This means tradies can focus on doing great work without worrying about escalating costs.',
  },
  {
    question: 'How do I contact support?',
    answer:
      'You can reach our support team by filling out the contact form below, or by emailing us directly at hello@bldesy.com.au. We aim to respond to all enquiries within one business day.',
  },
  {
    question: 'Can I save tradies to a shortlist?',
    answer:
      "You'll be able to save any tradie to your shortlist with one tap and come back to them when you're ready.",
  },
  {
    question: 'What if I’m not happy with the work?',
    answer:
      'We encourage you to first discuss any concerns directly with your tradie. If the issue isn’t resolved, contact our support team and we’ll help mediate. Your honest review also helps us maintain quality standards on the platform.',
  },
];

const QUICK_LEGAL = LEGAL_PAGES.filter((p) => p.key === 'terms' || p.key === 'privacy');

export default function HelpScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const toast = useToast();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  // The web relies on the inputs' `required`; disable the button until all three are filled.
  const canSubmit = Boolean(name.trim() && email.trim() && message.trim()) && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await submitContactForm({ name, email, message });
      setSubmitted(true);
      setName('');
      setEmail('');
      setMessage('');
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setSubmitted(false), 5000);
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message || CONTACT_FAILED_ERROR : CONTACT_NETWORK_ERROR, {
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = [styles.input, { backgroundColor: c.canvas, borderColor: c.border, color: c.textPrimary }];

  return (
    <AppShell title="Help & Support" showBack>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.main}>
          <Text style={[styles.h1, { color: c.textPrimary }]} accessibilityRole="header">
            Help &amp; Support
          </Text>
          <Text style={[styles.intro, { color: c.textSecondary }]}>
            Got a question? Check our FAQs below or get in touch with the team.
          </Text>

          {/* FAQ Accordion */}
          <View style={styles.section}>
            <Text style={[styles.h2, { color: c.textPrimary }]} accessibilityRole="header">
              Frequently Asked Questions
            </Text>
            <Text style={[styles.sectionNote, { color: c.textSecondary }]}>
              BLDESY is pre-launch — we&apos;re verifying tradies across inner Sydney now, zone by zone. These answers
              describe how it works from the day your area opens.
            </Text>
            <View style={styles.faqs}>
              {FAQS.map((faq, index) => (
                <FAQItem
                  key={faq.question}
                  question={faq.question}
                  answer={faq.answer}
                  open={openIndex === index}
                  onToggle={() => setOpenIndex(openIndex === index ? null : index)}
                />
              ))}
            </View>
          </View>

          {/* Contact Form */}
          <View style={styles.section}>
            <Text style={[styles.h2, { color: c.textPrimary }]} accessibilityRole="header">
              Contact Us
            </Text>
            <Text style={[styles.sectionNote, { color: c.textSecondary }]}>
              Can&apos;t find what you&apos;re looking for? Send us a message and we&apos;ll get back to you within one
              business day.
            </Text>

            {submitted ? (
              <View
                accessibilityRole="alert"
                style={[styles.success, { borderColor: c.success + '4D', backgroundColor: c.success + '0D' }]}
              >
                <Text style={[styles.successText, { color: c.success }]}>
                  Thanks for your message! We&apos;ll be in touch shortly.
                </Text>
              </View>
            ) : null}

            <View style={[styles.formCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View>
                <Text style={[styles.label, { color: c.textSecondary }]}>Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={c.textSecondary + '80'}
                  textContentType="name"
                  autoCapitalize="words"
                  accessibilityLabel="Name"
                  style={inputStyle}
                />
              </View>
              <View>
                <Text style={[styles.label, { color: c.textSecondary }]}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={c.textSecondary + '80'}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Email"
                  style={inputStyle}
                />
              </View>
              <View>
                <Text style={[styles.label, { color: c.textSecondary }]}>Message</Text>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Tell us how we can help..."
                  placeholderTextColor={c.textSecondary + '80'}
                  multiline
                  numberOfLines={5}
                  accessibilityLabel="Message"
                  style={[...inputStyle, styles.textarea]}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSubmit, busy: submitting }}
                disabled={!canSubmit}
                onPress={() => void handleSubmit()}
                style={({ pressed }) => [
                  styles.submit,
                  { backgroundColor: pressed ? c.primaryDark : c.primary },
                  !canSubmit && { opacity: 0.5 },
                ]}
              >
                <Text style={styles.submitLabel}>{submitting ? 'Sending...' : 'Send Message'}</Text>
              </Pressable>
            </View>

            <Text style={[styles.orEmail, { color: c.textSecondary }]}>
              Or email us at{' '}
              <Text
                accessibilityRole="link"
                onPress={() => Linking.openURL('mailto:hello@bldesy.com.au').catch(() => {})}
                style={[styles.emailLink, { color: c.primary }]}
              >
                hello@bldesy.com.au
              </Text>
            </Text>
          </View>

          {/* Quick links — app-specific */}
          <View style={styles.section}>
            <Text style={[styles.quickTitle, { color: c.textSecondary }]}>QUICK LINKS</Text>
            <View style={[styles.linksCard, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border }]}>
              {[
                ...QUICK_LEGAL.map((page) => ({
                  label: page.title,
                  icon: (page.key === 'terms' ? 'description' : 'privacy-tip') as 'description' | 'privacy-tip',
                  onPress: () => openLegalPage(page.url),
                })),
                {
                  label: 'Rate BLDESY! on App Store',
                  icon: 'star-outline' as const,
                  onPress: () => {},
                },
              ].map((link, i) => (
                <Pressable
                  key={link.label}
                  accessibilityRole="button"
                  onPress={link.onPress}
                  style={({ pressed }) => [
                    styles.linkRow,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
                    pressed && { backgroundColor: c.canvas },
                  ]}
                >
                  <View style={[styles.linkIconWrap, { backgroundColor: c.primaryBg }]}>
                    <MaterialIcons name={link.icon} size={16} color={c.primary} />
                  </View>
                  <Text style={[styles.linkLabel, { color: c.textPrimary }]}>{link.label}</Text>
                  <MaterialIcons name="chevron-right" size={18} color={c.textSecondary} />
                </Pressable>
              ))}
            </View>
          </View>
        </View>
        <Footer />
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 0,
  },
  main: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['4xl'],
    maxWidth: 768,
    alignSelf: 'center',
    width: '100%',
  },
  h1: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 30,
    lineHeight: 36,
    marginBottom: Spacing.sm,
  },
  intro: {
    fontFamily: FontFamily.body,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: Spacing['4xl'],
  },
  section: {
    marginBottom: Spacing['5xl'],
  },
  h2: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 20,
    lineHeight: 28,
    marginBottom: Spacing.sm,
  },
  sectionNote: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  faqs: {
    gap: Spacing.md,
  },
  success: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing['2xl'],
  },
  successText: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 20,
  },
  formCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing['2xl'],
    gap: Spacing.lg,
  },
  label: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 14,
    marginBottom: 4,
  },
  input: {
    minHeight: 44,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    fontFamily: FontFamily.body,
    fontSize: 16,
  },
  textarea: {
    minHeight: 132,
    textAlignVertical: 'top',
  },
  submit: {
    alignSelf: 'flex-start',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: 10,
  },
  submitLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
    color: '#ffffff',
  },
  orEmail: {
    marginTop: Spacing.lg,
    fontFamily: FontFamily.body,
    fontSize: 14,
    textAlign: 'center',
  },
  emailLink: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  quickTitle: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
  linksCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    minHeight: 52,
  },
  linkIconWrap: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLabel: {
    flex: 1,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 15,
  },
});
