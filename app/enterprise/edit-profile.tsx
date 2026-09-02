/**
 * /enterprise/edit-profile — Edit Company Profile. Port of
 * ~/bldesy-web/app/enterprise/edit-profile/page.tsx: five steps (Basics,
 * Location, Credentials, Projects, Contact), the website's labels,
 * placeholders and validation strings, logo / cover / project media uploads
 * to `enterprise-media` (+ moderation), one-tap service regions from
 * AU_STATES / CITY_REGIONS, past projects with up to MAX_PROJECT_VIDEOS videos.
 *
 * Credential verification (AbnVerifyInline, MultiLicenceList, InsuranceSlots)
 * is a web hand-off in the app (CLAUDE.md §7): the Credentials step links to
 * the website's edit page instead of rebuilding those widgets.
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { useEnterprise } from '@/components/enterprise/enterprise-context';
import { ChipInput, ChoicePills, FieldLabel, HubInput, Segmented, SuggestChip } from '@/components/enterprise/hub-form';
import {
  HubScreen,
  InlineBanner,
  PageTitle,
  PillButton,
  SectionCard,
  Spinner,
  useHubTheme,
} from '@/components/enterprise/hub-primitives';
import { pickImage, pickVideo } from '@/components/enterprise/media-pickers';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useUser } from '@/lib/auth-context';
import {
  addChip,
  addProjectPhoto,
  addProjectVideo,
  COMPANY_SIZES,
  emptyPastProject,
  ENTERPRISE_EDIT_STEPS,
  enterpriseEditFormFrom,
  MAX_PROJECT_VIDEOS,
  removeChip,
  removeProject,
  removeProjectPhoto,
  removeProjectVideo,
  saveEnterpriseProfile,
  SAVED_MESSAGE,
  suggestedRegionsFor,
  toggleTradeNeeded,
  updateProject,
  uploadFailedMessage,
  type EnterpriseEditForm,
} from '@/lib/enterprise-hub/edit-profile';
import { uploadEnterpriseMedia, uploadEnterpriseVideo } from '@/lib/enterprise-hub/media';
import { toHref } from '@/lib/enterprise-hub/nav';
import { validateImageFile, validateVideoFile } from '@/lib/enterprise-hub/upload-validation';
import { dispatchProfileChanged } from '@/lib/events/profile';
import { getSuburbSuggestions } from '@/lib/geo';
import { ROUTES, WEB_BASE } from '@/lib/routes';
import { TRADE_CATEGORIES } from '@/lib/web/trades';
import type { CompanySize, EnterprisePastProject } from '@/types/database';

const STEP_OPTIONS = ENTERPRISE_EDIT_STEPS.map((s) => ({ key: s, label: s }));
type Step = (typeof ENTERPRISE_EDIT_STEPS)[number];
const SIZE_OPTIONS = COMPANY_SIZES.map((s) => ({ key: s, label: s }));

export default function EnterpriseEditProfileScreen() {
  const c = useHubTheme();
  const { authedUser } = useUser();
  const { profile, refreshProfile } = useEnterprise();

  const [step, setStep] = useState<Step>('Basics');
  const [form, setForm] = useState<EnterpriseEditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingProjectPhoto, setUploadingProjectPhoto] = useState<number | null>(null);
  const [uploadingProjectVideo, setUploadingProjectVideo] = useState<number | null>(null);
  const [suburbSuggestions, setSuburbSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // One-shot hydrate from the fetched profile — not on every profile refresh.
  const loaded = useRef(false);
  useEffect(() => {
    if (!profile || loaded.current) return;
    loaded.current = true;
    setForm(enterpriseEditFormFrom(profile));
  }, [profile]);

  const set = <K extends keyof EnterpriseEditForm>(key: K, value: EnterpriseEditForm[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await saveEnterpriseProfile(form);
      setSuccess(true);
      dispatchProfileChanged();
      await refreshProfile();
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function uploadImageTo(
    folder: 'logo' | 'cover' | `project-${number}`,
    setBusy: (busy: boolean) => void,
  ): Promise<string | null> {
    if (!authedUser) return null;
    const picked = await pickImage();
    if (!picked) return null;
    const invalid = validateImageFile(picked);
    if (invalid) {
      setError(invalid);
      return null;
    }
    setBusy(true);
    try {
      const { url } = await uploadEnterpriseMedia(picked.uri, authedUser.id, folder, picked.mimeType);
      return url;
    } catch (e) {
      setError(uploadFailedMessage(e instanceof Error ? e.message : String(e)));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function handleLogoUpload() {
    const url = await uploadImageTo('logo', setUploadingLogo);
    if (url) set('logoUrl', url);
  }

  async function handleCoverUpload() {
    const url = await uploadImageTo('cover', setUploadingCover);
    if (url) set('coverPhotoUrl', url);
  }

  async function handleProjectPhotoUpload(projectIndex: number) {
    const url = await uploadImageTo(`project-${projectIndex}`, (busy) => setUploadingProjectPhoto(busy ? projectIndex : null));
    if (url) setForm((prev) => (prev ? { ...prev, pastProjects: addProjectPhoto(prev.pastProjects, projectIndex, url) } : prev));
  }

  async function handleProjectVideoUpload(projectIndex: number) {
    if (!authedUser || !form) return;
    if ((form.pastProjects[projectIndex]?.videos || []).length >= MAX_PROJECT_VIDEOS) {
      setError(`Maximum ${MAX_PROJECT_VIDEOS} videos per project.`);
      return;
    }
    const picked = await pickVideo();
    if (!picked) return;
    const invalid = validateVideoFile(picked);
    if (invalid) {
      setError(invalid);
      return;
    }
    setUploadingProjectVideo(projectIndex);
    try {
      const video = await uploadEnterpriseVideo(picked.uri, authedUser.id, projectIndex, picked.mimeType);
      setForm((prev) => {
        if (!prev) return prev;
        const res = addProjectVideo(prev.pastProjects, projectIndex, video);
        if (!res.ok) {
          setError(res.error);
          return prev;
        }
        return { ...prev, pastProjects: res.projects };
      });
    } catch (e) {
      setError(uploadFailedMessage(e instanceof Error ? e.message : String(e)));
    } finally {
      setUploadingProjectVideo(null);
    }
  }

  function handleSuburbChange(value: string) {
    set('suburb', value);
    const results = value.trim().length > 0 ? getSuburbSuggestions(value) : [];
    setSuburbSuggestions(results);
    setShowSuggestions(results.length > 0);
  }

  function updateProjectField<K extends keyof EnterprisePastProject>(index: number, field: K, value: EnterprisePastProject[K]) {
    setForm((prev) => (prev ? { ...prev, pastProjects: updateProject(prev.pastProjects, index, { [field]: value }) } : prev));
  }

  function openWebCredentials() {
    // The app-bridge allowlist has no `enterprise/edit-profile`; open the page
    // directly and let the website prompt for login where it needs to.
    void WebBrowser.openBrowserAsync(`${WEB_BASE}/enterprise/edit-profile`).then(() => void refreshProfile());
  }

  if (!form) {
    return (
      <View style={{ flex: 1, backgroundColor: c.canvas }}>
        <Spinner minHeight={320} />
      </View>
    );
  }

  const saveButton = <PillButton label={saving ? 'Saving...' : 'Save All Changes'} onPress={handleSave} loading={saving} />;

  return (
    <HubScreen gap={Spacing['2xl']}>
      <PageTitle title="Edit Company Profile" subtitle="Update your public company profile" />
      <View style={{ alignSelf: 'flex-start' }}>{saveButton}</View>

      {success ? <InlineBanner tone="success">{SAVED_MESSAGE}</InlineBanner> : null}
      {error ? <InlineBanner tone="error">{error}</InlineBanner> : null}

      {/* Step tabs */}
      <Segmented options={STEP_OPTIONS} value={step} onChange={setStep} scroll />

      <SectionCard padding={Spacing['2xl']}>
        {/* Step 1: Basics */}
        {step === 'Basics' ? (
          <View style={styles.fields}>
            <HubInput label="Company Name" value={form.companyName} onChangeText={(v) => set('companyName', v)} />
            <HubInput
              label="ABN"
              value={form.abn}
              onChangeText={(v) => set('abn', v)}
              placeholder="XX XXX XXX XXX"
              hint="Add trade licences in the Credentials step."
              keyboardType="number-pad"
            />

            {/* Logo upload */}
            <View>
              <FieldLabel>Company Logo</FieldLabel>
              <View style={styles.logoRow}>
                {form.logoUrl ? (
                  <View style={[styles.logoBox, { borderColor: c.border }]}>
                    <Image source={{ uri: form.logoUrl }} contentFit="cover" style={StyleSheet.absoluteFill} accessibilityLabel="Logo" />
                    <RemoveDot onPress={() => set('logoUrl', '')} label="Remove logo" />
                  </View>
                ) : (
                  <View style={[styles.logoBox, styles.dashed, { borderColor: c.border }]}>
                    <Ionicons name="image-outline" size={32} color={c.textSecondary + '66'} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 4 }}>
                  <PillButton
                    label={uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                    variant="outline-indigo"
                    size="sm"
                    onPress={handleLogoUpload}
                    loading={uploadingLogo}
                  />
                  <Text style={[styles.hint, { color: c.textSecondary }]}>Square, at least 200x200px</Text>
                </View>
              </View>
            </View>

            {/* Cover photo upload */}
            <View>
              <FieldLabel>Cover Photo</FieldLabel>
              {form.coverPhotoUrl ? (
                <View style={[styles.coverBox, { borderColor: c.border }]}>
                  <Image source={{ uri: form.coverPhotoUrl }} contentFit="cover" style={StyleSheet.absoluteFill} accessibilityLabel="Cover" />
                  <RemoveDot onPress={() => set('coverPhotoUrl', '')} label="Remove cover" size={24} />
                </View>
              ) : (
                <View style={[styles.coverBox, styles.dashed, { borderColor: c.border }]}>
                  <Ionicons name="image-outline" size={32} color={c.textSecondary + '66'} />
                </View>
              )}
              <PillButton
                label={uploadingCover ? 'Uploading...' : form.coverPhotoUrl ? 'Change Cover' : 'Upload Cover'}
                variant="outline-indigo"
                size="sm"
                onPress={handleCoverUpload}
                loading={uploadingCover}
                style={{ marginTop: Spacing.sm }}
              />
            </View>

            <HubInput
              label="About Your Company"
              value={form.bio}
              onChangeText={(v) => set('bio', v)}
              rows={5}
              placeholder="Tell tradies about your company..."
            />
            <View>
              <FieldLabel>Company Size</FieldLabel>
              <ChoicePills
                options={SIZE_OPTIONS}
                value={form.companySize}
                onChange={(v) => set('companySize', v as CompanySize | '')}
                allowClear
              />
            </View>
            <HubInput
              label="Industry Focus"
              value={form.industryFocus}
              onChangeText={(v) => set('industryFocus', v)}
              placeholder="e.g. Commercial construction"
            />
          </View>
        ) : null}

        {/* Step 2: Location */}
        {step === 'Location' ? (
          <View style={styles.fields}>
            <View>
              <HubInput
                label="HQ Suburb"
                value={form.suburb}
                onChangeText={handleSuburbChange}
                onFocus={() => suburbSuggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Type a suburb..."
                autoCorrect={false}
              />
              {showSuggestions && suburbSuggestions.length > 0 ? (
                <View style={[styles.suggestions, { backgroundColor: c.surface, borderColor: c.border }]}>
                  {suburbSuggestions.map((s) => (
                    <Pressable
                      key={s}
                      accessibilityRole="button"
                      onPress={() => {
                        set('suburb', s);
                        setShowSuggestions(false);
                      }}
                      style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: c.indigo + '0D' }]}
                    >
                      <Text style={[styles.suggestionText, { color: c.textPrimary }]}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
            <HubInput
              label="Postcode"
              value={form.postcode}
              onChangeText={(v) => set('postcode', v)}
              placeholder="e.g. 2000"
              maxLength={4}
              keyboardType="number-pad"
            />
            <ChipInput
              label="Service Regions"
              hint="Operate across multiple cities or whole states? Add every region you hire in."
              placeholder="e.g. South QLD"
              values={form.serviceRegions}
              onAdd={(v) => set('serviceRegions', addChip(form.serviceRegions, v))}
              onRemove={(v) => set('serviceRegions', removeChip(form.serviceRegions, v))}
            >
              {/* One-tap picks: major cities + whole states */}
              <View style={styles.suggestWrap}>
                {suggestedRegionsFor(form.serviceRegions).map((s) => (
                  <SuggestChip key={s} label={s} onPress={() => set('serviceRegions', [...form.serviceRegions, s])} />
                ))}
              </View>
            </ChipInput>
          </View>
        ) : null}

        {/* Step 3: Credentials */}
        {step === 'Credentials' ? (
          <View style={styles.fields}>
            {/* ABN / licence / insurance verification — a web hand-off in the app */}
            <View style={[styles.handoff, { borderColor: c.indigo + '33', backgroundColor: c.indigo + '0D' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.handoffTitle, { color: c.textPrimary }]}>Credential verification</Text>
                <Text style={[styles.handoffBody, { color: c.textSecondary }]}>
                  ABN, trade licence and insurance verification is completed on the website.
                </Text>
              </View>
              <PillButton label="Open on the web" variant="outline-indigo" size="sm" onPress={openWebCredentials} />
            </View>

            <ChipInput
              label="Specialties"
              placeholder="e.g. High-rise"
              values={form.specialties}
              onAdd={(v) => set('specialties', addChip(form.specialties, v))}
              onRemove={(v) => set('specialties', removeChip(form.specialties, v))}
              chipTone="primary"
            />
            <ChipInput
              label="Certifications"
              placeholder="e.g. ISO 45001"
              values={form.certifications}
              onAdd={(v) => set('certifications', addChip(form.certifications, v))}
              onRemove={(v) => set('certifications', removeChip(form.certifications, v))}
            />
            <View style={styles.twoCol}>
              <HubInput
                label="Years Established"
                value={form.yearsEstablished}
                onChangeText={(v) => set('yearsEstablished', v)}
                placeholder="e.g. 15"
                keyboardType="number-pad"
                containerStyle={{ flex: 1 }}
              />
              <HubInput
                label="Team Size"
                value={form.teamSize}
                onChangeText={(v) => set('teamSize', v)}
                placeholder="e.g. 45"
                keyboardType="number-pad"
                containerStyle={{ flex: 1 }}
              />
            </View>
            <HubInput
              label="Safety Record"
              value={form.safetyRecord}
              onChangeText={(v) => set('safetyRecord', v)}
              placeholder="e.g. Zero LTIs in 3 years"
            />
            <HubInput
              label="Insurance Details"
              value={form.insuranceDetails}
              onChangeText={(v) => set('insuranceDetails', v)}
              rows={2}
              placeholder="Public liability, workers comp, etc."
            />
            <View>
              <FieldLabel hint="Scroll to see all categories.">Trades You Hire</FieldLabel>
              <ScrollView nestedScrollEnabled style={[styles.tradesBox, { borderColor: c.border }]} contentContainerStyle={{ gap: Spacing.md }}>
                {TRADE_CATEGORIES.map((cat) => (
                  <View key={cat.slug}>
                    <Text style={[styles.tradeCat, { color: c.textSecondary }]}>{cat.name}</Text>
                    <View style={styles.tradeGrid}>
                      {cat.trades.map((trade) => {
                        const on = form.tradesNeeded.includes(trade.slug);
                        return (
                          <Pressable
                            key={trade.slug}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: on }}
                            onPress={() => set('tradesNeeded', toggleTradeNeeded(form.tradesNeeded, trade.slug))}
                            style={[styles.tradeItem, on && { backgroundColor: c.indigo + '1A' }]}
                          >
                            <Ionicons name={on ? 'checkbox' : 'square-outline'} size={16} color={on ? c.indigo : c.textSecondary} />
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.tradeLabel,
                                { color: on ? c.indigo : c.textPrimary },
                                on && { fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
                              ]}
                            >
                              {trade.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        ) : null}

        {/* Step 4: Past Projects */}
        {step === 'Projects' ? (
          <View style={styles.fields}>
            <View style={styles.projectsHeader}>
              <Text style={[styles.projectsTitle, { color: c.textPrimary }]}>Past Projects ({form.pastProjects.length})</Text>
              <PillButton
                label="+ Add Project"
                size="sm"
                onPress={() => set('pastProjects', [...form.pastProjects, emptyPastProject()])}
              />
            </View>
            {form.pastProjects.length === 0 ? (
              <Text style={[styles.projectsEmpty, { color: c.textSecondary }]}>
                No projects yet. Add your past work to build trust with tradies.
              </Text>
            ) : null}
            {form.pastProjects.map((proj, i) => (
              <View key={i} style={[styles.project, { backgroundColor: c.canvas, borderColor: c.border }]}>
                <View style={styles.projectHeader}>
                  <Text style={[styles.projectIndex, { color: c.textSecondary }]}>Project {i + 1}</Text>
                  <Pressable accessibilityRole="button" onPress={() => set('pastProjects', removeProject(form.pastProjects, i))} hitSlop={6}>
                    <Text style={[styles.remove, { color: c.error }]}>Remove</Text>
                  </Pressable>
                </View>
                <HubInput value={proj.title} onChangeText={(v) => updateProjectField(i, 'title', v)} placeholder="Project title" />
                <HubInput
                  value={proj.description}
                  onChangeText={(v) => updateProjectField(i, 'description', v)}
                  placeholder="Brief description"
                  rows={2}
                />

                {/* Project photos */}
                <View>
                  <Text style={[styles.mediaLabel, { color: c.textPrimary }]}>Photos</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
                    {(proj.photo_urls || []).map((url, j) => (
                      <View key={`${url}-${j}`} style={[styles.mediaTile, { borderColor: c.border }]}>
                        <Image source={{ uri: url }} contentFit="cover" style={StyleSheet.absoluteFill} />
                        <RemoveDot
                          onPress={() => set('pastProjects', removeProjectPhoto(form.pastProjects, i, j))}
                          label={`Remove photo ${j + 1}`}
                        />
                      </View>
                    ))}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Add photo"
                      onPress={() => handleProjectPhotoUpload(i)}
                      disabled={uploadingProjectPhoto === i}
                      style={[styles.mediaTile, styles.dashed, { borderColor: c.border }]}
                    >
                      {uploadingProjectPhoto === i ? (
                        <Ionicons name="cloud-upload-outline" size={20} color={c.indigo} />
                      ) : (
                        <>
                          <Ionicons name="add" size={20} color={c.textSecondary + '66'} />
                          <Text style={[styles.tileHint, { color: c.textSecondary + '66' }]}>Add photo</Text>
                        </>
                      )}
                    </Pressable>
                  </ScrollView>
                </View>

                {/* Project videos */}
                <View>
                  <Text style={[styles.mediaLabel, { color: c.textPrimary }]}>Videos</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
                    {(proj.videos || []).map((video, j) => (
                      <View key={`${video.url}-${j}`} style={[styles.mediaTile, { borderColor: c.border, backgroundColor: c.textPrimary + 'E6' }]}>
                        {video.poster ? (
                          <Image source={{ uri: video.poster }} contentFit="cover" style={[StyleSheet.absoluteFill, { opacity: 0.8 }]} />
                        ) : null}
                        <View style={styles.playBadge}>
                          <Ionicons name="play" size={14} color="#ffffff" />
                        </View>
                        <RemoveDot onPress={() => set('pastProjects', removeProjectVideo(form.pastProjects, i, j))} label="Remove video" />
                      </View>
                    ))}
                    {(proj.videos || []).length < MAX_PROJECT_VIDEOS ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Add video"
                        onPress={() => handleProjectVideoUpload(i)}
                        disabled={uploadingProjectVideo === i}
                        style={[styles.mediaTile, styles.dashed, { borderColor: c.border }]}
                      >
                        {uploadingProjectVideo === i ? (
                          <>
                            <Ionicons name="cloud-upload-outline" size={20} color={c.indigo} />
                            <Text style={[styles.tileHint, { color: c.textSecondary + '66' }]}>Uploading…</Text>
                          </>
                        ) : (
                          <>
                            <Ionicons name="videocam-outline" size={20} color={c.textSecondary + '66'} />
                            <Text style={[styles.tileHint, { color: c.textSecondary + '66' }]}>Add video</Text>
                          </>
                        )}
                      </Pressable>
                    ) : null}
                  </ScrollView>
                  <Text style={[styles.videoHint, { color: c.textSecondary + '99' }]}>
                    MP4, MOV or WebM, up to 100MB — max {MAX_PROJECT_VIDEOS} per project.
                  </Text>
                </View>

                <View style={styles.twoCol}>
                  <HubInput
                    value={proj.location || ''}
                    onChangeText={(v) => updateProjectField(i, 'location', v)}
                    placeholder="Location"
                    containerStyle={{ flex: 1 }}
                  />
                  <HubInput
                    value={proj.value_range || ''}
                    onChangeText={(v) => updateProjectField(i, 'value_range', v)}
                    placeholder="Value range e.g. $500K-$1M"
                    containerStyle={{ flex: 1 }}
                  />
                </View>
                <HubInput
                  value={proj.year_completed ? String(proj.year_completed) : ''}
                  onChangeText={(v) => updateProjectField(i, 'year_completed', v ? parseInt(v, 10) || null : null)}
                  placeholder="Year completed"
                  keyboardType="number-pad"
                />
              </View>
            ))}
          </View>
        ) : null}

        {/* Step 5: Contact */}
        {step === 'Contact' ? (
          <View style={styles.fields}>
            <HubInput
              label="Website"
              value={form.website}
              onChangeText={(v) => set('website', v)}
              placeholder="https://yourcompany.com.au"
              keyboardType="url"
              autoCapitalize="none"
            />
            <HubInput label="Contact Name" value={form.contactName} onChangeText={(v) => set('contactName', v)} />
            <View style={styles.twoCol}>
              <HubInput
                label="Phone"
                value={form.contactPhone}
                onChangeText={(v) => set('contactPhone', v)}
                keyboardType="phone-pad"
                containerStyle={{ flex: 1 }}
              />
              <HubInput
                label="Email"
                value={form.contactEmail}
                onChangeText={(v) => set('contactEmail', v)}
                keyboardType="email-address"
                autoCapitalize="none"
                containerStyle={{ flex: 1 }}
              />
            </View>

            {/* Preview link */}
            {authedUser ? (
              <View style={[styles.handoff, { borderColor: c.indigo + '33', backgroundColor: c.indigo + '0D' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.handoffTitle, { color: c.textPrimary }]}>Preview your public profile</Text>
                  <Text style={[styles.handoffBody, { color: c.textSecondary }]}>See what tradies see when they view your company</Text>
                </View>
                <PillButton
                  label="Preview"
                  variant="outline-indigo"
                  size="sm"
                  onPress={() => router.push(toHref(ROUTES.companyProfile(authedUser.id)))}
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </SectionCard>

      {/* Bottom save button */}
      <View style={{ alignItems: 'flex-end' }}>{saveButton}</View>
    </HubScreen>
  );
}

function RemoveDot({ onPress, label, size = 20 }: { onPress: () => void; label: string; size?: number }) {
  const c = useHubTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={[styles.removeDot, { width: size, height: size, borderRadius: size / 2, backgroundColor: c.error + 'E6' }]}
    >
      <Ionicons name="close" size={size * 0.6} color="#ffffff" />
    </Pressable>
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
  hint: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: FontFamily.body,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverBox: {
    height: 128,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashed: {
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  removeDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestions: {
    marginTop: 4,
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  suggestion: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  suggestionText: {
    fontSize: 14,
    fontFamily: FontFamily.body,
  },
  suggestWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.sm,
  },
  handoff: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  handoffTitle: {
    fontSize: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  handoffBody: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  tradesBox: {
    maxHeight: 240,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.md,
  },
  tradeCat: {
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  tradeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tradeItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  tradeLabel: {
    flex: 1,
    fontSize: 12,
    fontFamily: FontFamily.body,
  },
  projectsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  projectsTitle: {
    fontSize: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  projectsEmpty: {
    textAlign: 'center',
    paddingVertical: Spacing['2xl'],
    fontSize: 14,
    fontFamily: FontFamily.body,
  },
  project: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  projectIndex: {
    fontSize: 12,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  remove: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    textDecorationLine: 'underline',
  },
  mediaLabel: {
    fontSize: 12,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  mediaTile: {
    width: 112,
    height: 80,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileHint: {
    marginTop: 2,
    fontSize: 9,
    fontFamily: FontFamily.body,
  },
  playBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoHint: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
});
