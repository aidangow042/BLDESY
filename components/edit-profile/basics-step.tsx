/**
 * Step 0 "Business" of ~/bldesy-web/app/portal/edit-profile/page.tsx: business
 * name, trades (+ specialisations), contact fields, ABN, profile photo, cover
 * banner (photo or colour), display images, bio. Photo uploads and the banner
 * colour auto-save exactly like the website; everything else waits for
 * "Save All Changes". The inline ABN verifier is a web hand-off (decision D2)
 * — the ABN text field itself stays.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { bannerGradientColors, CoverColorPicker } from '@/components/builder/cover-color-picker';
import { MultiTradeSelector } from '@/components/builder/multi-trade-selector';
import { SpecialisationsPicker } from '@/components/trades/specialisations-picker';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  DEFAULT_COVER_COLOR,
  setCoverColor,
  setCoverPhoto,
  setDisplayImages,
  setProfilePhoto,
  uploadBuilderImage,
} from '@/lib/data/profile-edit';
import { hasSpecialisations } from '@/lib/web/trade-specialisations';
import {
  DashedTile,
  FieldLabel,
  FormInput,
  FormTextarea,
  HelperText,
  OutlinePillButton,
  ThumbRemoveButton,
} from './form-primitives';
import { pickImage, UPLOAD_FAILED } from './pick-media';
import type { StepProps } from './types';

export function BasicsStep({ form, update, userId, setError, refreshProfile }: StepProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingDisplayImage, setUploadingDisplayImage] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  async function uploadPhoto(type: 'profile' | 'cover') {
    const uri = await pickImage();
    if (!uri) return;
    const setUploading = type === 'profile' ? setUploadingProfile : setUploadingCover;
    setUploading(true);
    try {
      const res = await uploadBuilderImage(uri, userId, type);
      if (!res) {
        setError(UPLOAD_FAILED);
        return;
      }
      update(type === 'profile' ? 'profilePhotoUrl' : 'coverPhotoUrl', res.url);
      // Auto-save the photo URL immediately (profile photo also syncs the avatar).
      if (type === 'profile') await setProfilePhoto(res.url);
      else await setCoverPhoto(res.url);
      await refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  // Switch the cover banner between an uploaded photo and a solid colour, and
  // auto-save the choice immediately (instant feedback, same as photo uploads).
  async function persistCoverColor(value: string | null) {
    update('coverColor', value);
    try {
      await setCoverColor(value);
      await refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleDisplayImageUpload() {
    const uri = await pickImage();
    if (!uri) return;
    setUploadingDisplayImage(true);
    try {
      const res = await uploadBuilderImage(uri, userId, 'projects');
      if (!res) {
        setError(UPLOAD_FAILED);
        return;
      }
      const next = [...form.displayImages, res.url];
      update('displayImages', next);
      await setDisplayImages(next);
      await refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploadingDisplayImage(false);
    }
  }

  function removeDisplayImage(index: number) {
    update('displayImages', form.displayImages.filter((_, i) => i !== index));
  }

  return (
    <View style={styles.wrap}>
      <View>
        <FieldLabel>Business Name *</FieldLabel>
        <FormInput
          value={form.businessName}
          onChangeText={(v) => update('businessName', v)}
          placeholder="Your business name"
          accessibilityLabel="Business Name"
        />
      </View>

      <View>
        <FieldLabel>Trades *</FieldLabel>
        <HelperText style={styles.tradesHelper}>
          Add every trade you offer. Licensed trades need a verified licence — unless one you already
          hold (e.g. your Builder licence) covers it.
        </HelperText>
        <MultiTradeSelector
          userId={userId}
          value={form.selectedTrades}
          onChange={(next) => update('selectedTrades', next)}
          onReturnFromWeb={() => void refreshProfile()}
        />
      </View>

      {form.selectedTrades.some((s) => hasSpecialisations(s)) ? (
        <SpecialisationsPicker
          selectedTrades={form.selectedTrades}
          value={form.specialisations}
          onChange={(next) => update('specialisations', next)}
        />
      ) : null}

      <View>
        <FieldLabel>Phone</FieldLabel>
        <FormInput
          value={form.phone}
          onChangeText={(v) => update('phone', v)}
          placeholder="04XX XXX XXX"
          keyboardType="phone-pad"
          accessibilityLabel="Phone"
        />
      </View>
      <View>
        <FieldLabel>Email</FieldLabel>
        <FormInput
          value={form.email}
          onChangeText={(v) => update('email', v)}
          placeholder="you@business.com.au"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Email"
        />
      </View>
      <View>
        <FieldLabel>Website</FieldLabel>
        <FormInput
          value={form.website}
          onChangeText={(v) => update('website', v)}
          placeholder="https://www.example.com.au"
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Website"
        />
      </View>
      <View>
        <FieldLabel>ABN</FieldLabel>
        <FormInput
          value={form.abn}
          onChangeText={(v) => update('abn', v)}
          placeholder="XX XXX XXX XXX"
          keyboardType="number-pad"
          accessibilityLabel="ABN"
        />
        <HelperText style={styles.abnHelper}>Add trade licences in the Credentials step.</HelperText>
      </View>

      {/* Photo uploads */}
      <View>
        <FieldLabel>Profile Photo</FieldLabel>
        <View style={[styles.mediaCard, { backgroundColor: c.canvas, borderColor: c.border }]}>
          {form.profilePhotoUrl ? (
            <View style={styles.profileWrap}>
              <Image
                source={{ uri: form.profilePhotoUrl }}
                accessibilityLabel="Profile"
                contentFit="cover"
                style={[styles.profileImage, { borderColor: c.border }]}
              />
              <SavedBadge />
            </View>
          ) : (
            <View style={[styles.profileImage, styles.profileFallback, { backgroundColor: c.primary + '1A' }]}>
              <Text style={[styles.profileInitial, { color: c.primary }]}>{form.businessName.charAt(0) || 'B'}</Text>
            </View>
          )}
          <View style={styles.mediaButton}>
            <OutlinePillButton
              label={uploadingProfile ? 'Uploading...' : form.profilePhotoUrl ? 'Change Photo' : 'Upload Photo'}
              onPress={() => uploadPhoto('profile')}
              busy={uploadingProfile}
            />
          </View>
        </View>
      </View>

      <View>
        <FieldLabel>Cover Banner</FieldLabel>
        <View style={[styles.mediaCard, { backgroundColor: c.canvas, borderColor: c.border }]}>
          {/* Photo / Colour toggle — a colour is handy when a photo crops badly to the wide banner strip. */}
          <View style={[styles.toggle, { borderColor: c.border, backgroundColor: c.surface }]}>
            <Pressable
              onPress={() => persistCoverColor(null)}
              accessibilityRole="button"
              accessibilityState={{ selected: !form.coverColor }}
              style={[styles.toggleBtn, !form.coverColor && { backgroundColor: c.primary }]}
            >
              <MaterialIcons name="image" size={14} color={!form.coverColor ? '#fff' : c.textSecondary} />
              <Text style={[styles.toggleText, { color: !form.coverColor ? '#fff' : c.textSecondary }]}>Photo</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                const next = form.coverColor ?? DEFAULT_COVER_COLOR;
                update('coverColor', next);
                setColorPickerOpen(true);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: !!form.coverColor }}
              style={[styles.toggleBtn, !!form.coverColor && { backgroundColor: c.primary }]}
            >
              <MaterialIcons name="palette" size={14} color={form.coverColor ? '#fff' : c.textSecondary} />
              <Text style={[styles.toggleText, { color: form.coverColor ? '#fff' : c.textSecondary }]}>Colour</Text>
            </Pressable>
          </View>

          {form.coverColor ? (
            <>
              <Pressable
                onPress={() => setColorPickerOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Edit banner colour"
                style={[styles.banner, { borderColor: c.border }]}
              >
                <LinearGradient
                  colors={bannerGradientColors(form.coverColor)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <SavedBadge />
                <View style={styles.hexChip}>
                  <Text style={styles.hexText}>{form.coverColor}</Text>
                </View>
              </Pressable>
              <View style={styles.mediaButton}>
                <OutlinePillButton label="Change Colour" onPress={() => setColorPickerOpen(true)} />
              </View>
            </>
          ) : (
            <>
              {form.coverPhotoUrl ? (
                <View style={[styles.banner, { borderColor: c.border }]}>
                  <Image source={{ uri: form.coverPhotoUrl }} accessibilityLabel="Cover" contentFit="cover" style={StyleSheet.absoluteFill} />
                  <SavedBadge />
                </View>
              ) : (
                <View style={[styles.banner, styles.bannerEmpty, { borderColor: c.border }]}>
                  <MaterialIcons name="image" size={32} color={c.textSecondary + '66'} />
                  <Text style={[styles.bannerEmptyText, { color: c.textSecondary + '66' }]}>No cover photo</Text>
                </View>
              )}
              <View style={styles.mediaButton}>
                <OutlinePillButton
                  label={uploadingCover ? 'Uploading...' : form.coverPhotoUrl ? 'Change Cover' : 'Upload Cover'}
                  onPress={() => uploadPhoto('cover')}
                  busy={uploadingCover}
                />
              </View>
              <Text style={[styles.coverHelp, { color: c.textSecondary + 'B3' }]}>
                Wide banner (3:1) — landscape shots frame best.
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Display Images */}
      <View>
        <FieldLabel>Display Images</FieldLabel>
        <HelperText style={styles.displayHelper}>
          These images show on search results. Pick your best work to make a great first impression.
        </HelperText>
        <View style={styles.tiles}>
          {form.displayImages.map((url, idx) => (
            <View key={`${url}-${idx}`} style={[styles.displayTile, { borderColor: c.border }]}>
              <Image source={{ uri: url }} contentFit="cover" style={StyleSheet.absoluteFill} />
              <ThumbRemoveButton onPress={() => removeDisplayImage(idx)} accessibilityLabel="Remove image" />
              {idx === 0 ? (
                <View style={[styles.mainBadge, { backgroundColor: c.primary }]}>
                  <Text style={styles.badgeText}>Main</Text>
                </View>
              ) : null}
            </View>
          ))}
          <DashedTile width={144} height={96} label="Add image" busy={uploadingDisplayImage} onPress={handleDisplayImageUpload} />
        </View>
      </View>

      {/* Bio */}
      <View>
        <FieldLabel>Bio</FieldLabel>
        <FormTextarea
          rows={4}
          value={form.bio}
          onChangeText={(v) => update('bio', v)}
          placeholder="Tell clients about your business, experience, and what makes you stand out..."
          accessibilityLabel="Bio"
        />
      </View>

      {/* Cover banner colour picker. Mounted fresh each open so the sliders seed from the current colour. */}
      {colorPickerOpen ? (
        <CoverColorPicker
          visible
          initialColor={form.coverColor}
          onCancel={() => setColorPickerOpen(false)}
          onDone={(hex) => {
            setColorPickerOpen(false);
            void persistCoverColor(hex);
          }}
        />
      ) : null}
    </View>
  );
}

function SavedBadge() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View style={[styles.savedBadge, { backgroundColor: c.success }]}>
      <Text style={styles.badgeText}>Saved</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing['2xl'] },
  tradesHelper: { marginTop: -2, marginBottom: Spacing.sm },
  abnHelper: { marginTop: 6 },
  mediaCard: { borderWidth: 1, borderRadius: Radius.xl, padding: 12 },
  profileWrap: { alignSelf: 'flex-start', position: 'relative' },
  profileImage: { width: 112, height: 112, borderRadius: Radius.lg, borderWidth: 1 },
  profileFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: 0 },
  profileInitial: { fontSize: 24, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  mediaButton: { marginTop: 12 },
  toggle: { flexDirection: 'row', alignSelf: 'flex-start', borderWidth: 1, borderRadius: Radius.full, padding: 2, marginBottom: 12 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  toggleText: { fontSize: 12, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  banner: { width: '100%', aspectRatio: 3, borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  bannerEmpty: { borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  bannerEmptyText: { marginTop: 4, fontSize: 12, fontFamily: FontFamily.body },
  hexChip: { position: 'absolute', bottom: 6, right: 6, borderRadius: Radius.full, backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 8, paddingVertical: 2 },
  hexText: { color: '#fff', fontSize: 10, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  coverHelp: { marginTop: 8, fontSize: 11, fontFamily: FontFamily.body },
  savedBadge: { position: 'absolute', top: 6, left: 6, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 9, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  displayHelper: { marginBottom: 12 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  displayTile: { width: 144, height: 96, borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  mainBadge: { position: 'absolute', bottom: 6, left: 6, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
});
