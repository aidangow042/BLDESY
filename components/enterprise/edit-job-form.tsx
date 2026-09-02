/**
 * EditJobForm — port of ~/bldesy-web/app/enterprise/jobs/[id]/edit/page.tsx,
 * rendered by app/enterprise/jobs/[id].tsx in `?edit=1` mode. Fields, labels,
 * placeholders, validation strings and the UPDATE payload are the website's
 * (lib/enterprise-hub/edit-job.ts); photos + documents upload to
 * `enterprise-media` and are queued for moderation (lib/enterprise-hub/media.ts).
 */
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';

import { useToast } from '@/components/ui';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useUser } from '@/lib/auth-context';
import type { EnterpriseJob } from '@/lib/data/enterprise';
import {
  editJobFormFrom,
  JOB_UPDATED_MESSAGE,
  saveEnterpriseJob,
  URGENCY_OPTIONS,
  type EditJobForm as EditJobFormState,
} from '@/lib/enterprise-hub/edit-job';
import { formatDayMonthYear } from '@/lib/enterprise-hub/format';
import { uploadEnterpriseMedia } from '@/lib/enterprise-hub/media';
import { validateDocFile, validateImageFile } from '@/lib/enterprise-hub/upload-validation';
import { getTradeBySlug } from '@/lib/web/trades';
import type { Urgency } from '@/types/database';

import { ChoicePills, FieldLabel, HubInput } from './hub-form';
import {
  HubModal,
  HubScreen,
  InlineBanner,
  LinkText,
  PillButton,
  SectionCard,
  SectionTitle,
  useHubTheme,
} from './hub-primitives';
import { pickDocument, pickImage } from './media-pickers';
import { TradePickerSheet } from './trade-picker-sheet';

function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function EditJobForm({ job, onBack, onSaved }: { job: EnterpriseJob; onBack: () => void; onSaved: () => void }) {
  const c = useHubTheme();
  const toast = useToast();
  const { authedUser } = useUser();
  const [form, setForm] = useState<EditJobFormState>(() => editJobFormFrom(job));
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const set = <K extends keyof EditJobFormState>(key: K, value: EditJobFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await saveEnterpriseJob(job.id, form);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload() {
    if (!authedUser) return;
    const picked = await pickImage();
    if (!picked) return;
    const invalid = validateImageFile(picked);
    if (invalid) {
      toast.show(invalid, { variant: 'error' });
      return;
    }
    setUploadingPhoto(true);
    try {
      const { url } = await uploadEnterpriseMedia(picked.uri, authedUser.id, 'job-photo', picked.mimeType);
      setForm((prev) => ({ ...prev, photoUrls: [...prev.photoUrls, url] }));
    } catch {
      /* the web silently drops a failed upload; keep the form as it was */
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleDocUpload() {
    if (!authedUser) return;
    const picked = await pickDocument();
    if (!picked) return;
    const invalid = validateDocFile(picked);
    if (invalid) {
      toast.show(invalid, { variant: 'error' });
      return;
    }
    setUploadingDoc(true);
    try {
      const { url } = await uploadEnterpriseMedia(picked.uri, authedUser.id, 'job-doc', picked.mimeType);
      setForm((prev) => ({ ...prev, documentUrls: [...prev.documentUrls, url] }));
    } catch {
      /* as above */
    } finally {
      setUploadingDoc(false);
    }
  }

  function onDateChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setDateOpen(false);
    if (event.type === 'set' && date) set('startDate', ymd(date));
  }

  const tradeName = form.tradeCategory ? (getTradeBySlug(form.tradeCategory)?.name ?? form.tradeCategory) : '';
  const startDateValue = form.startDate ? new Date(`${form.startDate}T00:00:00`) : new Date();

  return (
    <HubScreen gap={Spacing['2xl']}>
      <View>
        <LinkText label="Back to job" icon="chevron-back" size={14} color={c.textSecondary} onPress={onBack} />
        <View style={styles.titleRow}>
          <Text accessibilityRole="header" style={[styles.title, { color: c.textPrimary }]}>
            Edit Job Post
          </Text>
          <PillButton label={saving ? 'Saving...' : 'Save Changes'} onPress={handleSave} loading={saving} />
        </View>
      </View>

      {success ? <InlineBanner tone="success">{JOB_UPDATED_MESSAGE}</InlineBanner> : null}
      {error ? <InlineBanner tone="error">{error}</InlineBanner> : null}

      {/* Basic info */}
      <SectionCard padding={Spacing['2xl']}>
        <View style={styles.fields}>
          <SectionTitle>Job Details</SectionTitle>
          <HubInput label="Title" value={form.title} onChangeText={(v) => set('title', v)} />
          <HubInput label="Description" value={form.description} onChangeText={(v) => set('description', v)} rows={5} />
          <View>
            <FieldLabel>Trade Category</FieldLabel>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Trade Category"
              onPress={() => setTradeOpen(true)}
              style={[styles.select, { backgroundColor: c.surface, borderColor: c.border }]}
            >
              <Text style={[styles.selectText, { color: tradeName ? c.textPrimary : c.textSecondary + '80' }]}>
                {tradeName || 'Select...'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={c.textSecondary} />
            </Pressable>
          </View>
          <View>
            <FieldLabel>Urgency</FieldLabel>
            <ChoicePills
              options={URGENCY_OPTIONS.map((o) => ({ key: o.value, label: o.label }))}
              value={form.urgency}
              onChange={(v) => set('urgency', (v || 'asap') as Urgency)}
            />
          </View>
          <View style={styles.twoCol}>
            <HubInput label="Suburb" value={form.suburb} onChangeText={(v) => set('suburb', v)} containerStyle={{ flex: 1 }} />
            <HubInput
              label="Postcode"
              value={form.postcode}
              onChangeText={(v) => set('postcode', v)}
              maxLength={4}
              keyboardType="number-pad"
              containerStyle={{ width: 120 }}
            />
          </View>
          <HubInput label="Budget" value={form.budget} onChangeText={(v) => set('budget', v)} placeholder="e.g. $85,000" />
        </View>
      </SectionCard>

      {/* Enterprise fields */}
      <SectionCard tone="indigo" padding={Spacing['2xl']}>
        <View style={styles.fields}>
          <SectionTitle style={{ color: c.indigo }}>Commercial Details</SectionTitle>
          <View style={styles.twoCol}>
            <HubInput
              label="Workers Needed"
              value={form.workersNeeded}
              onChangeText={(v) => set('workersNeeded', v)}
              keyboardType="number-pad"
              containerStyle={{ flex: 1 }}
            />
            <HubInput
              label="Day Rate"
              value={form.dayRate}
              onChangeText={(v) => set('dayRate', v)}
              placeholder="e.g. $480/day"
              containerStyle={{ flex: 1 }}
            />
          </View>
          <HubInput
            label="Contract Duration"
            value={form.contractDuration}
            onChangeText={(v) => set('contractDuration', v)}
            placeholder="e.g. 3 weeks"
          />
          <View>
            <FieldLabel>Start Date</FieldLabel>
            <View style={styles.twoCol}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Start Date"
                onPress={() => setDateOpen(true)}
                style={[styles.select, { flex: 1, backgroundColor: c.surface, borderColor: c.border }]}
              >
                <Text style={[styles.selectText, { color: form.startDate ? c.textPrimary : c.textSecondary + '80' }]}>
                  {form.startDate ? formatDayMonthYear(form.startDate) : 'Select...'}
                </Text>
                <Ionicons name="calendar-outline" size={16} color={c.textSecondary} />
              </Pressable>
              {form.startDate ? (
                <PillButton label="Clear" variant="ghost" size="sm" onPress={() => set('startDate', '')} style={{ marginTop: 8 }} />
              ) : null}
            </View>
          </View>
          <HubInput
            label="Site Requirements"
            value={form.siteRequirements}
            onChangeText={(v) => set('siteRequirements', v)}
            rows={3}
            placeholder="PPE, inductions, parking..."
          />
        </View>
      </SectionCard>

      {/* Photos */}
      <SectionCard padding={Spacing['2xl']}>
        <View style={styles.fields}>
          <SectionTitle>Site Photos &amp; Plans</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
            {form.photoUrls.map((url, i) => (
              <View key={`${url}-${i}`} style={[styles.thumb, { borderColor: c.border }]}>
                <Image source={{ uri: url }} contentFit="cover" style={StyleSheet.absoluteFill} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove photo ${i + 1}`}
                  onPress={() => set('photoUrls', form.photoUrls.filter((_, j) => j !== i))}
                  style={[styles.removeDot, { backgroundColor: c.error + 'E6' }]}
                >
                  <Ionicons name="close" size={12} color="#ffffff" />
                </Pressable>
              </View>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add photo"
              onPress={handlePhotoUpload}
              disabled={uploadingPhoto}
              style={[styles.thumb, styles.dashed, { borderColor: c.border }]}
            >
              {uploadingPhoto ? (
                <Ionicons name="cloud-upload-outline" size={22} color={c.indigo} />
              ) : (
                <>
                  <Ionicons name="image-outline" size={22} color={c.textSecondary + '66'} />
                  <Text style={[styles.tileHint, { color: c.textSecondary + '66' }]}>Add photo</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </SectionCard>

      {/* Documents */}
      <SectionCard padding={Spacing['2xl']}>
        <View style={styles.fields}>
          <SectionTitle>Documents</SectionTitle>
          {form.documentUrls.map((url, i) => (
            <View key={`${url}-${i}`} style={[styles.docRow, { backgroundColor: c.canvas, borderColor: c.border }]}>
              <Ionicons name="document-text-outline" size={20} color={c.indigo} />
              <Pressable style={{ flex: 1 }} onPress={() => WebBrowser.openBrowserAsync(url)} accessibilityRole="link">
                <Text numberOfLines={1} style={[styles.docLabel, { color: c.indigo }]}>
                  Document {i + 1}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => set('documentUrls', form.documentUrls.filter((_, j) => j !== i))}
                hitSlop={6}
              >
                <Text style={[styles.docRemove, { color: c.error }]}>Remove</Text>
              </Pressable>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={handleDocUpload}
            disabled={uploadingDoc}
            style={[styles.docUpload, styles.dashed, { borderColor: c.border }]}
          >
            <Ionicons name={uploadingDoc ? 'cloud-upload-outline' : 'add'} size={16} color={uploadingDoc ? c.indigo : c.textSecondary} />
            <Text style={[styles.docUploadLabel, { color: c.textSecondary }]}>Upload document</Text>
          </Pressable>
        </View>
      </SectionCard>

      <View style={{ alignItems: 'flex-end' }}>
        <PillButton label={saving ? 'Saving...' : 'Save Changes'} onPress={handleSave} loading={saving} />
      </View>

      <TradePickerSheet
        visible={tradeOpen}
        value={form.tradeCategory}
        onSelect={(slug) => set('tradeCategory', slug)}
        onClose={() => setTradeOpen(false)}
      />

      {dateOpen && Platform.OS === 'android' ? (
        <DateTimePicker value={startDateValue} mode="date" display="default" onChange={onDateChange} />
      ) : null}
      {Platform.OS !== 'android' ? (
        <HubModal visible={dateOpen} onClose={() => setDateOpen(false)} maxWidth={384} accessibilityLabel="Start Date">
          <DateTimePicker value={startDateValue} mode="date" display="inline" onChange={onDateChange} accentColor={c.indigo} />
          <PillButton label="Done" onPress={() => setDateOpen(false)} fullWidth style={{ marginTop: Spacing.md }} />
        </HubModal>
      ) : null}
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  fields: {
    gap: Spacing.xl,
  },
  twoCol: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  select: {
    height: 48,
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    fontSize: 14,
    fontFamily: FontFamily.body,
  },
  thumbRow: {
    gap: Spacing.sm,
  },
  thumb: {
    width: 144,
    height: 96,
    borderRadius: Radius.md,
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
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileHint: {
    marginTop: 2,
    fontSize: 10,
    fontFamily: FontFamily.body,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  docLabel: {
    fontSize: 14,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  docRemove: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    textDecorationLine: 'underline',
  },
  docUpload: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  docUploadLabel: {
    fontSize: 12,
    fontFamily: FontFamily.body,
  },
});
