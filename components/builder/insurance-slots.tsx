/**
 * Multi-certificate insurance UI for the app — mirrors the website's
 * components/builder/insurance-slots.tsx. Three slots (Public Liability,
 * Professional Indemnity, Workers Compensation). PL visible by default;
 * PI + WC reveal on tap. Each slot uploads to /api/verify-insurance with
 * its own kind + optional policy_name hint.
 */
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://bldesy.com.au';

type Kind = 'public_liability' | 'professional_indemnity' | 'workers_compensation';

const KIND_LABEL: Record<Kind, string> = {
  public_liability: 'Public Liability',
  professional_indemnity: 'Professional Indemnity',
  workers_compensation: 'Workers Compensation',
};

const KIND_HINT: Record<Kind, string> = {
  public_liability:
    'Required for most trades. Covers property damage + third-party injury claims arising from your work.',
  professional_indemnity:
    'Covers advice + design errors — common for designers, engineers, and trades who give technical advice.',
  workers_compensation:
    "Required by law if you employ anyone. Covers your employees if they're injured on the job.",
};

const KIND_PLACEHOLDER: Record<Kind, string> = {
  public_liability: 'e.g. Public Liability $20M',
  professional_indemnity: 'e.g. Professional Indemnity $2M',
  workers_compensation: 'e.g. icare NSW Workers Insurance',
};

interface Check {
  id: string;
  label: string;
  status: 'ok' | 'warn' | 'fail';
  detail?: string;
}

export interface InsuranceRecord {
  verified?: boolean;
  verified_by?: string;
  verdict?: 'PASS' | 'REVIEW' | 'FAIL';
  confidence?: number;
  checks?: Check[];
  insurer_name?: string | null;
  policy_number?: string | null;
  policy_name?: string | null;
  coverage_amount?: string | null;
  expiry_date?: string | null;
  document_path?: string | null;
}

export interface CredentialsVerified {
  abn?: any;
  licences?: any[];
  insurance?: Partial<Record<Kind, InsuranceRecord>> & InsuranceRecord;
  state?: string;
  [key: string]: any;
}

interface Props {
  credentials: CredentialsVerified | null;
  abnEntityName: string | null;
  profileType: 'builder' | 'enterprise';
  onUpdated: (merged: CredentialsVerified) => void | Promise<void>;
}

export function InsuranceSlots({ credentials, abnEntityName, profileType, onUpdated }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const initialShow = useMemo(() => {
    const s = new Set<Kind>(['public_liability']);
    for (const kind of ['professional_indemnity', 'workers_compensation'] as Kind[]) {
      if (credentials?.insurance?.[kind]?.verified_by) s.add(kind);
    }
    return s;
  }, [credentials]);

  const [visible, setVisible] = useState<Set<Kind>>(initialShow);

  function revealKind(kind: Kind) {
    setVisible((prev) => {
      const next = new Set(prev);
      next.add(kind);
      return next;
    });
  }

  const hidden = (['professional_indemnity', 'workers_compensation'] as Kind[]).filter(
    (k) => !visible.has(k),
  );

  return (
    <View style={{ gap: Spacing.md }}>
      {(['public_liability', 'professional_indemnity', 'workers_compensation'] as Kind[]).map(
        (kind) =>
          visible.has(kind) ? (
            <InsuranceSlotCard
              key={kind}
              kind={kind}
              record={credentials?.insurance?.[kind] ?? null}
              credentials={credentials}
              abnEntityName={abnEntityName}
              profileType={profileType}
              onUpdated={onUpdated}
              colors={colors}
              isDark={isDark}
            />
          ) : null,
      )}

      {hidden.length > 0 ? (
        <View style={styles.addRow}>
          <Text style={[Type.caption, { color: colors.textSecondary }]}>
            Add another policy:
          </Text>
          {hidden.map((kind) => (
            <Pressable
              key={kind}
              onPress={() => revealKind(kind)}
              style={[
                styles.addChip,
                { backgroundColor: colors.tealBg, borderColor: colors.teal },
              ]}
            >
              <Ionicons name="add" size={14} color={colors.teal} />
              <Text style={[styles.addChipText, { color: colors.teal }]}>
                {KIND_LABEL[kind]}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function InsuranceSlotCard({
  kind,
  record,
  credentials,
  abnEntityName,
  profileType,
  onUpdated,
  colors,
  isDark,
}: {
  kind: Kind;
  record: InsuranceRecord | null;
  credentials: CredentialsVerified | null;
  abnEntityName: string | null;
  profileType: 'builder' | 'enterprise';
  onUpdated: (merged: CredentialsVerified) => void | Promise<void>;
  colors: typeof Colors.light;
  isDark: boolean;
}) {
  const [policyName, setPolicyName] = useState(record?.policy_name ?? '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latest, setLatest] = useState<{
    verdict: 'PASS' | 'REVIEW' | 'FAIL';
    headline: string;
    checks: Check[];
  } | null>(null);

  const verified = record?.verified === true;
  const pending = record?.verified_by === 'pending';

  async function handlePickAndUpload() {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];

    setUploading(true);
    setError(null);
    setLatest(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Sign in to verify insurance');

      const form = new FormData();
      // RN FormData accepts { uri, name, type }
      form.append('file', {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? 'application/pdf',
      } as any);
      form.append('profile_type', profileType);
      form.append('kind', kind);
      if (policyName.trim()) form.append('policy_name', policyName.trim());
      if (abnEntityName) form.append('abn_entity_name', abnEntityName);

      const upload = await fetch(`${API_BASE_URL}/api/verify-insurance`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Client': 'mobile',
          Accept: 'application/json',
        },
        body: form,
      });
      const data = await upload.json();

      if (!upload.ok) {
        setError(data?.error ?? 'Upload failed');
        return;
      }

      const merged: CredentialsVerified = {
        ...(credentials ?? {}),
        insurance: {
          ...(credentials?.insurance ?? {}),
          [kind]: data.certificate ?? data.insurance?.[kind] ?? null,
        } as CredentialsVerified['insurance'],
      };
      await onUpdated(merged);

      const verdict: 'PASS' | 'REVIEW' | 'FAIL' =
        (data.verdict as any) ?? (data.auto_approved ? 'PASS' : 'REVIEW');
      const insurer = data.extracted?.insurer_name ?? 'Insurer';
      const coverage = data.extracted?.coverage_amount ?? 'coverage';
      const expiry = data.extracted?.expiry_date ?? 'unknown';
      const headline =
        verdict === 'PASS'
          ? `Verified — ${insurer}, ${coverage}, expires ${expiry}`
          : verdict === 'REVIEW'
            ? 'Uploaded — flagged for admin review'
            : "Couldn't verify this certificate";

      setLatest({
        verdict,
        headline,
        checks: Array.isArray(data.checks) ? data.checks : [],
      });
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Try again later.');
    } finally {
      setUploading(false);
    }
  }

  const verdictMeta = latest
    ? verdictDisplay(latest.verdict, colors)
    : record?.verdict
      ? verdictDisplay(record.verdict, colors)
      : null;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border },
      ]}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[Type.bodySemiBold, { color: colors.text }]}>{KIND_LABEL[kind]}</Text>
          <Text style={[Type.caption, { color: colors.textSecondary }]}>{KIND_HINT[kind]}</Text>
        </View>
        {verified ? (
          <View style={[styles.statusPill, { backgroundColor: colors.successLight }]}>
            <MaterialIcons name="verified" size={14} color={colors.success} />
            <Text style={[styles.statusPillText, { color: colors.success }]}>Verified</Text>
          </View>
        ) : pending ? (
          <View
            style={[styles.statusPill, { backgroundColor: colors.warningLight ?? '#fef3c7' }]}
          >
            <MaterialIcons name="schedule" size={14} color={colors.warning ?? '#d97706'} />
            <Text style={[styles.statusPillText, { color: colors.warning ?? '#d97706' }]}>
              Pending
            </Text>
          </View>
        ) : null}
      </View>

      {/* Existing record summary */}
      {record && (record.insurer_name || record.policy_number || record.coverage_amount) ? (
        <View
          style={[
            styles.recordBox,
            { backgroundColor: colors.canvas, borderColor: colors.border },
          ]}
        >
          {record.insurer_name ? (
            <Text style={[Type.caption, { color: colors.text }]}>
              <Text style={{ color: colors.textSecondary }}>Insurer: </Text>
              {record.insurer_name}
            </Text>
          ) : null}
          {record.policy_number ? (
            <Text style={[Type.caption, { color: colors.text }]}>
              <Text style={{ color: colors.textSecondary }}>Policy: </Text>
              {record.policy_number}
            </Text>
          ) : null}
          {record.coverage_amount ? (
            <Text style={[Type.caption, { color: colors.text }]}>
              <Text style={{ color: colors.textSecondary }}>Coverage: </Text>
              {record.coverage_amount}
            </Text>
          ) : null}
          {record.expiry_date ? (
            <Text style={[Type.caption, { color: colors.text }]}>
              <Text style={{ color: colors.textSecondary }}>Expires: </Text>
              {record.expiry_date}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Policy name input */}
      <View>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Policy name <Text style={{ color: colors.textSecondary }}>(optional)</Text>
        </Text>
        <TextInput
          value={policyName}
          onChangeText={setPolicyName}
          placeholder={KIND_PLACEHOLDER[kind]}
          placeholderTextColor={colors.textSecondary}
          maxLength={120}
          style={[
            styles.input,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
        />
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Typing the product name (e.g. "Public Liability $20M") helps our AI find the right section if your certificate covers multiple policies.
        </Text>
      </View>

      {/* Upload */}
      <Pressable
        onPress={handlePickAndUpload}
        disabled={uploading}
        style={[
          styles.uploadBtn,
          {
            borderColor: colors.teal,
            opacity: uploading ? 0.6 : 1,
          },
        ]}
      >
        {uploading ? (
          <ActivityIndicator color={colors.teal} />
        ) : (
          <Text style={[styles.uploadBtnText, { color: colors.teal }]}>
            {record?.document_path ? 'Re-upload certificate' : 'Upload certificate'}
          </Text>
        )}
      </Pressable>

      {error ? (
        <View
          style={[
            styles.errorBox,
            { backgroundColor: colors.errorLight, borderColor: colors.error },
          ]}
        >
          <Text style={[Type.caption, { color: colors.error }]}>{error}</Text>
        </View>
      ) : null}

      {/* Verdict + checks */}
      {verdictMeta && latest ? (
        <View
          style={[
            styles.verdictBox,
            { backgroundColor: verdictMeta.bg, borderColor: verdictMeta.text },
          ]}
        >
          <View style={styles.verdictHeader}>
            <MaterialIcons name={verdictMeta.icon as any} size={18} color={verdictMeta.text} />
            <Text style={[Type.bodySemiBold, { color: verdictMeta.text, flex: 1 }]}>
              {verdictMeta.label}
            </Text>
          </View>
          <Text style={[Type.caption, { color: colors.text }]}>{latest.headline}</Text>
          {latest.checks.length > 0 ? (
            <View style={styles.checks}>
              {latest.checks.map((check) => (
                <View key={check.id} style={styles.checkRow}>
                  <MaterialIcons
                    name={
                      check.status === 'ok'
                        ? 'check-circle'
                        : check.status === 'warn'
                          ? 'warning'
                          : 'cancel'
                    }
                    size={14}
                    color={
                      check.status === 'ok'
                        ? colors.success
                        : check.status === 'warn'
                          ? colors.warning ?? '#d97706'
                          : colors.error
                    }
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[Type.caption, { color: colors.text }]}>{check.label}</Text>
                    {check.detail ? (
                      <Text style={[styles.checkDetail, { color: colors.textSecondary }]}>
                        {check.detail}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function verdictDisplay(
  verdict: 'PASS' | 'REVIEW' | 'FAIL',
  colors: typeof Colors.light,
) {
  switch (verdict) {
    case 'PASS':
      return { bg: colors.successLight, text: colors.success, label: 'Verified', icon: 'check-circle' };
    case 'REVIEW':
      return {
        bg: colors.warningLight ?? '#fef3c7',
        text: colors.warning ?? '#d97706',
        label: 'Under review',
        icon: 'schedule',
      };
    case 'FAIL':
      return { bg: colors.errorLight, text: colors.error, label: 'Rejected', icon: 'cancel' };
  }
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusPillText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  recordBox: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
  },
  hint: { fontSize: 11, lineHeight: 15, marginTop: 4 },
  uploadBtn: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  uploadBtnText: { fontSize: 14, fontWeight: '700' },
  errorBox: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
  },
  verdictBox: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: 6,
  },
  verdictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checks: { gap: 6, marginTop: 4 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  checkDetail: { fontSize: 11, lineHeight: 15, marginTop: 1 },
  addRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  addChipText: { fontSize: 12, fontWeight: '700' },
});
