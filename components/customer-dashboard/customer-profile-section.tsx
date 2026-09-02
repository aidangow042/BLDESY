/**
 * CustomerProfileSection — the homeowner trust profile on /dashboard/profile.
 * Port of ~/bldesy-web/components/dashboard/customer-profile-section.tsx:
 * opt-in setup prompt → view card → inline editor, in the customer amber accent.
 *
 * Phone verification reuses the PhoneLink OTP flow (writes auth.users.phone),
 * so the "Verified phone" badge derives from auth state. Phone-only accounts
 * (auth email "") additionally get the EmailLink verify-and-attach flow, with
 * the portal settings page's copy — the web's customer section has no email
 * box because it never sees a phone-only customer.
 */
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';

import { ErrorBanner } from '@/components/jobs/error-banner';
import { FieldLabel } from '@/components/jobs/field-label';
import { uploadAvatar, validateImageFile, type PickedFile } from '@/components/jobs/job-media';
import { formatMonthYear } from '@/components/jobs/job-format';
import { SelectSheet } from '@/components/jobs/select-sheet';
import { Card, Input, useToast } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  CUSTOMER_BIO_MAX_LENGTH,
  HOMEOWNER_LABELS,
  PROPERTY_LABELS,
  upsertOwnCustomerProfile,
  type CustomerProfile,
  type HomeownerType,
  type PropertyType,
} from '@/lib/data/customers';
import { dispatchProfileChanged } from '@/lib/events/profile';

import { EmailLink } from './email-link';
import { PhoneLink } from './phone-link';

/** Verbatim customer-profile-section.tsx copy. */
const AVATAR_UPLOAD_FAILED = "Couldn't upload that photo. Please try again.";
const PROFILE_SAVED_TOAST = 'Profile saved';
/** App copy (legacy Post a Job screen) — the OS denied photo-library access. */
const PHOTO_PERMISSION_DENIED = 'Photo access denied — enable it in Settings to upload';

const HOMEOWNER_OPTIONS = (Object.entries(HOMEOWNER_LABELS) as [HomeownerType, string][]).map(([value, label]) => ({ value, label }));
const PROPERTY_OPTIONS = (Object.entries(PROPERTY_LABELS) as [PropertyType, string][]).map(([value, label]) => ({ value, label }));

interface CustomerProfileSectionProps {
  profile: CustomerProfile | null;
  userId: string;
  /** Auth email — "" for phone-only accounts. */
  email: string;
  phoneLinked: boolean;
  memberSince: string;
  defaultFirstName: string;
  onSaved?: (profile: CustomerProfile) => void;
}

export function CustomerProfileSection({
  profile: initialProfile,
  userId,
  email,
  phoneLinked: initialPhoneLinked,
  memberSince,
  defaultFirstName,
  onSaved,
}: CustomerProfileSectionProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [editing, setEditing] = useState(false);
  const [phoneLinked, setPhoneLinked] = useState(initialPhoneLinked);
  const [emailLinked, setEmailLinked] = useState(Boolean(email));

  if (!profile && !editing) {
    return <SetupPrompt onStart={() => setEditing(true)} />;
  }

  if (editing) {
    return (
      <ProfileEditor
        profile={profile}
        userId={userId}
        defaultFirstName={defaultFirstName}
        phoneLinked={phoneLinked}
        onPhoneLinked={() => setPhoneLinked(true)}
        emailLinked={emailLinked}
        onEmailLinked={() => setEmailLinked(true)}
        onSaved={(p) => {
          setProfile(p);
          setEditing(false);
          onSaved?.(p);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <ProfileView
      profile={profile!}
      email={email}
      emailLinked={emailLinked}
      phoneLinked={phoneLinked}
      memberSince={memberSince}
      onEdit={() => setEditing(true)}
    />
  );
}

/* ── Opt-in prompt ──────────────────────────────────────────────── */

function SetupPrompt({ onStart }: { onStart: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <Card padding={Spacing['3xl']} style={styles.center}>
      <View style={[styles.promptIcon, { backgroundColor: c.cta + '1A' }]}>
        <Ionicons name="person-outline" size={28} color={c.cta} />
      </View>
      <Text accessibilityRole="header" style={[styles.h2, { color: c.textPrimary, textAlign: 'center' }]}>
        Add a profile to build trust with tradies
      </Text>
      <Text style={[styles.body, { color: c.textSecondary, textAlign: 'center' }]}>It only takes 30 seconds.</Text>
      <AmberButton label="Set up profile" onPress={onStart} />
    </Card>
  );
}

/* ── Avatar (80px, amber→orange gradient fallback) ──────────────── */

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return <Image source={{ uri: url }} style={styles.avatar} contentFit="cover" accessibilityLabel={`${name}'s avatar`} />;
  }
  return (
    <LinearGradient colors={['#F59E0B', '#F97316']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.avatar, styles.center]}>
      <Text style={styles.avatarInitial}>{(name[0] ?? '?').toUpperCase()}</Text>
    </LinearGradient>
  );
}

/* ── View mode ──────────────────────────────────────────────────── */

function ProfileView({
  profile,
  email,
  emailLinked,
  phoneLinked,
  memberSince,
  onEdit,
}: {
  profile: CustomerProfile;
  email: string;
  emailLinked: boolean;
  phoneLinked: boolean;
  memberSince: string;
  onEdit: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const since = formatMonthYear(memberSince);

  return (
    <Card padding={Spacing['2xl']}>
      <View style={styles.viewTop}>
        <Avatar url={profile.avatar_url} name={profile.first_name} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.name, { color: c.textPrimary }]}>{profile.first_name}</Text>
          <Text style={[styles.body, { color: c.textSecondary }]}>{profile.suburb}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onEdit}
          style={({ pressed }) => [
            styles.outlineBtn,
            { borderColor: pressed ? c.cta : c.border, backgroundColor: c.surface },
          ]}
        >
          {({ pressed }) => (
            <Text style={[styles.outlineBtnText, { color: pressed ? c.cta : c.textSecondary }]}>Edit profile</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.pillRow}>
        <AmberPill label={HOMEOWNER_LABELS[profile.homeowner_type]} />
        <AmberPill label={PROPERTY_LABELS[profile.property_type]} />
      </View>

      {profile.bio ? <Text style={[styles.bio, { color: c.textPrimary }]}>{profile.bio}</Text> : null}

      <View style={styles.pillRow}>
        {emailLinked ? <VerifiedBadge label="Verified email" hint={email || undefined} /> : null}
        {phoneLinked ? <VerifiedBadge label="Verified phone" /> : null}
      </View>

      <Text style={[styles.since, { color: c.textSecondary }]}>
        Member since <Text style={[styles.sinceStrong, { color: c.textPrimary }]}>{since}</Text>
      </Text>
    </Card>
  );
}

function AmberPill({ label }: { label: string }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View style={[styles.amberPill, { backgroundColor: c.cta + '1A' }]}>
      <Text style={[styles.amberPillText, { color: scheme === 'dark' ? c.cta : c.ctaDark }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

export function VerifiedBadge({ label, hint }: { label: string; hint?: string }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View accessibilityLabel={hint ? `${label}: ${hint}` : label} style={[styles.verified, { backgroundColor: c.successBg }]}>
      <Ionicons name="shield-checkmark" size={14} color={c.success} />
      <Text style={[styles.verifiedText, { color: c.success }]}>{label}</Text>
    </View>
  );
}

/* ── Edit mode (inline) ─────────────────────────────────────────── */

function ProfileEditor({
  profile,
  userId,
  defaultFirstName,
  phoneLinked,
  onPhoneLinked,
  emailLinked,
  onEmailLinked,
  onSaved,
  onCancel,
}: {
  profile: CustomerProfile | null;
  userId: string;
  defaultFirstName: string;
  phoneLinked: boolean;
  onPhoneLinked: () => void;
  emailLinked: boolean;
  onEmailLinked: () => void;
  onSaved: (p: CustomerProfile) => void;
  onCancel: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const toast = useToast();
  const [firstName, setFirstName] = useState(profile?.first_name ?? defaultFirstName);
  const [suburb, setSuburb] = useState(profile?.suburb ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [homeownerType, setHomeownerType] = useState<HomeownerType>(profile?.homeowner_type ?? 'owner-occupier');
  const [propertyType, setPropertyType] = useState<PropertyType>(profile?.property_type ?? 'house');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError(PHOTO_PERMISSION_DENIED);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const picked: PickedFile = {
      uri: asset.uri,
      name: asset.fileName ?? undefined,
      size: asset.fileSize ?? undefined,
      mimeType: asset.mimeType ?? undefined,
    };
    const validationError = validateImageFile(picked);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setAvatarPreview(asset.uri);
    setUploading(true);
    const uploaded = await uploadAvatar(picked, userId);
    if (!uploaded) {
      setError(AVATAR_UPLOAD_FAILED);
      setAvatarPreview(null);
      setUploading(false);
      return;
    }
    setAvatarUrl(uploaded.url);
    setUploading(false);
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const saved = await upsertOwnCustomerProfile(userId, {
        first_name: firstName,
        suburb,
        bio,
        homeowner_type: homeownerType,
        property_type: propertyType,
        avatar_url: avatarUrl,
      });
      toast.show(PROFILE_SAVED_TOAST, { variant: 'success' });
      dispatchProfileChanged();
      onSaved(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card padding={Spacing['2xl']}>
      <Text accessibilityRole="header" style={[styles.h2, { color: c.textPrimary, marginBottom: Spacing.xl }]}>
        {profile ? 'Edit profile' : 'Set up your profile'}
      </Text>

      {error ? (
        <View style={{ marginBottom: Spacing.lg }}>
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </View>
      ) : null}

      <View style={{ gap: Spacing.lg }}>
        {/* Avatar upload */}
        <View style={styles.avatarRow}>
          <View>
            <Avatar url={avatarPreview ?? avatarUrl} name={firstName || '?'} />
            {uploading ? (
              <View style={[styles.avatar, styles.center, styles.avatarOverlay]}>
                <ActivityIndicator color="#ffffff" />
              </View>
            ) : null}
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Pressable
              accessibilityRole="button"
              onPress={handlePickAvatar}
              disabled={uploading}
              style={({ pressed }) => [
                styles.outlineBtn,
                { alignSelf: 'flex-start', borderColor: pressed ? c.cta : c.border, backgroundColor: c.surface, opacity: uploading ? 0.6 : 1 },
              ]}
            >
              {({ pressed }) => (
                <Text style={[styles.outlineBtnText, { color: pressed ? c.cta : c.textSecondary }]}>
                  {avatarUrl || avatarPreview ? 'Change photo' : 'Upload photo'}
                </Text>
              )}
            </Pressable>
            <Text style={[styles.hint, { color: c.textSecondary }]}>JPG, PNG or WebP, up to 5MB.</Text>
          </View>
        </View>

        <View>
          <FieldLabel muted>First name</FieldLabel>
          <Input value={firstName} onChangeText={setFirstName} placeholder="Your first name" autoComplete="given-name" accessibilityLabel="First name" />
        </View>
        <View>
          <FieldLabel muted>Suburb</FieldLabel>
          <Input value={suburb} onChangeText={setSuburb} placeholder="e.g. Surry Hills" autoCapitalize="words" accessibilityLabel="Suburb" />
        </View>

        <View>
          <FieldLabel muted>I am a…</FieldLabel>
          <SelectSheet
            value={homeownerType}
            onChange={(v) => v && setHomeownerType(v)}
            placeholder="I am a…"
            options={HOMEOWNER_OPTIONS}
            accent={c.cta}
          />
        </View>
        <View>
          <FieldLabel muted>Property type</FieldLabel>
          <SelectSheet
            value={propertyType}
            onChange={(v) => v && setPropertyType(v)}
            placeholder="Property type"
            options={PROPERTY_OPTIONS}
            accent={c.cta}
          />
        </View>

        <View>
          <View style={styles.bioLabelRow}>
            <FieldLabel muted>Bio</FieldLabel>
            <Text style={[styles.counter, { color: bio.length >= CUSTOMER_BIO_MAX_LENGTH ? c.error : c.textSecondary }]}>
              {bio.length}/{CUSTOMER_BIO_MAX_LENGTH}
            </Text>
          </View>
          <Input
            value={bio}
            onChangeText={setBio}
            maxLength={CUSTOMER_BIO_MAX_LENGTH}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={styles.textarea}
            placeholder="A line or two about you and your place — helps tradies know who they're working with."
            accessibilityLabel="Bio"
          />
        </View>

        {/* Phone verification — reuses the existing OTP link flow */}
        <View style={[styles.verifyBox, { borderColor: c.border, backgroundColor: c.canvas }]}>
          <Text style={[styles.verifyTitle, { color: c.textPrimary }]}>Mobile number</Text>
          {phoneLinked ? (
            <Text style={[styles.body, { color: c.textSecondary }]}>
              Your mobile is verified — the verified phone badge shows on your profile.
            </Text>
          ) : (
            <>
              <Text style={[styles.hint, { color: c.textSecondary, marginBottom: Spacing.md }]}>
                Verify your mobile to earn a verified phone badge (and unlock phone login).
              </Text>
              <PhoneLink onLinked={onPhoneLinked} accent={c.cta} />
            </>
          )}
        </View>

        {/* Email — phone-only accounts (auth email "") verify-and-attach one (portal settings copy). */}
        {!emailLinked ? (
          <View style={[styles.verifyBox, { borderColor: c.border, backgroundColor: c.canvas }]}>
            <Text style={[styles.verifyTitle, { color: c.textPrimary }]}>Email address</Text>
            <Text style={[styles.body, { color: c.textSecondary, marginBottom: Spacing.md }]}>
              No email on your login yet — verify one to get receipts and log in with it. We&apos;ll email you a
              code to confirm it&apos;s yours.
            </Text>
            <EmailLink onLinked={onEmailLinked} />
          </View>
        ) : null}

        <View style={styles.actions}>
          <AmberButton label={saving ? 'Saving…' : 'Save'} onPress={handleSave} disabled={saving || uploading} busy={saving} />
          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            disabled={saving}
            style={({ pressed }) => [styles.cancelBtn, { borderColor: c.border, backgroundColor: c.surface }, pressed && { opacity: 0.8 }]}
          >
            <Text style={[styles.cancelText, { color: c.textSecondary }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Card>
  );
}

/** The web's `bg-amber-500 hover:bg-amber-600` primary action (h-11, rounded-2xl). */
function AmberButton({ label, onPress, disabled, busy }: { label: string; onPress: () => void; disabled?: boolean; busy?: boolean }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(busy) }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.amberBtn, { backgroundColor: pressed ? c.ctaDark : c.cta, opacity: disabled ? 0.6 : 1 }]}
    >
      {busy ? <ActivityIndicator size="small" color="#ffffff" /> : null}
      <Text style={styles.amberBtnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  h2: { fontSize: 18, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body },
  hint: { fontSize: 12, lineHeight: 18, fontFamily: FontFamily.body },
  promptIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  amberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 44,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing['2xl'],
    marginTop: Spacing.lg,
  },
  amberBtnText: { color: '#ffffff', fontSize: 14, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarInitial: { color: '#ffffff', fontSize: 24, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  avatarOverlay: { position: 'absolute', top: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  viewTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.lg },
  name: { fontSize: 20, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  outlineBtn: { height: 36, borderRadius: Radius.xl, borderWidth: 1, paddingHorizontal: Spacing.lg, alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { fontSize: 12, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  amberPill: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 2 },
  amberPillText: { fontSize: 11, fontFamily: FontFamily.bodyBold, fontWeight: '700', letterSpacing: 0.6 },
  bio: { fontSize: 14, lineHeight: 22, fontFamily: FontFamily.body, marginTop: Spacing.md },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 2 },
  verifiedText: { fontSize: 11, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  since: { fontSize: 12, fontFamily: FontFamily.body, marginTop: Spacing.lg },
  sinceStrong: { fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  bioLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counter: { fontSize: 12, fontFamily: FontFamily.body, marginBottom: 6 },
  textarea: { minHeight: 84 },
  verifyBox: { borderWidth: 1, borderRadius: Radius.xl, padding: Spacing.lg },
  verifyTitle: { fontSize: 14, fontFamily: FontFamily.bodySemiBold, fontWeight: '600', marginBottom: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  cancelBtn: { height: 44, borderRadius: Radius.xl, borderWidth: 1, paddingHorizontal: Spacing['2xl'], alignItems: 'center', justifyContent: 'center', marginTop: Spacing.lg },
  cancelText: { fontSize: 14, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
});
