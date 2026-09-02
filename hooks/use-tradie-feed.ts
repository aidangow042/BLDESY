/**
 * useTradieFeed — the data behind the three portal job feeds. The app twin of
 * the `useEffect(() => Promise.all([jobs, applications, capabilities]))` at the
 * top of ~/bldesy-web/app/portal/jobs/{residential,commercial,contracts}/page.tsx,
 * on top of lib/data/tradie-jobs.ts. Urgency / hidden filtering stays in the
 * screen (client-side, like the website) so tab switches are instant.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { useUser } from '@/lib/auth-context';
import { readOwnCapabilitiesRow } from '@/lib/data/capabilities';
import { usePortal } from '@/components/portal/portal-context';
import type { OwnBuilderProfile } from '@/lib/data/portal';
import {
  getHiddenJobIds,
  getMyApplicationJobIds,
  hideJob,
  listTradieFeed,
  viewerSpecialisations,
  type FeedKind,
  type Job,
  type SpecialisationsByTrade,
} from '@/lib/data/tradie-jobs';
import type { TradieCapabilities } from '@/lib/web/capabilities';

export interface TradieFeedState {
  profile: OwnBuilderProfile | null;
  /** Coverage-refined jobs in created_at order (Project Jobs: speciality matches first). */
  jobs: Job[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  hiddenJobIds: Set<string>;
  appliedJobIds: Set<string>;
  applicationIds: Record<string, string>;
  /** Project Jobs only — null until loaded / when the tradie has no row. */
  capabilities: TradieCapabilities | null;
  viewerSpecs: SpecialisationsByTrade;
  /** Record a Quick Apply so the card flips to "Applied" without a refetch. */
  markApplied: (jobId: string, applicationId: string) => void;
  /** Hide (device-local) and withdraw any application — the website's handleDismiss. */
  hide: (jobId: string) => Promise<void>;
}

export function useTradieFeed(kind: FeedKind): TradieFeedState {
  const { user } = useUser();
  const uid = user?.id ?? null;
  // The portal shell owns the row (web usePortal()); it is loaded before any screen renders.
  const { profile } = usePortal();
  const profileLoading = false;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hiddenJobIds, setHiddenJobIds] = useState<Set<string>>(new Set());
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [applicationIds, setApplicationIds] = useState<Record<string, string>>({});
  const [capabilities, setCapabilities] = useState<TradieCapabilities | null>(null);
  const loadedOnce = useRef(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (!uid) return;
      if (mode === 'refresh') setRefreshing(true);
      try {
        const [feed, apps, hidden, caps] = await Promise.all([
          listTradieFeed(kind, { profile, includeHidden: true }),
          getMyApplicationJobIds(),
          getHiddenJobIds(kind),
          kind === 'project' ? readOwnCapabilitiesRow() : Promise.resolve(null),
        ]);
        setJobs(feed);
        setAppliedJobIds(apps.appliedJobIds);
        setApplicationIds(apps.applicationIds);
        setHiddenJobIds(hidden);
        setCapabilities(caps);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
        loadedOnce.current = true;
      }
    },
    [uid, kind, profile],
  );

  useEffect(() => {
    if (profileLoading) return;
    if (!uid) {
      setLoading(false);
      return;
    }
    void load('initial');
  }, [profileLoading, uid, load]);

  // Coming back from the job page (apply / withdraw) — re-read the "Applied"
  // badges only; the feed itself refreshes on pull.
  useFocusEffect(
    useCallback(() => {
      if (!uid || !loadedOnce.current) return;
      getMyApplicationJobIds()
        .then((apps) => {
          setAppliedJobIds(apps.appliedJobIds);
          setApplicationIds(apps.applicationIds);
        })
        .catch(() => {
          /* badges stay as they were */
        });
    }, [uid]),
  );

  const refresh = useCallback(() => load('refresh'), [load]);

  const markApplied = useCallback((jobId: string, applicationId: string) => {
    setAppliedJobIds((prev) => new Set([...prev, jobId]));
    setApplicationIds((prev) => ({ ...prev, [jobId]: applicationId }));
  }, []);

  const hide = useCallback(
    async (jobId: string) => {
      const appId = applicationIds[jobId];
      setHiddenJobIds((prev) => new Set([...prev, jobId]));
      if (appId) {
        setAppliedJobIds((prev) => {
          const n = new Set(prev);
          n.delete(jobId);
          return n;
        });
        setApplicationIds((prev) => {
          const n = { ...prev };
          delete n[jobId];
          return n;
        });
      }
      await hideJob(kind, jobId, { applicationId: appId ?? null });
    },
    [applicationIds, kind],
  );

  return {
    profile,
    jobs,
    loading: profileLoading || loading,
    refreshing,
    error,
    refresh,
    hiddenJobIds,
    appliedJobIds,
    applicationIds,
    capabilities,
    viewerSpecs: viewerSpecialisations(profile),
    markApplied,
    hide,
  };
}
