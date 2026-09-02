/**
 * ApplicantCard — one applicant row on the enterprise job page
 * (~/bldesy-web/app/enterprise/jobs/[id]/page.tsx `visibleApplicants.map`):
 * avatar → profile, name + trade · suburb · "Applied 5m ago", Accept / Reject
 * (pending) or the status pill, the capability-match headline chip (tap for
 * the MatchBreakdown — summary on the surface, detail on demand), the star
 * rating, the application message, the phone once accepted, and the View
 * Profile / Message actions.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';

import { FontFamily, Radius, Spacing } from '@/constants/theme';
import type { Applicant } from '@/lib/data/enterprise';
import { appliedAgo, capitalise, humaniseSlug } from '@/lib/enterprise-hub/format';

import { InitialAvatar, PillButton, TinyPill, useHubTheme, type PillTone } from './hub-primitives';
import { MatchBreakdown } from './match-breakdown';

const TIER_TONE: Record<Applicant['matchTier'], PillTone> = {
  full: 'success',
  partial: 'amber',
  none: 'error',
};

export function ApplicantCard({
  applicant: app,
  jobHasRequirements,
  expanded,
  onToggleExpand,
  onAccept,
  onReject,
  actionLoading,
  onViewProfile,
  onMessage,
  messaging,
}: {
  applicant: Applicant;
  jobHasRequirements: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onAccept: () => void;
  onReject: () => void;
  actionLoading: boolean;
  onViewProfile: () => void;
  onMessage: () => void;
  messaging: boolean;
}) {
  const c = useHubTheme();
  const meta = [
    app.builder_trade ? humaniseSlug(app.builder_trade) : null,
    app.builder_suburb,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="link" accessibilityLabel="View profile" onPress={onViewProfile}>
        {app.builder_photo ? (
          <Image
            source={{ uri: app.builder_photo }}
            contentFit="cover"
            style={[styles.avatar, { borderColor: c.border }]}
            accessibilityLabel={app.builder_name ?? ''}
          />
        ) : (
          <InitialAvatar name={app.builder_name} size={48} />
        )}
      </Pressable>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.topRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Pressable accessibilityRole="link" onPress={onViewProfile} hitSlop={4}>
              <Text style={[styles.name, { color: c.textPrimary }]}>{app.builder_name ?? 'Unknown Builder'}</Text>
            </Pressable>
            <Text style={[styles.meta, { color: c.textSecondary }]}>
              {meta}
              <Text style={{ color: c.textSecondary + '80' }}>
                {meta ? ' · ' : ''}Applied {appliedAgo(app.created_at)}
              </Text>
            </Text>
          </View>
        </View>

        {/* Status / actions */}
        <View style={styles.decisionRow}>
          {app.status === 'pending' ? (
            <>
              <PillButton label="Accept" variant="success" size="sm" onPress={onAccept} disabled={actionLoading} />
              <PillButton label="Reject" variant="outline-error" size="sm" onPress={onReject} disabled={actionLoading} />
            </>
          ) : (
            <TinyPill label={capitalise(app.status)} tone={app.status === 'accepted' ? 'success' : 'error'} size="sm" />
          )}
        </View>

        {/* Match score badge + rating */}
        {jobHasRequirements || app.reviewCount > 0 ? (
          <View style={styles.matchRow}>
            {jobHasRequirements ? (
              <TinyPill
                label={app.matchHeadline}
                tone={TIER_TONE[app.matchTier]}
                onPress={onToggleExpand}
                trailing={
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={12}
                    color={TIER_TONE[app.matchTier] === 'amber' ? '#92400e' : undefined}
                    style={{ opacity: 0.8 }}
                  />
                }
              />
            ) : null}
            {app.reviewCount > 0 ? (
              <View style={styles.rating}>
                <Ionicons name="star" size={12} color="#f59e0b" />
                <Text style={[styles.ratingText, { color: c.textSecondary }]}>
                  {app.averageRating.toFixed(1)} ({app.reviewCount})
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Expanded match breakdown */}
        {jobHasRequirements && expanded ? <MatchBreakdown match={app.match} capabilities={app.capabilities} /> : null}

        {/* Application message */}
        {app.message ? (
          <View style={[styles.quote, { backgroundColor: c.canvas }]}>
            <Text style={[styles.quoteText, { color: c.textSecondary }]}>&ldquo;{app.message}&rdquo;</Text>
          </View>
        ) : null}

        {/* Contact info for accepted */}
        {app.status === 'accepted' && app.builder_phone ? (
          <Text style={[styles.phone, { color: c.success }]}>Phone: {app.builder_phone}</Text>
        ) : null}

        {/* Action buttons */}
        <View style={styles.actions}>
          <PillButton label="View Profile" variant="outline" size="sm" icon="person-outline" onPress={onViewProfile} />
          <PillButton
            label="Message"
            variant="outline"
            size="sm"
            icon="mail-outline"
            onPress={onMessage}
            loading={messaging}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  name: {
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  meta: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  decisionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  matchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 11,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  quote: {
    marginTop: Spacing.sm,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  quoteText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  phone: {
    marginTop: Spacing.sm,
    fontSize: 12,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
});
