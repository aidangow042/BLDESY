/**
 * Step 5 "Team & FAQs" of ~/bldesy-web/app/portal/edit-profile/page.tsx: crew
 * members (name, role, photo) and FAQ question/answer rows, plus the
 * "Preview your profile" link. Saved with "Save All Changes".
 */
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { uploadBuilderImage } from '@/lib/data/profile-edit';
import { ROUTES } from '@/lib/routes';
import type { FaqItem, TeamMember } from '@/types/database';
import {
  EmptyNote,
  FieldLabel,
  FormInput,
  FormTextarea,
  RemoveButton,
  SectionHeading,
  SoftPillButton,
} from './form-primitives';
import { pickImage, UPLOAD_FAILED } from './pick-media';
import type { StepProps } from './types';

export function TeamFaqsStep({ form, update, setForm, userId, setError }: StepProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const [uploadingTeamPhoto, setUploadingTeamPhoto] = useState<number | null>(null);

  function addTeamMember() {
    update('teamMembers', [...form.teamMembers, { name: '', role: '', photo_url: null }]);
  }

  function updateTeamMember(index: number, field: 'name' | 'role', value: string) {
    setForm((prev) => {
      const updated = [...prev.teamMembers];
      updated[index] = { ...updated[index], [field]: value } as TeamMember;
      return { ...prev, teamMembers: updated };
    });
  }

  function removeTeamMember(index: number) {
    update('teamMembers', form.teamMembers.filter((_, i) => i !== index));
  }

  async function handleTeamPhotoUpload(memberIndex: number) {
    const uri = await pickImage();
    if (!uri) return;
    setUploadingTeamPhoto(memberIndex);
    try {
      const res = await uploadBuilderImage(uri, userId, 'team');
      if (!res) {
        setError(UPLOAD_FAILED);
        return;
      }
      setForm((prev) => {
        const updated = [...prev.teamMembers];
        updated[memberIndex] = { ...updated[memberIndex], photo_url: res.url };
        return { ...prev, teamMembers: updated };
      });
    } finally {
      setUploadingTeamPhoto(null);
    }
  }

  function addFaq() {
    update('faqs', [...form.faqs, { question: '', answer: '' }]);
  }

  function updateFaq(index: number, field: keyof FaqItem, value: string) {
    setForm((prev) => {
      const updated = [...prev.faqs];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, faqs: updated };
    });
  }

  function removeFaq(index: number) {
    update('faqs', form.faqs.filter((_, i) => i !== index));
  }

  return (
    <View style={styles.wrap}>
      {/* Team Members */}
      <View>
        <View style={styles.headerRow}>
          <SectionHeading title="Team Members" />
          <SoftPillButton label="+ Add Member" onPress={addTeamMember} />
        </View>
        {form.teamMembers.length === 0 ? (
          <EmptyNote>No team members added. Add your crew to show clients who they&apos;ll be working with.</EmptyNote>
        ) : (
          <View style={styles.list}>
            {form.teamMembers.map((member, idx) => (
              <View key={idx} style={[styles.memberRow, { borderColor: c.border }]}>
                <Pressable
                  onPress={() => handleTeamPhotoUpload(idx)}
                  disabled={uploadingTeamPhoto === idx}
                  accessibilityRole="button"
                  accessibilityLabel={member.photo_url ? 'Change photo' : 'Add photo'}
                  style={[styles.avatar, { backgroundColor: c.primary + '1A', borderColor: c.border }]}
                >
                  {member.photo_url ? (
                    <Image source={{ uri: member.photo_url }} contentFit="cover" style={styles.avatarImage} />
                  ) : (
                    <Text style={[styles.avatarInitial, { color: c.primary }]}>{member.name.charAt(0) || '?'}</Text>
                  )}
                  <View style={styles.avatarOverlay}>
                    {uploadingTeamPhoto === idx ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <MaterialIcons name="photo-camera" size={14} color="#fff" />
                    )}
                  </View>
                </Pressable>
                <View style={styles.memberFields}>
                  <FormInput
                    value={member.name}
                    onChangeText={(v) => updateTeamMember(idx, 'name', v)}
                    placeholder="Name"
                    accessibilityLabel="Name"
                    style={styles.compactInput}
                  />
                  <FormInput
                    value={member.role}
                    onChangeText={(v) => updateTeamMember(idx, 'role', v)}
                    placeholder="Role"
                    accessibilityLabel="Role"
                    style={styles.compactInput}
                  />
                </View>
                <RemoveButton onPress={() => removeTeamMember(idx)} accessibilityLabel="Remove member" size={32} style={styles.removeMember} />
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={[styles.divider, { backgroundColor: c.border }]} />

      {/* FAQs */}
      <View>
        <View style={styles.headerRow}>
          <SectionHeading title="FAQs" />
          <SoftPillButton label="+ Add FAQ" onPress={addFaq} />
        </View>
        {form.faqs.length === 0 ? (
          <EmptyNote>No FAQs added yet. Answer common questions to save time and build trust.</EmptyNote>
        ) : (
          <View style={styles.list}>
            {form.faqs.map((faq, idx) => (
              <View key={idx} style={[styles.faqCard, { borderColor: c.border }]}>
                <RemoveButton onPress={() => removeFaq(idx)} accessibilityLabel="Remove FAQ" style={styles.removeFaq} />
                <View style={styles.faqFields}>
                  <View>
                    <FieldLabel>Question</FieldLabel>
                    <FormInput
                      value={faq.question}
                      onChangeText={(v) => updateFaq(idx, 'question', v)}
                      placeholder="e.g. What areas do you service?"
                      accessibilityLabel="Question"
                    />
                  </View>
                  <View>
                    <FieldLabel>Answer</FieldLabel>
                    <FormTextarea
                      rows={3}
                      value={faq.answer}
                      onChangeText={(v) => updateFaq(idx, 'answer', v)}
                      placeholder="Your answer..."
                      accessibilityLabel="Answer"
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={[styles.divider, { backgroundColor: c.border }]} />

      {/* Preview link */}
      <View style={styles.previewRow}>
        <Pressable
          onPress={() => router.push(ROUTES.builderProfile(userId) as Href)}
          style={[styles.previewBtn, { borderColor: c.primary }]}
          accessibilityRole="link"
        >
          <MaterialIcons name="visibility" size={16} color={c.primary} />
          <Text style={[styles.previewText, { color: c.primary }]}>Preview your profile</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing['3xl'] },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, marginBottom: Spacing.lg },
  list: { gap: Spacing.lg },
  memberRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderRadius: Radius.lg, padding: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  avatarInitial: { fontSize: 14, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  avatarOverlay: { position: 'absolute', right: -2, bottom: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  memberFields: { flex: 1, gap: Spacing.sm },
  compactInput: { height: 40, borderRadius: Radius.lg, paddingHorizontal: 12 },
  removeMember: { marginTop: 4 },
  divider: { height: 1 },
  faqCard: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg, position: 'relative' },
  removeFaq: { position: 'absolute', top: 12, right: 12, zIndex: 1 },
  faqFields: { gap: 12, paddingRight: 32 },
  previewRow: { alignItems: 'center', paddingVertical: Spacing.sm },
  previewBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Spacing.xl, paddingVertical: 10, minHeight: 44 },
  previewText: { fontSize: 14, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
});
