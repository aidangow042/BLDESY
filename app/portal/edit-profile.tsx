/**
 * Edit Profile — port of ~/bldesy-web/app/portal/edit-profile/page.tsx.
 * Six steps (Business · Location · Credentials · What you bring · Projects ·
 * Team & FAQs), `?step=N` deep links from the dashboard checklist, and ONE
 * "Save All Changes" (lib/data/profile-edit.ts saveEditProfile) that also
 * saves capabilities when that step is mounted — exactly like the website.
 * Credentials are read-only here with a web hand-off (decision D2).
 */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { CapabilitiesStep, type CapabilitiesStepHandle } from '@/components/builder/capabilities-step';
import { usePortal } from '@/components/portal/portal-context';
import { BasicsStep } from '@/components/edit-profile/basics-step';
import { CredentialsStep } from '@/components/edit-profile/credentials-step';
import { Banner } from '@/components/edit-profile/form-primitives';
import { LocationStep } from '@/components/edit-profile/location-step';
import { ProjectsStep } from '@/components/edit-profile/projects-step';
import { TeamFaqsStep } from '@/components/edit-profile/team-faqs-step';
import type { StepProps } from '@/components/edit-profile/types';
import { PortalPage } from '@/components/tradie/portal-page';
import { useToast } from '@/components/ui';
import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@/lib/auth-context';
import {
  EDIT_PROFILE_STEPS,
  editProfileFormFrom,
  saveEditProfile,
  type EditProfileForm,
} from '@/lib/data/profile-edit';

const SAVED_MESSAGE = 'Profile saved successfully!';

/** `?step=N` → clamped step index (0..5), like the website's window read. */
export function parseStepParam(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = parseInt(value ?? '', 10);
  return Number.isFinite(n) ? Math.min(EDIT_PROFILE_STEPS.length - 1, Math.max(0, n)) : 0;
}

export default function EditProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const toast = useToast();
  const { user } = useUser();
  const { profile, refreshProfile } = usePortal();
  const params = useLocalSearchParams<{ step?: string }>();

  const [step, setStep] = useState(() => parseStepParam(params.step));
  const [form, setForm] = useState<EditProfileForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const capabilitiesRef = useRef<CapabilitiesStepHandle | null>(null);

  // Follow a later ?step= deep link (e.g. a status-card tap while mounted).
  useEffect(() => {
    if (params.step !== undefined) setStep(parseStepParam(params.step));
  }, [params.step]);

  // Populate from profile — only on first load, not on every refresh.
  const loaded = useRef(false);
  useEffect(() => {
    if (!profile || loaded.current) return;
    loaded.current = true;
    setForm(editProfileFormFrom(profile));
  }, [profile]);

  const update: StepProps['update'] = (key, value) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  async function handleSave() {
    if (!user || !form) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await saveEditProfile(form);
      // Capabilities live in their own table and use the website API so the
      // White Card number can be encrypted before storage.
      const capRes = await capabilitiesRef.current?.save();
      if (capRes && capRes.success === false) {
        const msg = capRes.error ?? 'Failed to save capabilities.';
        setError(msg);
        toast.show(msg, { variant: 'error' });
        return;
      }
      setSaved(true);
      toast.show(SAVED_MESSAGE, { variant: 'success' });
      await refreshProfile();
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.show(msg, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const stepProps: StepProps | null =
    form && profile && user
      ? {
          form,
          update,
          setForm: (next) =>
            setForm((prev) => (prev ? (typeof next === 'function' ? next(prev) : next) : prev)),
          profile,
          userId: user.id,
          setError,
          refreshProfile,
        }
      : null;

  return (
    <PortalPage title="Edit Profile" subtitle="Keep your profile up to date to attract more clients">
      <Pressable
        onPress={handleSave}
        disabled={saving || !stepProps}
        style={[styles.saveBtn, { backgroundColor: c.primary, opacity: saving || !stepProps ? 0.5 : 1 }]}
        accessibilityRole="button"
        accessibilityState={{ disabled: saving || !stepProps, busy: saving }}
      >
        {saving ? <ActivityIndicator size="small" color="#fff" /> : null}
        <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save All Changes'}</Text>
      </Pressable>

      {saved ? <Banner tone="success">{SAVED_MESSAGE}</Banner> : null}
      {error ? <Banner tone="error">{error}</Banner> : null}

      {/* Step tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabs, { backgroundColor: c.surface, borderColor: c.border }]}
        contentContainerStyle={styles.tabsContent}
      >
        {EDIT_PROFILE_STEPS.map((s, i) => {
          const active = step === i;
          return (
            <Pressable
              key={s}
              onPress={() => setStep(i)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.tab, active && [Shadows.sm, { backgroundColor: c.primary }]]}
            >
              <Text style={[styles.tabText, { color: active ? '#fff' : c.textSecondary }]}>
                <Text style={styles.tabNumber}>{i + 1} </Text>
                {s}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Step content card */}
      <View style={[styles.card, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border }]}>
        {!stepProps ? (
          <View style={styles.loading}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : (
          <>
            {step === 0 ? <BasicsStep {...stepProps} /> : null}
            {step === 1 ? <LocationStep {...stepProps} /> : null}
            {step === 2 ? <CredentialsStep {...stepProps} /> : null}
            {step === 3 ? <CapabilitiesStep ref={capabilitiesRef} /> : null}
            {step === 4 ? <ProjectsStep {...stepProps} /> : null}
            {step === 5 ? <TeamFaqsStep {...stepProps} /> : null}
          </>
        )}
      </View>
    </PortalPage>
  );
}

const styles = StyleSheet.create({
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: 10,
    minHeight: 44,
  },
  saveText: { color: '#fff', fontSize: 14, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  tabs: { borderWidth: 1, borderRadius: Radius.lg, flexGrow: 0 },
  tabsContent: { padding: 4, gap: 4 },
  tab: { borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: 10, minWidth: 80, minHeight: 40, justifyContent: 'center' },
  tabText: { fontSize: 12, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  tabNumber: { opacity: 0.6 },
  card: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing['2xl'] },
  loading: { paddingVertical: Spacing['4xl'], alignItems: 'center' },
});
