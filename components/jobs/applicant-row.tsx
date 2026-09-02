/**
 * ApplicantRow — one applicant inside a My Jobs card. Port of the applicant
 * block in ~/bldesy-web/app/my-jobs/page.tsx: avatar / initials, business
 * name (→ profile), status pill, "trade · suburb", message, and the
 * Accept / Reject / Message actions for pending applications.
 *
 * App superset: an accepted applicant on an assigned/completed job also gets
 * the "Leave Review" entry (components/reviews/review-form.tsx).
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, type Href } from 'expo-router';

import { ReviewForm } from '@/components/reviews/review-form';
import { Badge } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ApplicationWithApplicant } from '@/lib/data/applications';
import { ROUTES } from '@/lib/routes';
import { formatTradeName } from '@/lib/web/trades';
import type { JobStatus } from '@/types/database';

import { appStatusConfig, initials } from './job-format';

interface ApplicantRowProps {
  application: ApplicationWithApplicant;
  jobId: string;
  jobStatus: JobStatus;
  busy: boolean;
  messaging: boolean;
  onAccept: () => void;
  onReject: () => void;
  onMessage: () => void;
}

export function ApplicantRow({
  application: app,
  jobId,
  jobStatus,
  busy,
  messaging,
  onAccept,
  onReject,
  onMessage,
}: ApplicantRowProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const [reviewing, setReviewing] = useState(false);

  const profile = app.applicant;
  // Name/avatar fall back to the PII-safe public_profiles view when the tradie is unlisted.
  const displayName = profile?.business_name ?? app.applicant_public?.name ?? null;
  const avatarUrl = profile?.profile_photo_url ?? app.applicant_public?.avatar_url ?? null;
  const status = appStatusConfig(app.status);
  const canReview = app.status === 'accepted' && (jobStatus === 'in_progress' || jobStatus === 'completed');

  return (
    <View style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" accessibilityLabel={displayName ?? 'Builder'} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: c.primary }]}>
          <Text style={styles.avatarText}>{initials(displayName ?? '?')}</Text>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.nameRow}>
          {profile ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push(ROUTES.builderProfile(app.builder_id) as Href)}
              hitSlop={4}
            >
              <Text style={[styles.name, { color: c.textPrimary }]}>{profile.business_name}</Text>
            </Pressable>
          ) : (
            <Text style={[styles.name, { color: c.textPrimary }]}>{displayName ?? 'Builder'}</Text>
          )}
          <Badge variant={status.variant}>{status.label}</Badge>
        </View>
        {profile ? (
          <Text style={[styles.meta, { color: c.textSecondary }]}>
            {formatTradeName(profile.trade_category)} · {profile.suburb}
          </Text>
        ) : null}
        {app.message ? <Text style={[styles.message, { color: c.textSecondary }]}>{app.message}</Text> : null}

        {/* Actions for pending apps */}
        {app.status === 'pending' ? (
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, busy }}
              disabled={busy}
              onPress={onAccept}
              style={({ pressed }) => [
                styles.acceptBtn,
                { backgroundColor: c.primary, opacity: busy ? 0.5 : pressed ? 0.9 : 1 },
              ]}
            >
              <Text style={styles.acceptText}>{busy ? '...' : 'Accept'}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={onReject}
              style={({ pressed }) => [
                styles.rejectBtn,
                { borderColor: c.error, backgroundColor: pressed ? c.errorBg : 'transparent', opacity: busy ? 0.5 : 1 },
              ]}
            >
              <Text style={[styles.rejectText, { color: c.error }]}>Reject</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: messaging, busy: messaging }}
              disabled={messaging}
              onPress={onMessage}
              style={({ pressed }) => [
                styles.messageBtn,
                {
                  borderColor: c.primary + '4D',
                  backgroundColor: pressed ? c.primary + '1A' : c.primary + '0D',
                  opacity: messaging ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name="mail-outline" size={14} color={c.primary} />
              <Text style={[styles.messageText, { color: c.primary }]}>Message</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Leave Review (app superset) */}
        {canReview ? (
          reviewing ? (
            <View style={{ marginTop: Spacing.md }}>
              <ReviewForm
                jobId={jobId}
                builderId={app.builder_id}
                builderName={displayName ?? 'Builder'}
                onSubmitted={() => setReviewing(false)}
                onCancel={() => setReviewing(false)}
              />
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setReviewing(true)}
              style={({ pressed }) => [styles.reviewBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="star-outline" size={16} color={c.primary} />
              <Text style={[styles.reviewText, { color: c.primary }]}>Leave Review</Text>
            </Pressable>
          )
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontSize: 14, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  body: { flex: 1, minWidth: 0, gap: 2 },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm },
  name: { fontSize: 15, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  meta: { fontSize: 12, fontFamily: FontFamily.body },
  message: { fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body, marginTop: Spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md },
  acceptBtn: { borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: 6 },
  acceptText: { color: '#ffffff', fontSize: 12, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  rejectBtn: { borderRadius: Radius.full, borderWidth: 2, paddingHorizontal: Spacing.lg, paddingVertical: 4 },
  rejectText: { fontSize: 12, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  messageText: { fontSize: 11, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  reviewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.md },
  reviewText: { fontSize: 13, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
});
