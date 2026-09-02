/**
 * NotificationCentre — port of ~/bldesy-web/components/settings/notification-centre.tsx.
 *
 * One hub for all notification channels. Email + push flags persist to
 * `notification_preferences` through lib/data/notifications.ts (server-side
 * upsert — the row is created lazily and RLS blocks self-insert). SMS is
 * passed in from the parent because it lives on the profile table.
 * Categories and copy per role are the website's.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FontFamily, Radius, Spacing } from '@/constants/theme';
import {
  getNotificationPreferences,
  resolveNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferenceKey,
  type NotificationPreferences,
} from '@/lib/data/notifications';

import { HubInput, HubSwitch } from './hub-form';
import { PillButton, useHubTheme } from './hub-primitives';

type Role = 'tradie' | 'enterprise';

const CATEGORIES_BY_ROLE: Record<Role, { key: string; label: string; desc: string }[]> = {
  tradie: [
    { key: 'new_job_match', label: 'New job matches', desc: 'Jobs & contracts matching your trade and work area' },
    { key: 'job_filled', label: 'Job filled', desc: 'When a job you applied to gets filled' },
    { key: 'job_expiring', label: 'Job expiring', desc: "Reminders before a job you're interested in closes" },
    { key: 'milestone', label: 'Milestones & updates', desc: 'Account milestones and product news' },
  ],
  enterprise: [
    { key: 'new_application', label: 'New applications', desc: 'When a tradie applies to one of your jobs or contracts' },
    { key: 'job_filled', label: 'Job filled', desc: 'When one of your jobs is marked filled' },
    { key: 'job_expiring', label: 'Job expiring', desc: 'Reminders before one of your listings closes' },
    { key: 'milestone', label: 'Milestones & updates', desc: 'Account milestones and product news' },
  ],
};

const SMS_DESC_BY_ROLE: Record<Role, string> = {
  tradie: 'Text alerts for matching jobs',
  enterprise: 'Text alerts when a tradie applies',
};

export const PREFS_SAVE_ERROR = "Couldn't save that change — please try again.";

export interface SmsControls {
  enabled: boolean;
  saving: boolean;
  message: { type: 'success' | 'error'; text: string } | null;
  onToggle: (next: boolean) => void;
  /** Hide the in-centre phone field (e.g. enterprise reuses its contact phone). */
  hidePhoneField?: boolean;
  /** Note shown under the SMS row when the phone field is hidden. */
  phoneHint?: string;
  phone?: string;
  onPhoneChange?: (v: string) => void;
  onPhoneSave?: () => void;
}

export function NotificationCentre({ sms, role = 'tradie' }: { sms: SmsControls; role?: Role }) {
  const c = useHubTheme();
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => resolveNotificationPreferences(null));
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  const categories = CATEGORIES_BY_ROLE[role];

  useEffect(() => {
    let cancelled = false;
    getNotificationPreferences()
      .then((resolved) => {
        if (!cancelled) setPrefs(resolved);
      })
      .catch(() => {
        // keep defaults-on
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function patch(partial: Partial<NotificationPreferences>) {
    setSaveError(null);
    const previous = prefs;
    setPrefs({ ...prefs, ...partial }); // optimistic
    try {
      await updateNotificationPreferences(partial);
    } catch {
      setPrefs(previous); // roll back
      setSaveError(PREFS_SAVE_ERROR);
    }
  }

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: c.textPrimary }]}>
        Notification Centre
      </Text>
      <Text style={[styles.subtitle, { color: c.textSecondary }]}>
        Choose how you hear from BLDESY. Turn any channel off completely, or fine-tune what you get per type.
      </Text>

      {/* Channel master switches */}
      <View style={[styles.channels, { borderColor: c.border, backgroundColor: c.canvas + '66' }]}>
        <Row
          label="Email"
          desc="Notifications to your inbox"
          value={prefs.email_enabled}
          onChange={(v) => patch({ email_enabled: v })}
          disabled={loading}
        />
        <Row
          label="Push"
          desc="Alerts on your phone (BLDESY app)"
          value={prefs.push_enabled}
          onChange={(v) => patch({ push_enabled: v })}
          disabled={loading}
        />
        <Row label="SMS" desc={SMS_DESC_BY_ROLE[role]} value={sms.enabled} onChange={sms.onToggle} disabled={sms.saving} />
      </View>

      {/* SMS number — only relevant when SMS is on or being turned on */}
      <View style={{ marginTop: Spacing.lg }}>
        {sms.hidePhoneField ? (
          <Text style={[styles.hint, { color: c.textSecondary }]}>
            {sms.phoneHint ?? 'SMS uses your contact phone number.'}
          </Text>
        ) : (
          <View style={styles.phoneRow}>
            <HubInput
              label="Mobile number for SMS"
              value={sms.phone ?? ''}
              onChangeText={(v) => sms.onPhoneChange?.(v)}
              placeholder="0412 345 678"
              keyboardType="phone-pad"
              containerStyle={{ flex: 1 }}
            />
            <PillButton
              label="Save"
              variant="outline"
              onPress={() => sms.onPhoneSave?.()}
              disabled={sms.saving}
              style={{ marginTop: 26, borderRadius: Radius.lg }}
            />
          </View>
        )}
        {sms.message ? (
          <Text style={[styles.message, { color: sms.message.type === 'success' ? c.success : c.error }]}>
            {sms.message.text}
          </Text>
        ) : null}
      </View>

      {/* Per-category email/push */}
      <View style={{ marginTop: Spacing['2xl'] }}>
        <View style={styles.columnHeads}>
          <Text style={[styles.columnHead, { color: c.textSecondary }]}>Email</Text>
          <Text style={[styles.columnHead, { color: c.textSecondary }]}>Push</Text>
        </View>
        {categories.map((cat, i) => {
          const emailKey = `${cat.key}_email` as NotificationPreferenceKey;
          const pushKey = `${cat.key}_push` as NotificationPreferenceKey;
          return (
            <View
              key={cat.key}
              style={[styles.categoryRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.categoryLabel, { color: c.textPrimary }]}>{cat.label}</Text>
                <Text style={[styles.categoryDesc, { color: c.textSecondary }]}>{cat.desc}</Text>
              </View>
              <HubSwitch
                value={prefs.email_enabled && prefs[emailKey]}
                onValueChange={(v) => patch({ [emailKey]: v } as Partial<NotificationPreferences>)}
                disabled={loading || !prefs.email_enabled}
                accessibilityLabel={`${cat.label} email`}
              />
              <HubSwitch
                value={prefs.push_enabled && prefs[pushKey]}
                onValueChange={(v) => patch({ [pushKey]: v } as Partial<NotificationPreferences>)}
                disabled={loading || !prefs.push_enabled}
                accessibilityLabel={`${cat.label} push`}
              />
            </View>
          );
        })}
      </View>

      {saveError ? <Text style={[styles.message, { color: c.error, marginTop: Spacing.md }]}>{saveError}</Text> : null}
    </View>
  );
}

function Row({
  label,
  desc,
  value,
  onChange,
  disabled,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const c = useHubTheme();
  return (
    <View style={styles.channelRow}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.channelLabel, { color: c.textPrimary }]}>{label}</Text>
        <Text style={[styles.categoryDesc, { color: c.textSecondary }]}>{desc}</Text>
      </View>
      <HubSwitch value={value} onValueChange={onChange} disabled={disabled} accessibilityLabel={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing['2xl'],
  },
  title: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  channels: {
    marginTop: Spacing['2xl'],
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: 4,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  channelLabel: {
    fontSize: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  message: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: FontFamily.body,
  },
  columnHeads: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.lg,
    paddingBottom: Spacing.sm,
    paddingRight: 4,
  },
  columnHead: {
    width: 52,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  categoryLabel: {
    fontSize: 14,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  categoryDesc: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
});
