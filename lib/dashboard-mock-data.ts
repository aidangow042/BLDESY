/**
 * Centralized mock data for the builder dashboard.
 * Replace with real Supabase queries when analytics tables exist.
 */

export type MetricData = {
  value: number;
  change: number; // percentage, positive = up, negative = down
  label: string;
  icon: string; // Ionicons name
};

export type CompetitorRankData = {
  rank: number;
  total: number;
  area: string;
};

export type ActivityEvent = {
  id: string;
  type: 'view' | 'save' | 'quote' | 'review' | 'application_viewed';
  text: string;
  timestamp: string;
  actionLabel?: string;
  rating?: number;
};

export type HealthTip = {
  text: string;
  points: number;
  section: string; // profile editor section to navigate to
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

// ── Metrics ──────────────────────────────────────────────────────────

export const mockMetrics: {
  profileViews: MetricData;
  quoteRequests: MetricData;
  searchAppearances: MetricData;
} = {
  profileViews: {
    value: 147,
    change: 12.5,
    label: 'Profile Views',
    icon: 'eye-outline',
  },
  quoteRequests: {
    value: 23,
    change: -3.2,
    label: 'Quote Requests',
    icon: 'mail-outline',
  },
  searchAppearances: {
    value: 892,
    change: 8.7,
    label: 'Search Appearances',
    icon: 'search-outline',
  },
};

export const mockCompetitorRank: CompetitorRankData = {
  rank: 4,
  total: 28,
  area: 'Sydney CBD',
};

// ── Activity Feed ────────────────────────────────────────────────────

export const mockActivityFeed: ActivityEvent[] = [
  {
    id: '1',
    type: 'quote',
    text: 'New quote request from Sarah M.',
    timestamp: '25 min ago',
    actionLabel: 'Reply',
  },
  {
    id: '2',
    type: 'review',
    text: 'New review from Mike D.',
    timestamp: '2 hours ago',
    actionLabel: 'View',
    rating: 5,
  },
  {
    id: '3',
    type: 'view',
    text: 'Someone viewed your profile',
    timestamp: '3 hours ago',
  },
  {
    id: '4',
    type: 'save',
    text: 'Someone saved your profile',
    timestamp: '5 hours ago',
  },
  {
    id: '5',
    type: 'view',
    text: 'Someone viewed your profile from Surry Hills',
    timestamp: '8 hours ago',
  },
  {
    id: '6',
    type: 'quote',
    text: 'New quote request from James T.',
    timestamp: '1 day ago',
    actionLabel: 'Reply',
  },
  {
    id: '7',
    type: 'application_viewed',
    text: 'Your application was viewed by a customer',
    timestamp: '1 day ago',
  },
  {
    id: '8',
    type: 'save',
    text: 'Someone saved your profile',
    timestamp: '2 days ago',
  },
];

// ── AI Coach ─────────────────────────────────────────────────────────

export const mockAICoachTip =
  'Builders with 5+ project photos get 3x more profile views. You have 2 — adding a few more could make a real difference.';

// ── Profile Health ───────────────────────────────────────────────────

export const mockHealthTips: HealthTip[] = [
  { text: 'Add 2 more project photos', points: 10, section: 'projects' },
  { text: 'Upload your insurance certificate', points: 5, section: 'credentials' },
  { text: 'Write a longer About section', points: 5, section: 'bio' },
];

// ── Subscription ─────────────────────────────────────────────────────

export const mockSubscription: SubscriptionData = {
  plan: 'Pro',
  price: '$49/month',
  renewalDate: '15 April 2026',
  status: 'active',
};

// ── Notifications ────────────────────────────────────────────────────

export const mockNotifications: NotificationItem[] = [
  { id: 'n1', type: 'quote', text: 'New quote request from Sarah M. for bathroom renovation', timestamp: '25 min ago', read: false },
  { id: 'n2', type: 'review', text: 'Mike D. left you a 5-star review', timestamp: '2 hours ago', read: false },
  { id: 'n3', type: 'view', text: 'Your profile was viewed 12 times today', timestamp: '4 hours ago', read: false },
  { id: 'n4', type: 'save', text: 'Someone saved your profile from Newtown search', timestamp: '5 hours ago', read: true },
  { id: 'n5', type: 'system', text: 'Your Pro subscription renews in 7 days', timestamp: '1 day ago', read: true },
  { id: 'n6', type: 'quote', text: 'Quote request from James T. for kitchen reno', timestamp: '1 day ago', read: true },
  { id: 'n7', type: 'view', text: 'Your profile was viewed 8 times yesterday', timestamp: '2 days ago', read: true },
];
