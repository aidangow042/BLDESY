/**
 * Real dashboard data — replaces mock data with Supabase queries.
 * Falls back gracefully when tables are empty.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

// ── Types (same shape as previous mocks) ─────────────────────────────────────

export type MetricData = {
  value: number;
  change: number;
  label: string;
  icon: string;
};

export type ActivityEvent = {
  id: string;
  type: 'view' | 'save' | 'quote' | 'review' | 'application_viewed' | 'application_rejected';
  text: string;
  timestamp: string;
  actionLabel?: string;
  rating?: number;
};

export type HealthTip = {
  text: string;
  points: number;
  section: string;
};

export type SubscriptionData = {
  plan: 'Free' | 'Pro' | 'Premium';
  price: string;
  renewalDate: string;
  status: 'active' | 'trial' | 'expired';
};

export type NotificationItem = {
  id: string;
  type: 'view' | 'save' | 'quote' | 'review' | 'system';
  text: string;
  timestamp: string;
  read: boolean;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

const TIER_MAP: Record<string, { plan: SubscriptionData['plan']; price: string }> = {
  free: { plan: 'Free', price: '$0/month' },
  standard: { plan: 'Pro', price: '$49/month' },
  premium: { plan: 'Premium', price: '$99/month' },
};

// ── Data Hooks ───────────────────────────────────────────────────────────────

export function useDashboardMetrics(userId: string | null) {
  const [metrics, setMetrics] = useState<{
    profileViews: MetricData;
    saves: MetricData;
    applications: MetricData;
  }>({
    profileViews: { value: 0, change: 0, label: 'Profile Views', icon: 'eye-outline' },
    saves: { value: 0, change: 0, label: 'Profile Saves', icon: 'bookmark-outline' },
    applications: { value: 0, change: 0, label: 'Applications', icon: 'mail-outline' },
  });
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) return;

    // Get builder profile ID
    const { data: bp } = await supabase
      .from('builder_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!bp) { setLoading(false); return; }

    const now = Date.now();
    const thirtyDaysAgo = new Date(now - 30 * 86_400_000).toISOString();
    const sixtyDaysAgo = new Date(now - 60 * 86_400_000).toISOString();

    // Parallel: current period + previous period for change %
    const [savesNow, savesPrev, appsNow, appsPrev] = await Promise.all([
      supabase.from('saved_builders').select('id', { count: 'exact', head: true }).eq('builder_id', bp.id).gte('created_at', thirtyDaysAgo),
      supabase.from('saved_builders').select('id', { count: 'exact', head: true }).eq('builder_id', bp.id).gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo),
      supabase.from('applications').select('id', { count: 'exact', head: true }).eq('builder_id', userId).gte('created_at', thirtyDaysAgo),
      supabase.from('applications').select('id', { count: 'exact', head: true }).eq('builder_id', userId).gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo),
    ]);

    const savesCount = savesNow.count ?? 0;
    const savesPrevCount = savesPrev.count ?? 0;
    const appsCount = appsNow.count ?? 0;
    const appsPrevCount = appsPrev.count ?? 0;

    function pctChange(curr: number, prev: number): number {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    }

    setMetrics({
      profileViews: { value: 0, change: 0, label: 'Profile Views', icon: 'eye-outline' },
      saves: { value: savesCount, change: pctChange(savesCount, savesPrevCount), label: 'Profile Saves', icon: 'bookmark-outline' },
      applications: { value: appsCount, change: pctChange(appsCount, appsPrevCount), label: 'Applications', icon: 'mail-outline' },
    });
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { metrics, loading, refresh: fetch };
}

/**
 * Application status breakdown — for the dashboard chart + acceptance
 * rate metric. Mirrors the website's portal page analytics.
 */
export type ApplicationBreakdown = {
  accepted: number;
  pending: number;
  rejected: number;
  total: number;
  acceptanceRate: number;
};

export function useApplicationBreakdown(userId: string | null) {
  const [data, setData] = useState<ApplicationBreakdown>({
    accepted: 0,
    pending: 0,
    rejected: 0,
    total: 0,
    acceptanceRate: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const { data: apps, error } = await supabase
      .from('applications')
      .select('status')
      .eq('builder_id', userId);
    if (error || !apps) {
      setLoading(false);
      return;
    }
    let accepted = 0;
    let pending = 0;
    let rejected = 0;
    for (const a of apps as { status: string | null }[]) {
      if (a.status === 'accepted') accepted += 1;
      else if (a.status === 'rejected') rejected += 1;
      else pending += 1;
    }
    const total = accepted + pending + rejected;
    const resolved = accepted + rejected;
    const acceptanceRate = resolved === 0 ? 0 : Math.round((accepted / resolved) * 100);
    setData({ accepted, pending, rejected, total, acceptanceRate });
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...data, loading, refresh: fetch };
}

export function useDashboardActivity(userId: string | null) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) return;

    // Recent applications to this builder's jobs + their own applications
    const { data: apps } = await supabase
      .from('applications')
      .select('id, status, created_at, job_id, jobs!inner(title)')
      .eq('builder_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    const activity: ActivityEvent[] = (apps || []).map((a: any) => {
      const title = a.jobs?.title || 'a job';
      if (a.status === 'accepted') {
        return {
          id: a.id,
          type: 'quote' as const,
          text: `Application accepted for "${title}"`,
          timestamp: relativeTime(a.created_at),
        };
      }
      if (a.status === 'rejected') {
        return {
          id: a.id,
          type: 'application_rejected' as const,
          text: `Application rejected for "${title}"`,
          timestamp: relativeTime(a.created_at),
        };
      }
      return {
        id: a.id,
        type: 'application_viewed' as const,
        text: `Applied to "${title}"`,
        timestamp: relativeTime(a.created_at),
        actionLabel: 'View',
      };
    });

    setEvents(activity);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { events, loading, refresh: fetch };
}

export function useDashboardSubscription(userId: string | null) {
  const [subscription, setSubscription] = useState<SubscriptionData>({
    plan: 'Free', price: '$0/month', renewalDate: '', status: 'active',
  });

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from('builder_profiles')
        .select('subscription_tier')
        .eq('user_id', userId)
        .single();

      const tier = data?.subscription_tier || 'free';
      const mapped = TIER_MAP[tier] || TIER_MAP.free;
      setSubscription({
        ...mapped,
        renewalDate: tier === 'free' ? '' : 'Managed via Stripe',
        status: 'active',
      });
    })();
  }, [userId]);

  return subscription;
}

export function useDashboardNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id, type, title, body, read, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      setNotifications((data || []).map((n: any) => ({
        id: n.id,
        type: (n.type || 'system') as NotificationItem['type'],
        text: n.body || n.title || '',
        timestamp: relativeTime(n.created_at),
        read: n.read ?? false,
      })));
    })();
  }, [userId]);

  return { notifications, setNotifications };
}

export function computeHealthTips(profile: any): HealthTip[] {
  const tips: HealthTip[] = [];
  if (!profile) return tips;

  if (!profile.bio || profile.bio.length < 50)
    tips.push({ text: 'Write a longer About section', points: 5, section: 'bio' });
  if (!Array.isArray(profile.projects) || profile.projects.length < 3)
    tips.push({ text: `Add ${3 - (profile.projects?.length || 0)} more project photos`, points: 10, section: 'projects' });
  if (!profile.abn)
    tips.push({ text: 'Verify your ABN', points: 10, section: 'credentials' });
  if (!profile.license_key)
    tips.push({ text: 'Add your licence number', points: 10, section: 'credentials' });
  if (!profile.website)
    tips.push({ text: 'Add your website URL', points: 5, section: 'bio' });
  if (!profile.cover_photo_url)
    tips.push({ text: 'Upload a cover photo', points: 5, section: 'photos' });

  return tips;
}

export function computeCoachTip(profile: any): string {
  if (!profile) return 'Complete your profile to start getting noticed by customers.';

  const projects = Array.isArray(profile.projects) ? profile.projects.length : 0;
  if (projects < 3) return `Builders with 5+ project photos get 3x more profile views. You have ${projects} — adding a few more could make a real difference.`;
  if (!profile.bio || profile.bio.length < 100) return 'A detailed About section helps customers trust you. Aim for at least 2-3 sentences about your experience and specialties.';
  if (!profile.abn) return 'Verify your ABN to get a verified badge — customers are 2x more likely to contact verified tradies.';

  return 'Your profile is looking good! Keep your projects up to date and respond to applications quickly to stay at the top.';
}
