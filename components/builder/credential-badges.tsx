/**
 * Displays verified credential badges (ABN, licences, insurance) on builder profiles.
 */
import { StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type AbnVerification = {
  number: string;
  verified: boolean;
  entity_name?: string;
  verified_at?: string;
};

type LicenceVerification = {
  type: string;
  licence_number: string;
  verified: boolean;
  display_label?: string;
  verified_at?: string | null;
  status?: string;
};

type InsuranceVerification = {
  verified: boolean;
  insurer_name?: string;
  coverage_amount?: string;
  expiry_date?: string;
  verified_at?: string;
};

type CredentialsVerified = {
  abn?: AbnVerification;
  licences?: LicenceVerification[];
  insurance?: InsuranceVerification;
  state?: string;
};

type Props = {
  credentials?: CredentialsVerified | null;
  variant?: 'pills' | 'list';
};

type Badge = {
  label: string;
  verified: boolean;
  date?: string | null;
};

function collectBadges(creds: CredentialsVerified): Badge[] {
  const badges: Badge[] = [];

  if (creds.abn?.verified) {
    badges.push({ label: 'ABN Verified', verified: true, date: creds.abn.verified_at });
  }

  for (const licence of creds.licences ?? []) {
    if (licence.verified) {
      badges.push({
        label: licence.display_label || `${licence.type} Licence`,
        verified: true,
        date: licence.verified_at,
      });
    }
  }

  if (creds.insurance?.verified) {
    badges.push({ label: 'Insured', verified: true, date: creds.insurance.verified_at });
  }

  return badges;
}

function formatDate(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function CredentialBadges({ credentials, variant = 'pills' }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  if (!credentials) return null;

  const badges = collectBadges(credentials);
  if (badges.length === 0) return null;

  if (variant === 'list') {
    return (
      <View style={styles.listContainer}>
        {badges.map((badge) => (
          <View key={badge.label} style={styles.listItem}>
            <MaterialIcons name="verified" size={18} color={colors.success} />
            <View style={styles.listText}>
              <Text style={[styles.listLabel, { color: colors.text }]}>{badge.label}</Text>
              {badge.date && (
                <Text style={[styles.listDate, { color: colors.textSecondary }]}>
                  Verified {formatDate(badge.date)}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.pillsContainer}>
      {badges.map((badge) => (
        <View
          key={badge.label}
          style={[styles.pill, { backgroundColor: colors.tealBg, borderColor: colors.tealLight }]}
        >
          <MaterialIcons name="verified" size={14} color={colors.teal} />
          <Text style={[styles.pillText, { color: colors.teal }]}>{badge.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  pillText: {
    ...Type.micro,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  listContainer: {
    gap: Spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  listText: {
    gap: 1,
  },
  listLabel: {
    ...Type.bodySemiBold,
  },
  listDate: {
    ...Type.caption,
  },
});
