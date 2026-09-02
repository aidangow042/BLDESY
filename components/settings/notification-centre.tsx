/**
 * NotificationCentre — port of `~/bldesy-web/components/settings/notification-centre.tsx`.
 *
 * One hub for all notification channels. Email + push flags are persisted to
 * `notification_preferences` via /api/notifications/preferences (server-side
 * upsert, because the row is created lazily and RLS blocks self-insert). SMS is
 * passed in from the parent because it lives on the profile table. Turning
 * Push on is also the point-of-use opt-in for the OS permission.
 */
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Input, ToggleSwitch, useToast, type ToggleAccent } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@/lib/auth-context';
import {
  getNotificationPreferences,
  resolveNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '@/lib/data/notifications';
import { registerForPushNotifications } from '@/lib/push';

type Role = 'tradie' | 'enterprise';

const CATEGORIES_BY_ROLE: Record<Role, { key: string; label: string; desc: string }[]> = {
  tradie: [
    {
      key: 'new_job_match',
      label: 'New job matches',
      desc: 'Jobs & contracts matching your trade and work area',
    },
    {
      key: 'job_filled',
      label: 'Job filled',
      desc: 'When a job you applied to gets filled',
    },
    {
      key: 'job_expiring',
      label: 'Job expiring',
      desc: "Reminders before a job you're interested in closes",
    },
    {
      key: 'milestone',
      label: 'Milestones & updates',
      desc: 'Account milestones and product news',
    },
  ],
  enterprise: [
    {
      key: 'new_application',
      label: 'New applications',
      desc: 'When a tradie applies to one of your jobs or contracts',
    },
    {
      key: 'job_filled',
      label: 'Job filled',
      desc: 'When one of your jobs is marked filled',
    },
    {
      key: 'job_expiring',
      label: 'Job expiring',
      desc: 'Reminders before one of your listings closes',
    },
    {
      key: 'milestone',
      label: 'Milestones & updates',
      desc: 'Account milestones and product news',
    },
  ],
};

const SMS_DESC_BY_ROLE: Record<Role, string> = {
  tradie: 'Text alerts for matching jobs',
  enterprise: 'Text alerts when a tradie applies',
};

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

/** The existing app copy when iOS has already refused the permission. */
const PUSH_DENIED_HINT = 'Enable notifications for BLDESY in your iPhone Settings';

export function NotificationCentre({ sms, role = 'tradie' }: { sms: SmsControls; role?: Role }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const toast = useToast();
  const { userId } = useUser();
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => resolveNotificationPreferences(null));
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  const accent: ToggleAccent = role === 'enterprise' ? 'indigo' : 'primary';
  const categories = CATEGORIES_BY_ROLE[role];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await getNotificationPreferences();
        if (!cancelled) setPrefs(loaded);
      } catch {
        // keep defaults-on
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function patch(partial: Partial<NotificationPreferences>) {
    setSaveError(null);
    const previous = prefs;
    const next = { ...prefs, ...partial };
    setPrefs(next); // optimistic
    try {
      await updateNotificationPreferences(partial);
    } catch {
      setPrefs(previous); // roll back
      setSaveError("Couldn't save that change — please try again.");
      return;
    }
    // The push toggle is the point-of-use opt-in: turning it on requests the
    // OS permission (never on launch). A previous denial can't be re-prompted
    // on iOS — point at Settings.
    if (partial.push_enabled === true && userId) {
      const result = await registerForPushNotifications(userId, { prompt: true });
      if (result.status === 'denied' && Platform.OS === 'ios') {
        toast.show(PUSH_DENIED_HINT, { duration: 4000 });
      }
    }
  }

  return (
    <Card padding={Spacing['2xl']} flat>
      <Text accessibilityRole="header" style={[styles.title, { color: c.textPrimary }]}>
        Notification Centre
      </Text>
      <Text style={[styles.sub, { color: c.textSecondary }]}>
        Choose how you hear from BLDESY. Turn any channel off completely, or fine-tune what you get per
        type.
      </Text>

      {/* Channel master switches */}
      <View style={[styles.channels, { borderColor: c.border, backgroundColor: c.canvas + '66' }]}>
        <Row
          label="Email"
          desc="Notifications to your inbox"
          value={prefs.email_enabled}
          onChange={(v) => void patch({ email_enabled: v })}
          disabled={loading}
          accent={accent}
        />
        <Row
          label="Push"
          desc="Alerts on your phone (BLDESY app)"
          value={prefs.push_enabled}
          onChange={(v) => void patch({ push_enabled: v })}
          disabled={loading}
          accent={accent}
        />
        <Row
          label="SMS"
          desc={SMS_DESC_BY_ROLE[role]}
          value={sms.enabled}
          onChange={sms.onToggle}
          disabled={sms.saving}
          accent={accent}
        />
      </View>

      {/* SMS number — only relevant when SMS is on or being turned on */}
      <View style={styles.smsBlock}>
        {sms.hidePhoneField ? (
          <Text style={[styles.hint, { color: c.textSecondary }]}>
            {sms.phoneHint ?? 'SMS uses your contact phone number.'}
          </Text>
        ) : (
          <>
            <Text style={[styles.fieldLabel, { color: c.textPrimary }]}>Mobile number for SMS</Text>
            <View style={styles.phoneRow}>
              <Input
                value={sms.phone ?? ''}
                onChangeText={(v) => sms.onPhoneChange?.(v)}
                placeholder="0412 345 678"
                keyboardType="phone-pad"
                autoComplete="tel"
                accessibilityLabel="Mobile number for SMS"
                containerStyle={styles.phoneInput}
              />
              <Pressable
                accessibilityRole="button"
                disabled={sms.saving}
                onPress={sms.onPhoneSave}
                style={[styles.saveButton, { borderColor: c.border, backgroundColor: c.surface }, sms.saving && styles.disabled]}
              >
                <Text style={[styles.saveText, { color: c.textPrimary }]}>Save</Text>
              </Pressable>
            </View>
          </>
        )}
        {sms.message ? (
          <Text style={[styles.message, { color: sms.message.type === 'success' ? c.success : c.error }]}>
            {sms.message.text}
          </Text>
        ) : null}
      </View>

      {/* Per-category email/push */}
      <View style={styles.categories}>
        <View style={styles.columnHeads}>
          <Text style={[styles.columnHead, { color: c.textSecondary }]}>Email</Text>
          <Text style={[styles.columnHead, { color: c.textSecondary }]}>Push</Text>
        </View>
        {categories.map((cat, i) => {
          const emailKey = `${cat.key}_email` as keyof NotificationPreferences;
          const pushKey = `${cat.key}_push` as keyof NotificationPreferences;
          return (
            <View key={cat.key} style={[styles.categoryRow, { borderTopColor: c.border }, i === 0 && styles.categoryRowFirst]}>
              <View style={styles.categoryText}>
                <Text style={[styles.categoryLabel, { color: c.textPrimary }]}>{cat.label}</Text>
                <Text style={[styles.categoryDesc, { color: c.textSecondary }]}>{cat.desc}</Text>
              </View>
              <View style={styles.toggleCell}>
                <ToggleSwitch
                  checked={prefs.email_enabled && prefs[emailKey]}
                  onChange={(v) => void patch({ [emailKey]: v } as Partial<NotificationPreferences>)}
                  disabled={loading || !prefs.email_enabled}
                  accent={accent}
                  accessibilityLabel={`${cat.label} email`}
                />
              </View>
              <View style={styles.toggleCell}>
                <ToggleSwitch
                  checked={prefs.push_enabled && prefs[pushKey]}
                  onChange={(v) => void patch({ [pushKey]: v } as Partial<NotificationPreferences>)}
                  disabled={loading || !prefs.push_enabled}
                  accent={accent}
                  accessibilityLabel={`${cat.label} push`}
                />
              </View>
            </View>
          );
        })}
      </View>

      {saveError ? <Text style={[styles.message, { color: c.error }]}>{saveError}</Text> : null}
    </Card>
  );
}

/* ── Channel master row ───────────────────────────────────────────── */
function Row({
  label,
  desc,
  value,
  onChange,
  disabled,
  accent,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  accent?: ToggleAccent;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: c.textPrimary }]}>{label}</Text>
        <Text style={[styles.rowDesc, { color: c.textSecondary }]}>{desc}</Text>
      </View>
      <ToggleSwitch checked={value} onChange={onChange} disabled={disabled} accent={accent} accessibilityLabel={label} />
    </View>
  );
}

const TOGGLE_COL = 44; // web w-11

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    lineHeight: 28,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  sub: {
    marginTop: Spacing.xs,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  channels: {
    marginTop: Spacing['2xl'],
    gap: Spacing.xs,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  rowDesc: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  smsBlock: {
    marginTop: Spacing.lg,
  },
  hint: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  fieldLabel: {
    marginBottom: 6,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  phoneInput: {
    flex: 1,
  },
  saveButton: {
    height: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.5,
  },
  message: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  categories: {
    marginTop: Spacing['2xl'],
  },
  columnHeads: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  columnHead: {
    width: TOGGLE_COL,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  categoryRowFirst: {
    borderTopWidth: 0,
  },
  categoryText: {
    flex: 1,
    minWidth: 0,
  },
  categoryLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  categoryDesc: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  toggleCell: {
    width: TOGGLE_COL,
    alignItems: 'center',
  },
});
