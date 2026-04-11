/**
 * Admin panel — review and approve/reject builder and enterprise applications.
 * Only accessible to users with is_admin = true on their profile.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, Radius, Spacing, Shadows, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/page-header';

type Tab = 'pending' | 'approved' | 'rejected';
type AppType = 'builder' | 'enterprise';

type Application = {
  id: string;
  user_id: string;
  name: string;
  trade_or_company: string;
  suburb: string;
  abn: string | null;
  status: string;
  type: AppType;
  created_at: string;
};

export default function AdminScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('pending');
  const [appType, setAppType] = useState<AppType>('builder');
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Check admin access
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsAdmin(false); return; }
      const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
      setIsAdmin(!!(data as any)?.is_admin);
    })();
  }, []);

  const loadApplications = useCallback(async () => {
    setLoading(true);

    const statusMap: Record<Tab, string[]> = {
      pending: ['pending_review'],
      approved: ['approved', 'active'],
      rejected: ['rejected'],
    };

    if (appType === 'builder') {
      const { data } = await supabase
        .from('builder_profiles')
        .select('id, user_id, business_name, trade_category, suburb, abn, approved, created_at')
        .in('approved', tab === 'pending' ? [false] : [true])
        .order('created_at', { ascending: false })
        .limit(50);

      setApplications((data ?? []).map((b: any) => ({
        id: b.id,
        user_id: b.user_id,
        name: b.business_name,
        trade_or_company: b.trade_category,
        suburb: b.suburb,
        abn: b.abn,
        status: b.approved ? 'approved' : 'pending',
        type: 'builder' as const,
        created_at: b.created_at,
      })));
    } else {
      const { data } = await supabase
        .from('enterprise_profiles')
        .select('id, user_id, company_name, industry_focus, suburb, abn, status, created_at')
        .in('status', statusMap[tab])
        .order('created_at', { ascending: false })
        .limit(50);

      setApplications((data ?? []).map((e: any) => ({
        id: e.id,
        user_id: e.user_id,
        name: e.company_name,
        trade_or_company: e.industry_focus || 'Enterprise',
        suburb: e.suburb,
        abn: e.abn,
        status: e.status,
        type: 'enterprise' as const,
        created_at: e.created_at,
      })));
    }

    setLoading(false);
  }, [tab, appType]);

  useEffect(() => {
    if (isAdmin) loadApplications();
  }, [isAdmin, loadApplications]);

  async function handleApprove(app: Application) {
    setActionId(app.id);
    if (app.type === 'builder') {
      const { error } = await supabase.rpc('admin_set_builder_approved', { p_builder_id: app.id, p_approved: true });
      if (error) { Alert.alert('Error', error.message); setActionId(null); return; }
    } else {
      const { error } = await supabase.rpc('admin_set_enterprise_status', { p_enterprise_id: app.id, p_status: 'approved' });
      if (error) { Alert.alert('Error', error.message); setActionId(null); return; }
    }
    setActionId(null);
    loadApplications();
    Alert.alert('Approved', `${app.name} has been approved.`);
  }

  async function handleReject(app: Application) {
    setActionId(app.id);
    if (app.type === 'builder') {
      const { error } = await supabase.rpc('admin_set_builder_approved', { p_builder_id: app.id, p_approved: false });
      if (error) { Alert.alert('Error', error.message); setActionId(null); return; }
    } else {
      const { error } = await supabase.rpc('admin_set_enterprise_status', {
        p_enterprise_id: app.id,
        p_status: 'rejected',
        p_rejection_reason: rejectReason || null,
      });
      if (error) { Alert.alert('Error', error.message); setActionId(null); return; }
    }
    setActionId(null);
    setRejectingId(null);
    setRejectReason('');
    loadApplications();
    Alert.alert('Rejected', `${app.name} has been rejected.`);
  }

  if (isAdmin === null) {
    return <View style={[styles.container, { backgroundColor: colors.canvas }]}><ActivityIndicator color={colors.teal} style={{ marginTop: 100 }} /></View>;
  }

  if (!isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: colors.canvas }]}>
        <PageHeader title="Admin" subtitle="Access restricted" />
        <View style={styles.denied}>
          <MaterialIcons name="lock" size={48} color={colors.textSecondary} />
          <Text style={[Type.h2, { color: colors.text, textAlign: 'center' }]}>Access Denied</Text>
          <Text style={[Type.body, { color: colors.textSecondary, textAlign: 'center' }]}>You don't have admin privileges.</Text>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { borderColor: colors.border }]}>
            <Text style={[Type.btnSecondary, { color: colors.text }]}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function renderItem({ item }: { item: Application }) {
    const isActioning = actionId === item.id;
    const isRejecting = rejectingId === item.id;

    return (
      <View style={[styles.card, { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
              {item.trade_or_company} — {item.suburb}
            </Text>
            {item.abn && <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>ABN: {item.abn}</Text>}
          </View>
          <View style={[styles.typeBadge, { backgroundColor: item.type === 'builder' ? colors.tealBg : (isDark ? '#1e1b4b' : '#eef2ff') }]}>
            <Text style={[styles.typeText, { color: item.type === 'builder' ? colors.teal : (isDark ? '#818cf8' : '#4f46e5') }]}>
              {item.type === 'builder' ? 'Builder' : 'Enterprise'}
            </Text>
          </View>
        </View>

        <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
          Applied {new Date(item.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>

        {tab === 'pending' && !isRejecting && (
          <View style={styles.actions}>
            <Pressable
              style={[styles.approveBtn, { backgroundColor: colors.teal, opacity: isActioning ? 0.7 : 1 }]}
              onPress={() => handleApprove(item)}
              disabled={isActioning}
            >
              {isActioning ? <ActivityIndicator color="#fff" size="small" /> : (
                <><Ionicons name="checkmark" size={16} color="#fff" /><Text style={styles.approveBtnText}>Approve</Text></>
              )}
            </Pressable>
            <Pressable
              style={[styles.rejectBtn, { borderColor: colors.error }]}
              onPress={() => setRejectingId(item.id)}
            >
              <Ionicons name="close" size={16} color={colors.error} />
              <Text style={[styles.rejectBtnText, { color: colors.error }]}>Reject</Text>
            </Pressable>
          </View>
        )}

        {isRejecting && (
          <View style={styles.rejectForm}>
            <TextInput
              style={[styles.rejectInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', borderColor: colors.border, color: colors.text }]}
              placeholder="Reason for rejection (optional)"
              placeholderTextColor={colors.textSecondary}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <View style={styles.rejectActions}>
              <Pressable style={[styles.cancelRejectBtn, { borderColor: colors.border }]} onPress={() => { setRejectingId(null); setRejectReason(''); }}>
                <Text style={[styles.cancelRejectText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmRejectBtn, { backgroundColor: colors.error, opacity: isActioning ? 0.7 : 1 }]}
                onPress={() => handleReject(item)}
                disabled={isActioning}
              >
                <Text style={styles.confirmRejectText}>Confirm Reject</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <PageHeader title="Admin Panel" subtitle={`${applications.length} applications`} />

      {/* Type toggle */}
      <View style={[styles.typeToggle, { backgroundColor: isDark ? colors.surface : '#f1f5f9' }]}>
        {(['builder', 'enterprise'] as AppType[]).map(t => (
          <Pressable key={t} style={[styles.typeBtn, appType === t && { backgroundColor: isDark ? colors.teal : '#fff' }]} onPress={() => setAppType(t)}>
            <Text style={[styles.typeBtnText, { color: appType === t ? (isDark ? '#fff' : colors.text) : colors.textSecondary }]}>
              {t === 'builder' ? 'Builders' : 'Enterprise'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Tab bar */}
      <View style={styles.tabs}>
        {(['pending', 'approved', 'rejected'] as Tab[]).map(t => (
          <Pressable key={t} style={[styles.tab, tab === t && { borderBottomColor: colors.teal, borderBottomWidth: 2 }]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, { color: tab === t ? colors.teal : colors.textSecondary }]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={applications}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={async () => { setRefreshing(true); await loadApplications(); setRefreshing(false); }}
        contentContainerStyle={applications.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          loading ? <ActivityIndicator color={colors.teal} style={{ marginTop: 40 }} /> : (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} />
              <Text style={[Type.body, { color: colors.textSecondary }]}>No {tab} applications</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  denied: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, padding: Spacing['3xl'] },
  backBtn: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, marginTop: Spacing.sm },
  typeToggle: { flexDirection: 'row', marginHorizontal: Spacing.xl, marginTop: Spacing.md, borderRadius: Radius.md, padding: 3 },
  typeBtn: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.sm },
  typeBtnText: { ...Type.captionSemiBold },
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing.xl, marginTop: Spacing.md, gap: Spacing.lg },
  tab: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs },
  tabText: { ...Type.bodySemiBold },
  list: { padding: Spacing.xl, gap: Spacing.md },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', gap: Spacing.md, padding: Spacing['3xl'] },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.sm, ...Shadows.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  cardName: { ...Type.bodySemiBold },
  cardMeta: { ...Type.caption },
  cardDate: { ...Type.micro },
  typeBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.sm },
  typeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  approveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.md },
  approveBtnText: { color: '#fff', ...Type.captionSemiBold },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1 },
  rejectBtnText: { ...Type.captionSemiBold },
  rejectForm: { gap: Spacing.sm, marginTop: Spacing.xs },
  rejectInput: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, minHeight: 60, fontSize: 14 },
  rejectActions: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'flex-end' },
  cancelRejectBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1 },
  cancelRejectText: { ...Type.captionSemiBold },
  confirmRejectBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md },
  confirmRejectText: { color: '#fff', ...Type.captionSemiBold },
});
