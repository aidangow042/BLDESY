import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from './api';
import { useUser } from './auth-context';
import type { TradieTierKey, EnterpriseTierKey, BillingInterval } from './pricing-tiers-client';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | null;

export interface PaymentMethod {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

export interface Invoice {
  amount: number;
  currency: string;
  status: string;
  date: number;
  period_start: number;
  period_end: number;
  invoice_url: string;
}

export interface SubscriptionState {
  status: SubscriptionStatus;
  tier: TradieTierKey | EnterpriseTierKey | null;
  interval: BillingInterval | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: number | null;
  paymentMethod: PaymentMethod | null;
  invoices: Invoice[];
  raw?: unknown;
}

interface TradieBillingResponse {
  paymentMethod: PaymentMethod | null;
  invoices: Invoice[];
  subscription: {
    status: SubscriptionStatus;
    current_period_start?: number;
    current_period_end?: number;
    cancel_at_period_end?: boolean;
    canceled_at?: number | null;
    tier?: TradieTierKey;
    interval?: BillingInterval;
  } | null;
}

interface EnterpriseStateResponse {
  subscription: {
    id: string;
    status: SubscriptionStatus;
    cancel_at_period_end?: boolean;
    cancel_at?: number | null;
    current_period_end?: number;
    tier?: EnterpriseTierKey;
    interval?: BillingInterval;
  } | null;
  paymentMethod: PaymentMethod | null;
}

const DEFAULT_STATE: SubscriptionState = {
  status: null,
  tier: null,
  interval: null,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  paymentMethod: null,
  invoices: [],
};

interface CacheEntry {
  fetchedAt: number;
  state: SubscriptionState;
}

const CACHE_TTL = 60_000;
const tradieCache = new Map<string, CacheEntry>();
const enterpriseCache = new Map<string, CacheEntry>();

export function invalidateSubscriptionCache(userId?: string) {
  if (userId) {
    tradieCache.delete(userId);
    enterpriseCache.delete(userId);
  } else {
    tradieCache.clear();
    enterpriseCache.clear();
  }
}

function useSubscriptionResource<T>(
  fetcher: () => Promise<SubscriptionState>,
  cache: Map<string, CacheEntry>,
  cacheKey: string | null,
) {
  const [state, setState] = useState<SubscriptionState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (force = false) => {
      if (!cacheKey) {
        setState(DEFAULT_STATE);
        return;
      }
      const cached = cache.get(cacheKey);
      if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
        setState(cached.state);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const next = await fetcher();
        cache.set(cacheKey, { fetchedAt: Date.now(), state: next });
        setState(next);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          setState(DEFAULT_STATE);
        } else {
          setError(e instanceof Error ? e.message : 'Failed to load subscription');
        }
      } finally {
        setLoading(false);
      }
    },
    [cache, cacheKey, fetcher],
  );

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, loading, error, refresh: () => load(true) };
}

export function useTradieSubscription() {
  const { userId } = useUser();

  const fetcher = useCallback(async (): Promise<SubscriptionState> => {
    const res = await api.get<TradieBillingResponse>('/api/stripe/billing-details');
    return {
      status: res.subscription?.status ?? null,
      tier: (res.subscription?.tier as TradieTierKey | undefined) ?? null,
      interval: res.subscription?.interval ?? null,
      cancelAtPeriodEnd: res.subscription?.cancel_at_period_end ?? false,
      currentPeriodEnd: res.subscription?.current_period_end ?? null,
      paymentMethod: res.paymentMethod ?? null,
      invoices: res.invoices ?? [],
      raw: res,
    };
  }, []);

  return useSubscriptionResource(fetcher, tradieCache, userId);
}

export function useEnterpriseSubscription() {
  const { userId } = useUser();

  const fetcher = useCallback(async (): Promise<SubscriptionState> => {
    const res = await api.get<EnterpriseStateResponse>('/api/stripe/enterprise-subscription-state');
    return {
      status: res.subscription?.status ?? null,
      tier: (res.subscription?.tier as EnterpriseTierKey | undefined) ?? null,
      interval: res.subscription?.interval ?? null,
      cancelAtPeriodEnd: res.subscription?.cancel_at_period_end ?? false,
      currentPeriodEnd: res.subscription?.current_period_end ?? null,
      paymentMethod: res.paymentMethod ?? null,
      invoices: [],
      raw: res,
    };
  }, []);

  return useSubscriptionResource(fetcher, enterpriseCache, userId);
}

export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === 'active' || status === 'trialing';
}
