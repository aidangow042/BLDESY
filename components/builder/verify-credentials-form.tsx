/**
 * Credential verification form — ABN + licence verification.
 * Calls the verify-credentials Supabase Edge Function.
 */
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { CredentialBadges } from './credential-badges';

type Props = {
  tradeCategory: string;
  existingCredentials?: any;
  onVerified?: (credentials: any) => void;
};

const AU_STATES = ['NSW', 'QLD', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT'];

export function VerifyCredentialsForm({ tradeCategory, existingCredentials, onVerified }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const [abn, setAbn] = useState('');
  const [licenceNumber, setLicenceNumber] = useState('');
  const [state, setState] = useState(existingCredentials?.state || 'NSW');
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState(existingCredentials || null);
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  async function handleVerify() {
    if (!abn && !licenceNumber) {
      Alert.alert('Enter credentials', 'Provide your ABN or licence number to verify.');
      return;
    }

    setLoading(true);
    setResultMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'You must be logged in to verify credentials.');
        setLoading(false);
        return;
      }

      const res = await supabase.functions.invoke('verify-credentials', {
        body: {
          abn: abn || undefined,
          licence_number: licenceNumber || undefined,
          state,
          trade_category: tradeCategory,
          existing_credentials: credentials,
        },
      });

      if (res.error) {
        setResultMessage({ type: 'error', text: res.error.message || 'Verification failed' });
        setLoading(false);
        return;
      }

      const result = res.data;

      if (result.errors?.length > 0) {
        setResultMessage({
          type: result.abn_verified || result.licence_verified ? 'warning' : 'error',
          text: result.errors.join('\n'),
        });
      } else if (result.abn_verified || result.licence_verified) {
        setResultMessage({ type: 'success', text: 'Credentials verified successfully!' });
      }

      if (result.credentials_verified) {
        setCredentials(result.credentials_verified);
        onVerified?.(result.credentials_verified);
      }
    } catch (err) {
      setResultMessage({ type: 'error', text: 'Network error — check your connection and try again.' });
    }

    setLoading(false);
  }

  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC';
  const inputBorder = isDark ? colors.border : '#E2E8F0';

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Verify Your Credentials</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
        Verified tradies get more enquiries. Verify your ABN and licence to earn trust badges.
      </Text>

      {/* Existing badges */}
      {credentials && (
        <View style={styles.badgesWrap}>
          <CredentialBadges credentials={credentials} variant="list" />
        </View>
      )}

      {/* State selector */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>State</Text>
      <View style={styles.stateRow}>
        {AU_STATES.slice(0, 4).map((s) => (
          <Pressable
            key={s}
            style={[
              styles.stateChip,
              {
                backgroundColor: state === s ? colors.teal : isDark ? colors.surface : '#F1F5F9',
                borderColor: state === s ? colors.teal : inputBorder,
              },
            ]}
            onPress={() => setState(s)}
          >
            <Text style={[styles.stateChipText, { color: state === s ? '#fff' : colors.text }]}>
              {s}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ABN input */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>ABN</Text>
      <TextInput
        style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]}
        value={abn}
        onChangeText={setAbn}
        placeholder="e.g. 51 824 753 556"
        placeholderTextColor={colors.textSecondary}
        keyboardType="number-pad"
        maxLength={14}
      />
      {credentials?.abn?.verified && (
        <View style={styles.verifiedRow}>
          <MaterialIcons name="check-circle" size={16} color={colors.success} />
          <Text style={[styles.verifiedText, { color: colors.success }]}>
            {credentials.abn.entity_name}
          </Text>
        </View>
      )}

      {/* Licence input */}
      <Text style={[styles.label, { color: colors.textSecondary, marginTop: Spacing.md }]}>
        Licence Number
      </Text>
      <TextInput
        style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]}
        value={licenceNumber}
        onChangeText={setLicenceNumber}
        placeholder="Enter your licence number"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="characters"
      />

      {/* Result message */}
      {resultMessage && (
        <View
          style={[
            styles.resultBox,
            {
              backgroundColor:
                resultMessage.type === 'success' ? colors.successLight
                : resultMessage.type === 'warning' ? colors.warningLight
                : colors.errorLight,
            },
          ]}
        >
          <MaterialIcons
            name={resultMessage.type === 'success' ? 'check-circle' : resultMessage.type === 'warning' ? 'warning' : 'error'}
            size={18}
            color={resultMessage.type === 'success' ? colors.success : resultMessage.type === 'warning' ? colors.warning : colors.error}
          />
          <Text
            style={[
              styles.resultText,
              {
                color: resultMessage.type === 'success' ? colors.success
                  : resultMessage.type === 'warning' ? colors.warning
                  : colors.error,
              },
            ]}
          >
            {resultMessage.text}
          </Text>
        </View>
      )}

      {/* Verify button */}
      <Pressable
        style={[styles.verifyBtn, { backgroundColor: colors.teal, opacity: loading ? 0.7 : 1 }]}
        onPress={handleVerify}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <MaterialIcons name="verified" size={20} color="#fff" />
            <Text style={styles.verifyBtnText}>Verify Credentials</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Type.h2,
  },
  sectionSubtitle: {
    ...Type.body,
    marginBottom: Spacing.sm,
  },
  badgesWrap: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Type.captionSemiBold,
    marginBottom: 4,
  },
  stateRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  stateChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  stateChipText: {
    ...Type.captionSemiBold,
  },
  input: {
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  verifiedText: {
    ...Type.caption,
    fontWeight: '600',
  },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
  },
  resultText: {
    ...Type.body,
    flex: 1,
  },
  verifyBtn: {
    flexDirection: 'row',
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  verifyBtnText: {
    color: '#fff',
    ...Type.btnPrimary,
  },
});
