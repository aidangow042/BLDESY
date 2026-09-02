/**
 * Popup trust profile a tradie sees when tapping "View profile" on a customer
 * in messages — port of ~/bldesy-web/components/messages/customer-profile-modal.tsx.
 * Data comes from /api/customers/[id]/profile (lib/data/customers.ts), which
 * RLS gates to an active job or shared conversation. Trust signals are limited
 * to what BLDESY can actually vouch for: verified contact details and account
 * age — deliberately no completed-jobs metric.
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  getCustomerProfile,
  HOMEOWNER_LABELS,
  PROPERTY_LABELS,
  type CustomerPublicProfile,
} from '@/lib/data/customers';

/** Tailwind amber-500 → orange-500 — the customer identity band. */
const AMBER_BAND: [string, string] = ['#f59e0b', '#f97316'];
const AMBER_TEXT = { light: '#b45309', dark: '#fbbf24' } as const;

interface Props {
  visible: boolean;
  customerId: string;
  customerName: string;
  onClose: () => void;
}

export function CustomerProfileModal({ visible, customerId, customerName, onClose }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const amberText = AMBER_TEXT[scheme];
  const [profile, setProfile] = useState<CustomerPublicProfile | null>(null);
  const [state, setState] = useState<'loading' | 'loaded' | 'none'>('loading');

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setState('loading');
    setProfile(null);
    getCustomerProfile(customerId)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setState('none');
          return;
        }
        setProfile(data);
        setState('loaded');
      })
      .catch(() => {
        if (!cancelled) setState('none');
      });
    return () => {
      cancelled = true;
    };
  }, [visible, customerId]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Close">
        <Pressable
          style={[styles.card, Shadows.xl, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={() => {}}
          accessibilityViewIsModal
          accessibilityLabel={`${customerName}'s profile`}
        >
          <LinearGradient colors={AMBER_BAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.band} />
          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <MaterialIcons name="close" size={20} color="#fff" />
          </Pressable>

          {state === 'loading' ? (
            <View style={styles.loading}>
              <ActivityIndicator color={AMBER_BAND[0]} />
            </View>
          ) : null}

          {state === 'none' ? (
            <View style={styles.body}>
              <LinearGradient colors={AMBER_BAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.avatar, { borderColor: c.surface }]}>
                <Text style={styles.avatarInitial}>{(customerName[0] ?? '?').toUpperCase()}</Text>
              </LinearGradient>
              <Text style={[styles.name, { color: c.textPrimary }]}>{customerName}</Text>
              <Text style={[styles.muted, { color: c.textSecondary }]}>Hasn&apos;t set up a profile yet.</Text>
            </View>
          ) : null}

          {state === 'loaded' && profile ? (
            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
              <LinearGradient colors={AMBER_BAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.avatar, { borderColor: c.surface }]}>
                {profile.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    accessibilityLabel={`${profile.first_name}'s avatar`}
                    contentFit="cover"
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarInitial}>{(profile.first_name[0] ?? '?').toUpperCase()}</Text>
                )}
              </LinearGradient>

              <Text style={[styles.name, { color: c.textPrimary }]}>{profile.first_name}</Text>
              <View style={styles.suburbRow}>
                <MaterialIcons name="location-on" size={14} color={c.textSecondary} />
                <Text style={[styles.muted, { color: c.textSecondary }]}>{profile.suburb}</Text>
              </View>

              <View style={styles.chips}>
                <View style={[styles.chip, { backgroundColor: AMBER_BAND[0] + '1A' }]}>
                  <Text style={[styles.chipText, { color: amberText }]}>
                    {HOMEOWNER_LABELS[profile.homeowner_type].toUpperCase()}
                  </Text>
                </View>
                <View style={[styles.chip, { backgroundColor: AMBER_BAND[0] + '1A' }]}>
                  <Text style={[styles.chipText, { color: amberText }]}>
                    {PROPERTY_LABELS[profile.property_type].toUpperCase()}
                  </Text>
                </View>
              </View>

              {profile.bio ? (
                <View style={[styles.bio, { backgroundColor: c.canvas }]}>
                  <Text style={[styles.bioText, { color: c.textPrimary }]}>{profile.bio}</Text>
                </View>
              ) : null}

              <View style={[styles.trust, { backgroundColor: c.canvas, borderColor: c.border }]}>
                <View style={styles.trustHeader}>
                  <MaterialIcons name="verified-user" size={16} color={c.success} />
                  <Text style={[styles.trustTitle, { color: c.textPrimary }]}>VERIFIED BY BLDESY</Text>
                </View>
                <View style={styles.trustRows}>
                  <TrustRow ok={profile.email_verified} okLabel="Email verified" missingLabel="Email not verified" />
                  <TrustRow ok={profile.phone_verified} okLabel="Mobile verified" missingLabel="Mobile not verified" />
                  <View style={styles.trustRow}>
                    <View style={[styles.trustIcon, { backgroundColor: AMBER_BAND[0] + '1A' }]}>
                      <MaterialIcons name="schedule" size={12} color={amberText} />
                    </View>
                    <Text style={[styles.trustText, { color: c.textPrimary }]}>
                      Member since{' '}
                      {new Date(profile.member_since).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TrustRow({ ok, okLabel, missingLabel }: { ok: boolean; okLabel: string; missingLabel: string }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  if (!ok) {
    return (
      <View style={styles.trustRow}>
        <View style={[styles.trustIcon, { backgroundColor: c.border + '80' }]}>
          <MaterialIcons name="remove" size={12} color={c.textSecondary} />
        </View>
        <Text style={[styles.trustText, { color: c.textSecondary }]}>{missingLabel}</Text>
      </View>
    );
  }
  return (
    <View style={styles.trustRow}>
      <View style={[styles.trustIcon, { backgroundColor: c.successBg }]}>
        <MaterialIcons name="check" size={12} color={c.success} />
      </View>
      <Text style={[styles.trustText, { color: c.textPrimary }]}>{okLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: { width: '100%', maxWidth: 384, maxHeight: '85%', borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden' },
  band: { height: 80 },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: { paddingVertical: Spacing['6xl'], alignItems: 'center' },
  body: { paddingHorizontal: Spacing['2xl'], paddingBottom: Spacing['2xl'], alignItems: 'center' },
  avatar: {
    marginTop: -40,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 72, height: 72, borderRadius: 36 },
  avatarInitial: { color: '#fff', fontSize: 24, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  name: { marginTop: Spacing.md, fontSize: 18, lineHeight: 28, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  muted: { fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body, textAlign: 'center' },
  suburbRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.md },
  chip: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 2 },
  chipText: { fontSize: 11, fontFamily: FontFamily.bodyBold, fontWeight: '700', letterSpacing: 0.5 },
  bio: { alignSelf: 'stretch', marginTop: Spacing.lg, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  bioText: { fontSize: 14, lineHeight: 22, fontFamily: FontFamily.body },
  trust: { alignSelf: 'stretch', marginTop: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.lg },
  trustHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.md },
  trustTitle: { fontSize: 11, fontFamily: FontFamily.bodyBold, fontWeight: '700', letterSpacing: 1 },
  trustRows: { gap: Spacing.sm },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  trustIcon: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  trustText: { fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body },
});
