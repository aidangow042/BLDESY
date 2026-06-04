import { useEffect, useReducer, useRef, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

import ReAnimated, { FadeInUp } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { AppShell } from '@/components/layout';
import { useToast } from '@/components/ui';
import { Colors, Spacing, Radius, Shadows, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { useAiConsent } from '@/components/ai-consent-modal';
import { hasAiConsent } from '@/lib/ai-consent';
import { CAN_SELL_IN_APP } from '@/lib/iap-policy';
import { useUser } from '@/lib/auth-context';
import { getSuburbSuggestions, getPostcodeForSuburb } from '@/lib/geo';
import { uploadJobPhoto, uploadJobDocument } from '@/lib/storage';
import { isSubscriptionActive, useEnterpriseSubscription } from '@/lib/subscription';
import { hasSpecialisations } from '@/lib/trade-specialisations';
import { SpecialityPicker } from '@/components/trades/speciality-picker';
import { StepWhenAndHow, INITIAL_WHEN_AND_HOW, type WhenAndHowFields } from '@/components/jobs/when-and-how-step';

/* ───────────────────────── Constants ───────────────────────── */

const TRADE_TYPES = [
  'Builder', 'Electrician', 'Plumber', 'Carpenter', 'Painter', 'Tiler',
  'Roofer', 'Landscaper', 'Concreter', 'Fencer', 'Plasterer', 'Bricklayer',
  'Handyman', 'Other',
];

const URGENCY_OPTIONS = [
  {
    value: 'asap',
    label: 'ASAP',
    subtitle: 'Within 24-48 hours',
    icon: 'alarm' as const,
    color: '#DC2626',
    bg: '#FEF2F2',
    borderColor: '#FECACA',
  },
  {
    value: 'this_week',
    label: 'This Week',
    subtitle: 'Within 7 days',
    icon: 'schedule' as const,
    color: '#D97706',
    bg: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  {
    value: 'flexible',
    label: 'Flexible',
    subtitle: 'No rush, planning ahead',
    icon: 'event-note' as const,
    color: '#059669',
    bg: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
];

const NEXT_STEPS = [
  { icon: 'notifications-active' as const, text: 'Matching builders get notified' },
  { icon: 'message' as const, text: 'Builders send you their interest' },
  { icon: 'check-circle' as const, text: 'You choose the best fit' },
];

const URGENCY_LABELS: Record<string, string> = {
  asap: 'ASAP',
  this_week: 'This Week',
  flexible: 'Flexible',
};

/* ───────────────────────── State ───────────────────────── */

type PhotoItem = { uri: string; isCover: boolean };
type DocItem = { uri: string; name: string; size: number };
type AISuggestion = {
  suggested_trade?: string;
  suggested_urgency?: string;
  clarifying_question?: string;
} | null;

type State = {
  step: number;
  // Step 1
  title: string;
  tradeType: string;
  otherTrade: string;
  specialisations: string[];
  urgency: string;
  aiSuggestion: AISuggestion;
  aiLoading: boolean;
  // Step 2
  description: string;
  photos: PhotoItem[];
  documents: DocItem[];
  suburb: string;
  postcode: string;
  contactPhone: string;
  contactEmail: string;
  aiDescLoading: boolean;
  // Enterprise fields
  budget: string;
  workersNeeded: string;
  dayRate: string;
  contractDuration: string;
  startDate: string;
  siteRequirements: string;
  // Meta
  isEnterprise: boolean;
  // Poster-type flow (business vs personal → job vs contract)
  posterMode: 'unset' | 'personal' | 'business';
  canBeEnterprise: boolean;
  posterChecked: boolean;
  postingKind: 'job' | 'contract';
  whenHow: WhenAndHowFields;
  draftId: string | null;
  submitting: boolean;
  aiAssisted: boolean;
  showSuccess: boolean;
  noAuth: boolean;
};

type Action =
  | { type: 'SET'; field: keyof State; value: any }
  | { type: 'SET_MANY'; payload: Partial<State> }
  | { type: 'SELECT_TRADE'; trade: string }
  | { type: 'TOGGLE_SPEC'; slug: string }
  | { type: 'ADD_PHOTOS'; photos: PhotoItem[] }
  | { type: 'REMOVE_PHOTO'; index: number }
  | { type: 'SET_COVER'; index: number }
  | { type: 'ADD_DOC'; doc: DocItem }
  | { type: 'REMOVE_DOC'; index: number }
  | { type: 'RESET' };

const initialState: State = {
  step: 1,
  title: '',
  tradeType: '',
  otherTrade: '',
  specialisations: [],
  urgency: '',
  aiSuggestion: null,
  aiLoading: false,
  description: '',
  photos: [],
  documents: [],
  suburb: '',
  postcode: '',
  contactPhone: '',
  contactEmail: '',
  aiDescLoading: false,
  budget: '',
  workersNeeded: '1',
  dayRate: '',
  contractDuration: '',
  startDate: '',
  siteRequirements: '',
  isEnterprise: false,
  posterMode: 'unset',
  canBeEnterprise: false,
  posterChecked: false,
  postingKind: 'job',
  whenHow: INITIAL_WHEN_AND_HOW,
  draftId: null,
  submitting: false,
  aiAssisted: false,
  showSuccess: false,
  noAuth: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET':
      return { ...state, [action.field]: action.value };
    case 'SET_MANY':
      return { ...state, ...action.payload };
    case 'SELECT_TRADE':
      // Reset specialisations whenever the selected trade changes — they're
      // scoped to one trade's catalogue and don't carry across.
      return { ...state, tradeType: action.trade, specialisations: [] };
    case 'TOGGLE_SPEC': {
      const has = state.specialisations.includes(action.slug);
      return {
        ...state,
        specialisations: has
          ? state.specialisations.filter((s) => s !== action.slug)
          : [...state.specialisations, action.slug],
      };
    }
    case 'ADD_PHOTOS': {
      const existing = state.photos;
      const newPhotos = action.photos.map((p, i) => ({
        ...p,
        isCover: existing.length === 0 && i === 0,
      }));
      return { ...state, photos: [...existing, ...newPhotos].slice(0, 10) };
    }
    case 'REMOVE_PHOTO': {
      const next = state.photos.filter((_, i) => i !== action.index);
      if (next.length > 0 && !next.some((p) => p.isCover)) {
        next[0].isCover = true;
      }
      return { ...state, photos: next };
    }
    case 'SET_COVER':
      return {
        ...state,
        photos: state.photos.map((p, i) => ({ ...p, isCover: i === action.index })),
      };
    case 'ADD_DOC':
      return { ...state, documents: [...state.documents, action.doc].slice(0, 5) };
    case 'REMOVE_DOC':
      return { ...state, documents: state.documents.filter((_, i) => i !== action.index) };
    case 'RESET':
      // Keep the enterprise check result so "Post another" doesn't re-spinner;
      // posterMode resets to 'unset' so a business user is re-asked per post.
      return { ...initialState, canBeEnterprise: state.canBeEnterprise, posterChecked: state.posterChecked };
    default:
      return state;
  }
}

/* ───────────────────────── Component ───────────────────────── */

export default function PostJobScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { userId } = useUser();
  const { ensureConsent, consentModal } = useAiConsent();
  const enterpriseSub = useEnterpriseSubscription();
  const params = useLocalSearchParams<{
    editId?: string;
    editTitle?: string;
    editTrade?: string;
    editUrgency?: string;
    editDescription?: string;
    editSuburb?: string;
    editPostcode?: string;
    editContactPhone?: string;
    editContactEmail?: string;
  }>();

  const isEditMode = !!params.editId;

  const [s, dispatch] = useReducer(reducer, initialState);

  // Derived step config — business posters get an extra "When & How" step.
  const stepLabels = s.isEnterprise
    ? ['Basics', 'Details', 'When & How', 'Review']
    : ['Basics', 'Details', 'Review'];
  const totalSteps = stepLabels.length;
  const isWhenHowStep = s.isEnterprise && s.step === 3;
  const isReviewStep = s.step === totalSteps;

  // Pre-fill form when editing
  const hasPreFilled = useRef(false);
  useEffect(() => {
    if (isEditMode && !hasPreFilled.current) {
      hasPreFilled.current = true;
      const tradeName = TRADE_TYPES.find(
        (t) => t.toLowerCase() === params.editTrade?.toLowerCase(),
      );
      dispatch({
        type: 'SET_MANY',
        payload: {
          title: params.editTitle ?? '',
          tradeType: tradeName ?? 'Other',
          otherTrade: tradeName ? '' : params.editTrade ?? '',
          urgency: params.editUrgency ?? '',
          description: params.editDescription ?? '',
          suburb: params.editSuburb ?? '',
          postcode: params.editPostcode ?? '',
          contactPhone: params.editContactPhone ?? '',
          contactEmail: params.editContactEmail ?? '',
        },
      });
    }
  }, [isEditMode]);

  // Resolve whether this user can post as a business, and drive the poster-type
  // pre-step. Pure customers (and guests) go straight to the personal flow with
  // zero change in behaviour.
  useEffect(() => {
    (async () => {
      if (!userId) {
        dispatch({ type: 'SET_MANY', payload: { canBeEnterprise: false, posterMode: 'personal', posterChecked: true } });
        return;
      }
      const { data } = await supabase
        .from('enterprise_profiles')
        .select('status')
        .eq('user_id', userId)
        .maybeSingle();
      const can = !!data && ((data as any).status === 'approved' || (data as any).status === 'active');
      if (isEditMode) {
        // Preserve the existing edit behaviour: enterprise users editing keep the
        // enterprise fields; skip the poster-type pre-step.
        dispatch({ type: 'SET_MANY', payload: { canBeEnterprise: can, isEnterprise: can, posterMode: can ? 'business' : 'personal', posterChecked: true } });
      } else if (can) {
        // Show the Personal/Business pre-step (posterMode stays 'unset').
        dispatch({ type: 'SET_MANY', payload: { canBeEnterprise: true, posterChecked: true } });
      } else {
        dispatch({ type: 'SET_MANY', payload: { canBeEnterprise: false, posterMode: 'personal', posterChecked: true } });
      }
    })();
  }, [userId, isEditMode]);

  // Animations
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  // Allocate the max number of dots (4 = business) up front; only the first
  // `totalSteps` are rendered (hooks can't be conditional).
  const dotWidths = useRef([1, 2, 3, 4].map((i) => new Animated.Value(i === 1 ? 24 : 8))).current;
  const aiCardAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  // Refs
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [locationSuggestions, setLocationSuggestions] = React.useState<string[]>([]);

  // Fix: import React for the useState above
  // Actually let's use useReducer pattern instead
  // We'll track location suggestions in a ref-based approach... no, let's just add it properly.

  /* ───────────── Step transitions ───────────── */

  function animateToStep(from: number, to: number) {
    const direction = to > from ? -1 : 1;
    Animated.parallel([
      Animated.spring(dotWidths[from - 1], { toValue: 8, useNativeDriver: false, friction: 8 }),
      Animated.spring(dotWidths[to - 1], { toValue: 24, useNativeDriver: false, friction: 8 }),
    ]).start();
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: direction * 300, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      dispatch({ type: 'SET', field: 'step', value: to });
      slideAnim.setValue(-direction * 300);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 8, tension: 60 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    });
  }

  /* ───────────── AI title suggest (Step 1) ───────────── */

  function handleTitleChange(text: string) {
    dispatch({ type: 'SET', field: 'title', value: text });
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    if (text.trim().length < 5) {
      dispatch({ type: 'SET_MANY', payload: { aiSuggestion: null, aiLoading: false } });
      aiCardAnim.setValue(0);
      return;
    }
    titleDebounceRef.current = setTimeout(() => fetchAISuggestion(text.trim()), 500);
  }

  async function fetchAISuggestion(title: string) {
    // Silent gate: don't send text to the AI provider until the user has
    // consented elsewhere (the explicit "write it for me" button or AI chat).
    // No modal here — it would interrupt typing.
    if (!(await hasAiConsent())) return;
    dispatch({ type: 'SET', field: 'aiLoading', value: true });
    try {
      const { data, error } = await supabase.functions.invoke('ai-job-suggest', {
        body: { title, mode: 'suggest' },
      });
      if (error || !data) {
        dispatch({ type: 'SET', field: 'aiLoading', value: false });
        return;
      }
      dispatch({
        type: 'SET_MANY',
        payload: { aiSuggestion: data, aiLoading: false },
      });
      // Slide in the AI card
      aiCardAnim.setValue(0);
      Animated.spring(aiCardAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 50 }).start();
    } catch {
      dispatch({ type: 'SET', field: 'aiLoading', value: false });
    }
  }

  function acceptTradeSuggestion(trade: string) {
    const matched = TRADE_TYPES.find((t) => t.toLowerCase() === trade.toLowerCase());
    if (matched) {
      dispatch({ type: 'SELECT_TRADE', trade: matched });
    }
    dispatch({ type: 'SET', field: 'aiAssisted', value: true });
  }

  function acceptUrgencySuggestion(urgency: string) {
    const mapped =
      urgency === 'asap' ? 'asap' : urgency === 'this_week' ? 'this_week' : 'flexible';
    dispatch({ type: 'SET', field: 'urgency', value: mapped });
    dispatch({ type: 'SET', field: 'aiAssisted', value: true });
  }

  /* ───────────── AI describe (Step 2) ───────────── */

  async function handleAIDescribe() {
    // Explicit AI action — show the third-party disclosure on first use.
    if (!(await ensureConsent())) return;
    dispatch({ type: 'SET', field: 'aiDescLoading', value: true });
    try {
      const { data, error } = await supabase.functions.invoke('ai-job-suggest', {
        body: { title: s.title, trade_type: s.tradeType, mode: 'describe' },
      });
      if (!error && data?.description) {
        dispatch({
          type: 'SET_MANY',
          payload: { description: data.description, aiAssisted: true, aiDescLoading: false },
        });
      } else {
        dispatch({ type: 'SET', field: 'aiDescLoading', value: false });
      }
    } catch {
      dispatch({ type: 'SET', field: 'aiDescLoading', value: false });
    }
  }

  /* ───────────── Photo picker ───────────── */

  async function handlePickPhotos() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast.show('Photo access denied — enable it in Settings to upload', { variant: 'warning' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10 - s.photos.length,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      dispatch({
        type: 'ADD_PHOTOS',
        photos: result.assets.map((a) => ({ uri: a.uri, isCover: false })),
      });
    }
  }

  /* ───────────── Document picker ───────────── */

  async function handlePickDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: true,
      });
      if (result.canceled || !result.assets) return;
      for (const asset of result.assets) {
        if (asset.size && asset.size > 10 * 1024 * 1024) {
          toast.show(`${asset.name} exceeds 10MB limit`, { variant: 'warning' });
          continue;
        }
        if (s.documents.length >= 5) {
          toast.show('Maximum 5 documents allowed', { variant: 'warning' });
          break;
        }
        dispatch({
          type: 'ADD_DOC',
          doc: { uri: asset.uri, name: asset.name, size: asset.size ?? 0 },
        });
      }
    } catch {
      // User cancelled
    }
  }

  /* ───────────── Location ───────────── */

  const [locSuggestions, setLocSuggestions] = React.useState<string[]>([]);

  function handleSuburbChange(text: string) {
    dispatch({ type: 'SET', field: 'suburb', value: text });
    setLocSuggestions(getSuburbSuggestions(text));
    // Clear postcode when typing new suburb
    if (text.length < 2) dispatch({ type: 'SET', field: 'postcode', value: '' });
  }

  function selectSuburb(suburb: string) {
    dispatch({ type: 'SET', field: 'suburb', value: suburb });
    setLocSuggestions([]);
    const pc = getPostcodeForSuburb(suburb);
    if (pc) dispatch({ type: 'SET', field: 'postcode', value: pc });
  }

  async function handleUseCurrentLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast.show('Location access denied — enable it in Settings', { variant: 'warning' });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const [result] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (result) {
        const sub = result.city || result.subregion || result.district || '';
        const pc = result.postalCode || '';
        dispatch({ type: 'SET_MANY', payload: { suburb: sub, postcode: pc } });
      }
    } catch {
      toast.show("Couldn't get location — enter it manually", { variant: 'error' });
    }
  }

  /* ───────────── Draft auto-save ───────────── */

  async function saveDraft() {
    try {
      if (!userId) return;

      const draftData: Record<string, any> = {
        customer_id: userId,
        title: s.title.trim(),
        description: s.description.trim(),
        trade_category: (s.tradeType === 'Other' ? s.otherTrade : s.tradeType).toLowerCase(),
        specialisations: s.specialisations,
        urgency: s.urgency || null,
        suburb: s.suburb.trim(),
        postcode: s.postcode.trim(),
        contact_phone: s.contactPhone.trim() || null,
        contact_email: s.contactEmail.trim() || null,
        status: 'open',
      };

      if (s.draftId) {
        await supabase.from('jobs').update(draftData).eq('id', s.draftId);
      } else {
        const { data } = await supabase
          .from('jobs')
          .insert(draftData)
          .select('id')
          .single();
        if (data?.id) dispatch({ type: 'SET', field: 'draftId', value: data.id });
      }
    } catch {
      // Silent fail for drafts
    }
  }

  /* ───────────── Continue handler ───────────── */

  async function handleContinue() {
    // Auth is required before leaving Step 1 (guests can fill it, not submit).
    if (s.step === 1 && !userId) {
      dispatch({ type: 'SET', field: 'noAuth', value: true });
      return;
    }
    if (s.step < totalSteps) animateToStep(s.step, s.step + 1);
  }

  /* ───────────── Submit ───────────── */

  async function handleSubmit() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    dispatch({ type: 'SET', field: 'submitting', value: true });

    try {
      if (!userId) {
        dispatch({ type: 'SET_MANY', payload: { noAuth: true, submitting: false } });
        return;
      }

      // Enterprise posters need an active subscription to post.
      if (s.isEnterprise && !isSubscriptionActive(enterpriseSub.status)) {
        dispatch({ type: 'SET', field: 'submitting', value: false });
        if (CAN_SELL_IN_APP) {
          Alert.alert(
            'Subscribe to post',
            'Pick a plan to start posting jobs and reaching verified tradies.',
            [
              { text: 'Not now', style: 'cancel' },
              {
                text: 'See plans',
                onPress: () =>
                  router.push({
                    pathname: '/subscribe',
                    params: { side: 'enterprise', tier: 'builder', interval: 'monthly' },
                  } as any),
              },
            ],
          );
        } else {
          // iOS: no in-app purchase or web-purchase link (App Store 3.1.1).
          Alert.alert(
            'Subscription required',
            'Posting jobs needs an active subscription. Once your subscription is active it works here automatically.',
            [{ text: 'OK' }],
          );
        }
        return;
      }

      // Contracts can only be posted from a business account (DB CHECK too).
      if (s.postingKind === 'contract' && !s.isEnterprise) {
        toast.show('Contracts can only be posted from a business account', { variant: 'error' });
        dispatch({ type: 'SET', field: 'submitting', value: false });
        return;
      }

      const tradeValue = (s.tradeType === 'Other' ? s.otherTrade : s.tradeType).toLowerCase();

      // Create or update the job
      const jobData: Record<string, any> = {
        title: s.title.trim(),
        description: s.description.trim(),
        trade_category: tradeValue,
        specialisations: s.specialisations,
        urgency: s.urgency,
        suburb: s.suburb.trim(),
        postcode: s.postcode.trim(),
        contact_phone: s.contactPhone.trim() || null,
        contact_email: s.contactEmail.trim() || null,
        budget: s.budget.trim() || null,
        poster_type: s.isEnterprise ? 'enterprise' : 'customer',
        ...(s.isEnterprise ? {
          workers_needed: parseInt(s.workersNeeded) || 1,
          day_rate: s.dayRate.trim() || null,
          contract_duration: s.contractDuration.trim() || null,
          start_date: s.startDate.trim() || null,
          site_requirements: s.siteRequirements.trim() || null,
        } : {}),
      };

      // posting_kind + the "When & How" columns — written on NEW business posts
      // only (kept out of jobData so editing never wipes them). Empty → null so
      // the time/enum-checked columns never receive ''.
      const wh = s.whenHow;
      const enterpriseExtra: Record<string, any> =
        s.isEnterprise && !isEditMode
          ? {
              posting_kind: s.postingKind,
              employment_type: wh.employmentType || null,
              start_date: wh.startDate || s.startDate.trim() || null,
              end_date: wh.isOngoing ? null : (wh.endDate || null),
              is_ongoing: wh.isOngoing,
              daily_start_time: wh.dailyStartTime || null,
              daily_finish_time: wh.dailyFinishTime || null,
              work_days: wh.workDays.length ? wh.workDays : null,
              days_per_week: wh.workDays.length || null,
              pay_type: wh.payType || null,
              pay_rate_min: wh.payRateMin ? Number(wh.payRateMin) : null,
              pay_rate_max: wh.payRateMax ? Number(wh.payRateMax) : null,
              required_capabilities: wh.requiredCapabilities,
              min_public_liability: wh.minPublicLiability,
            }
          : {};

      let jobId: string | null = null;

      if (isEditMode) {
        const { error: updateErr } = await supabase
          .from('jobs')
          .update(jobData)
          .eq('id', params.editId!)
          .eq('customer_id', userId);
        if (updateErr) {
          toast.show("Couldn't save changes", { variant: 'error' });
          dispatch({ type: 'SET', field: 'submitting', value: false });
          return;
        }
        jobId = params.editId!;
      } else {
        const { data, error: insertErr } = await supabase
          .from('jobs')
          .insert({ ...jobData, ...enterpriseExtra, customer_id: userId, status: 'open' })
          .select('id')
          .single();
        if (insertErr) {
          toast.show("Couldn't post job", { variant: 'error' });
          dispatch({ type: 'SET', field: 'submitting', value: false });
          return;
        }
        jobId = data?.id ?? null;
      }

      if (!jobId) {
        toast.show('Failed to save job — try again', { variant: 'error' });
        dispatch({ type: 'SET', field: 'submitting', value: false });
        return;
      }

      // Upload photos in parallel (best-effort — tables/buckets may not exist yet)
      try {
        if (s.photos.length > 0) {
          const photoUrls = await Promise.all(
            s.photos.map((p) => uploadJobPhoto(p.uri, userId, jobId!)),
          );
          const validUrls = photoUrls.filter((url): url is string => url !== null);
          const photoRecords = validUrls.map((url, i) => ({
            job_id: jobId!,
            file_path: url,
            is_cover: s.photos[i]?.isCover ?? false,
          }));
          if (photoRecords.length > 0) {
            await supabase.from('job_photos').insert(photoRecords);
            // Mirror to the jobs.photo_urls array so the post also shows on the
            // website feeds (which read photo_urls, not the job_photos table).
            await supabase.from('jobs').update({ photo_urls: validUrls }).eq('id', jobId!);
          }
        }
      } catch {
        // Photo upload/record insert failed — non-blocking
      }

      // Upload documents in parallel (best-effort)
      try {
        if (s.documents.length > 0) {
          const docUrls = await Promise.all(
            s.documents.map((d) => uploadJobDocument(d.uri, userId, jobId!, d.name)),
          );
          const docRecords = docUrls
            .filter((url): url is string => url !== null)
            .map((url, i) => ({
              job_id: jobId!,
              file_path: url,
              file_name: s.documents[i]?.name ?? 'document.pdf',
              file_size_bytes: s.documents[i]?.size ?? 0,
            }));
          if (docRecords.length > 0) {
            await supabase.from('job_documents').insert(docRecords);
          }
        }
      } catch {
        // Document upload/record insert failed — non-blocking
      }

      dispatch({ type: 'SET_MANY', payload: { submitting: false, showSuccess: true } });

      // Animate success
      Animated.parallel([
        Animated.spring(successScale, { toValue: 1, useNativeDriver: true, friction: 5 }),
        Animated.timing(successOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    } catch (err: any) {
      toast.show(err.message || 'Something went wrong', { variant: 'error' });
      dispatch({ type: 'SET', field: 'submitting', value: false });
    }
  }

  /* ───────────── Validation ───────────── */

  const step1Valid = s.title.trim().length > 0 && (s.tradeType !== '' && (s.tradeType !== 'Other' || s.otherTrade.trim().length > 0));
  const step2Valid = s.description.trim().length > 0 && s.suburb.trim().length > 0;
  // When & How (step 3, business) has no required fields.
  const currentStepValid = s.step === 1 ? step1Valid : s.step === 2 ? step2Valid : true;

  /* ───────────── Poster-type check (avoid pre-step flash) ───────────── */

  if (userId && !s.posterChecked && !isEditMode) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.canvas }]}>
        <ActivityIndicator color={colors.teal} style={{ marginTop: insets.top + 80 }} />
      </View>
    );
  }

  /* ───────────── No auth screen ───────────── */

  if (s.noAuth) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.canvas }]}>
        <View style={[styles.centeredContainer, { paddingTop: insets.top }]}>
          <MaterialIcons name="lock-outline" size={48} color={colors.teal} />
          <ThemedText type="subtitle" style={styles.centeredText}>
            Sign in required
          </ThemedText>
          <ThemedText style={[styles.centeredSubtext, { color: colors.textSecondary }]}>
            You need to be logged in to post a job.
          </ThemedText>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.outlineBtn,
              { borderColor: colors.teal },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.outlineBtnText, { color: colors.teal }]}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  /* ───────────── Success screen ───────────── */

  if (s.showSuccess) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.canvas }]}>
        <ScrollView
          contentContainerStyle={[styles.successContainer, { paddingTop: insets.top + 60 }]}
        >
          <Animated.View
            style={[
              styles.successCheckCircle,
              {
                transform: [{ scale: successScale }],
                opacity: successOpacity,
              },
            ]}
          >
            <MaterialIcons name="check" size={48} color="#fff" />
          </Animated.View>

          <Animated.View style={{ opacity: successOpacity, alignItems: 'center', gap: 8 }}>
            <ThemedText type="title" style={styles.successTitle}>
              Job posted!
            </ThemedText>
            <ThemedText style={[styles.successSubtitle, { color: colors.textSecondary }]}>
              Your job is now visible to qualified tradies
            </ThemedText>
          </Animated.View>

          <Animated.View
            style={[styles.nextStepsCard, { backgroundColor: colors.surface, opacity: successOpacity }]}
          >
            <Text style={[styles.nextStepsHeading, { color: colors.text }]}>
              What happens next?
            </Text>
            {NEXT_STEPS.map((step, i) => (
              <View key={i} style={styles.nextStepRow}>
                <View style={[styles.nextStepIcon, { backgroundColor: '#E1F5EE' }]}>
                  <MaterialIcons name={step.icon} size={18} color="#0F6E56" />
                </View>
                <Text style={[styles.nextStepText, { color: colors.text }]}>{step.text}</Text>
              </View>
            ))}
          </Animated.View>

          <View style={styles.successButtons}>
            <Pressable
              onPress={() => router.replace('/my-jobs')}
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
            >
              <LinearGradient
                colors={['#0d9488', '#0f766e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtnGrad}
              >
                <Text style={styles.primaryBtnText}>View My Jobs</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => {
                dispatch({ type: 'RESET' });
                successScale.setValue(0);
                successOpacity.setValue(0);
                dotWidths.forEach((d, i) => d.setValue(i === 0 ? 24 : 8));
              }}
              style={({ pressed }) => [
                styles.outlineBtn,
                { borderColor: colors.teal },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.outlineBtnText, { color: colors.teal }]}>Post Another Job</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => router.replace('/results')}>
            <Text style={[styles.browseLink, { color: colors.teal }]}>
              Browse tradies in your area →
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  /* ───────────── Poster-type pre-step (business users only) ───────────── */

  if (!isEditMode && s.canBeEnterprise && s.posterMode === 'unset') {
    return (
      <AppShell title="Post a Job" showBack>
        <ScrollView contentContainerStyle={styles.posterWrap} showsVerticalScrollIndicator={false}>
          <ThemedText type="subtitle" style={{ marginBottom: 4 }}>Who&apos;s this job for?</ThemedText>
          <ThemedText style={[styles.stepHint, { color: colors.textSecondary }]}>
            Post for yourself, or on behalf of your business.
          </ThemedText>

          <Pressable
            onPress={() => dispatch({ type: 'SET_MANY', payload: { posterMode: 'personal', isEnterprise: false, postingKind: 'job' } })}
            style={({ pressed }) => [styles.posterCard, { backgroundColor: '#fff', borderColor: colors.border }, pressed && { opacity: 0.85 }, Shadows.sm]}
          >
            <View style={[styles.posterCardIcon, { backgroundColor: colors.tealBg }]}>
              <Ionicons name="person-outline" size={24} color={colors.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.posterCardTitle, { color: colors.text }]}>Personal</Text>
              <Text style={[styles.posterCardDesc, { color: colors.textSecondary }]}>
                A one-off job for your home or property.
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            onPress={() => dispatch({ type: 'SET_MANY', payload: { posterMode: 'business', isEnterprise: true } })}
            style={({ pressed }) => [styles.posterCard, { backgroundColor: '#fff', borderColor: colors.border }, pressed && { opacity: 0.85 }, Shadows.sm]}
          >
            <View style={[styles.posterCardIcon, { backgroundColor: colors.tealBg }]}>
              <Ionicons name="business-outline" size={24} color={colors.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.posterCardTitle, { color: colors.text }]}>Business</Text>
              <Text style={[styles.posterCardDesc, { color: colors.textSecondary }]}>
                A project job or contract on behalf of your company. Choose Job or Contract next.
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.textSecondary} />
          </Pressable>
        </ScrollView>
      </AppShell>
    );
  }

  /* ───────────── Progress indicator ───────────── */

  function renderProgressBar() {
    return (
      <View style={styles.progressContainer}>
        {stepLabels.map((label, i) => {
          const stepNum = i + 1;
          const isCompleted = s.step > stepNum;
          const isCurrent = s.step === stepNum;
          return (
            <View key={label} style={styles.progressStep}>
              <View style={styles.progressDotRow}>
                {i > 0 && (
                  <View
                    style={[
                      styles.progressLine,
                      { backgroundColor: isCompleted || isCurrent ? '#0F6E56' : colors.border },
                    ]}
                  />
                )}
                <Animated.View
                  style={[
                    styles.progressDot,
                    {
                      width: dotWidths[i],
                      backgroundColor: isCompleted
                        ? '#0F6E56'
                        : isCurrent
                          ? '#1D9E75'
                          : 'transparent',
                      borderColor: isCompleted || isCurrent ? '#0F6E56' : colors.border,
                    },
                  ]}
                >
                  {isCompleted && (
                    <MaterialIcons name="check" size={12} color="#fff" />
                  )}
                </Animated.View>
                {i < stepLabels.length - 1 && (
                  <View
                    style={[
                      styles.progressLine,
                      { backgroundColor: isCompleted ? '#0F6E56' : colors.border },
                    ]}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.progressLabel,
                  {
                    color: isCurrent ? '#0F6E56' : isCompleted ? colors.text : colors.textSecondary,
                    fontWeight: isCurrent ? '700' : '500',
                  },
                ]}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    );
  }

  /* ───────────── Step 1: Basics ───────────── */

  function renderStep1() {
    // Slug for the specialisations catalogue lookup. Mirror exactly how the
    // job's trade_category is derived on save (lowercased) so the catalogue key
    // matches what gets persisted. "Other" → free-text, never in the catalogue,
    // so hasSpecialisations() returns false and the picker hides itself.
    const tradeSlug = (s.tradeType === 'Other' ? s.otherTrade : s.tradeType).toLowerCase();

    return (
      <View style={styles.stepContent}>
        <ThemedText type="subtitle" style={{ marginBottom: 4 }}>
          What do you need done?
        </ThemedText>
        <ThemedText style={[styles.stepHint, { color: colors.textSecondary }]}>
          Tell us the basics and we'll match you with the right tradies.
        </ThemedText>

        {/* Job vs Contract — business posters only */}
        {s.isEnterprise && (
          <View style={styles.fieldGroup}>
            <ThemedText style={[styles.label, { color: colors.textSecondary }]}>WHAT ARE YOU POSTING?</ThemedText>
            <View style={styles.kindRow}>
              {([
                { key: 'job' as const, title: 'Job', desc: 'One specific project — a build, fit-out, or single site.' },
                { key: 'contract' as const, title: 'Contract', desc: 'Ongoing work over weeks or months, across sites.' },
              ]).map((opt) => {
                const active = s.postingKind === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => dispatch({ type: 'SET', field: 'postingKind', value: opt.key })}
                    style={[
                      styles.kindCard,
                      { borderColor: active ? colors.teal : colors.border, backgroundColor: active ? colors.tealBg : '#fff' },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.kindTitle, { color: active ? colors.teal : colors.text }]}>{opt.title}</Text>
                    <Text style={[styles.kindDesc, { color: colors.textSecondary }]}>{opt.desc}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Job title */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>JOB TITLE</ThemedText>
          <TextInput
            style={[
              styles.input,
              styles.inputLarge,
              {
                color: colors.text,
                backgroundColor: '#fff',
                borderColor: colors.border,
              },
            ]}
            placeholder="e.g. Fix leaking roof, Bathroom renovation"
            placeholderTextColor={colors.textSecondary}
            value={s.title}
            onChangeText={handleTitleChange}
          />
        </View>

        {/* AI suggestion card */}
        {s.aiLoading && (
          <View style={[styles.aiCard, { backgroundColor: '#E1F5EE' }]}>
            <ActivityIndicator size="small" color="#0F6E56" />
            <Text style={styles.aiCardText}>Analysing your job...</Text>
          </View>
        )}
        {s.aiSuggestion && !s.aiLoading && (
          <Animated.View
            style={[
              styles.aiCard,
              { backgroundColor: '#E1F5EE', transform: [{ translateY: aiCardAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }], opacity: aiCardAnim },
            ]}
          >
            <View style={styles.aiCardHeader}>
              <MaterialIcons name="auto-awesome" size={16} color="#0F6E56" />
              <Text style={styles.aiCardTitle}>AI Suggestion</Text>
            </View>
            {s.aiSuggestion.suggested_trade && (
              <Pressable
                onPress={() => acceptTradeSuggestion(s.aiSuggestion!.suggested_trade!)}
                style={({ pressed }) => [styles.aiSuggestionRow, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.aiSuggestionText}>
                  We recommend: <Text style={styles.aiSuggestionBold}>
                    {s.aiSuggestion.suggested_trade.charAt(0).toUpperCase() + s.aiSuggestion.suggested_trade.slice(1)}
                  </Text>
                </Text>
                <MaterialIcons name="add-circle-outline" size={18} color="#0F6E56" />
              </Pressable>
            )}
            {s.aiSuggestion.suggested_urgency && (
              <Pressable
                onPress={() => acceptUrgencySuggestion(s.aiSuggestion!.suggested_urgency!)}
                style={({ pressed }) => [styles.aiSuggestionRow, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.aiSuggestionText}>
                  {s.aiSuggestion.suggested_urgency === 'asap'
                    ? 'This sounds urgent — ASAP?'
                    : s.aiSuggestion.suggested_urgency === 'this_week'
                      ? 'Sounds like this week?'
                      : 'No rush — flexible timeline?'}
                </Text>
                <MaterialIcons name="add-circle-outline" size={18} color="#0F6E56" />
              </Pressable>
            )}
            {s.aiSuggestion.clarifying_question && (
              <Text style={styles.aiClarifyText}>{s.aiSuggestion.clarifying_question}</Text>
            )}
          </Animated.View>
        )}

        {/* Trade type */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>TRADE TYPE</ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {TRADE_TYPES.map((trade) => {
              const selected = s.tradeType === trade;
              const aiSuggested =
                s.aiSuggestion?.suggested_trade?.toLowerCase() === trade.toLowerCase() &&
                s.tradeType === trade;
              return (
                <View key={trade}>
                  {aiSuggested && (
                    <Text style={styles.aiSuggestedLabel}>AI suggested</Text>
                  )}
                  <Pressable
                    style={({ pressed }) => [
                      styles.chip,
                      {
                        backgroundColor: selected ? '#0F6E56' : '#fff',
                        borderColor: selected ? '#0F6E56' : colors.border,
                      },
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => dispatch({ type: 'SELECT_TRADE', trade })}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? '#fff' : colors.text },
                      ]}
                    >
                      {trade}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
          {s.tradeType === 'Other' && (
            <TextInput
              style={[
                styles.input,
                { color: colors.text, backgroundColor: '#fff', borderColor: colors.border, marginTop: 8 },
              ]}
              placeholder="Specify trade type..."
              placeholderTextColor={colors.textSecondary}
              value={s.otherTrade}
              onChangeText={(t) => dispatch({ type: 'SET', field: 'otherTrade', value: t })}
            />
          )}
          <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
            Need multiple trades? Post a separate job for each.
          </Text>
        </View>

        {/* Specialities — shown only when the selected trade has sub-trades */}
        {hasSpecialisations(tradeSlug) && (
          <View style={styles.fieldGroup}>
            <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
              SPECIALITIES (OPTIONAL)
            </ThemedText>
            <Text style={[styles.fieldHint, { color: colors.textSecondary, marginBottom: 8 }]}>
              Pick any that apply to match with the right specialists.
            </Text>
            <SpecialityPicker
              selectedTrades={[tradeSlug]}
              value={s.specialisations.length ? { [tradeSlug]: s.specialisations } : {}}
              onChange={(next) =>
                dispatch({ type: 'SET', field: 'specialisations', value: next[tradeSlug] ?? [] })
              }
            />
          </View>
        )}

        {/* Urgency */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>URGENCY</ThemedText>
          <View style={styles.urgencyRow}>
            {URGENCY_OPTIONS.map((opt) => {
              const selected = s.urgency === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => dispatch({ type: 'SET', field: 'urgency', value: opt.value })}
                  style={({ pressed }) => [
                    styles.urgencyCard,
                    {
                      backgroundColor: selected ? opt.bg : '#fff',
                      borderColor: selected ? opt.borderColor : colors.border,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <MaterialIcons name={opt.icon} size={24} color={selected ? opt.color : colors.textSecondary} />
                  <Text
                    style={[
                      styles.urgencyLabel,
                      { color: selected ? opt.color : colors.text },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text
                    style={[
                      styles.urgencySubtitle,
                      { color: selected ? opt.color : colors.textSecondary },
                    ]}
                  >
                    {opt.subtitle}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    );
  }

  /* ───────────── Step 2: Details ───────────── */

  function renderStep2() {
    return (
      <View style={styles.stepContent}>
        <ThemedText type="subtitle" style={{ marginBottom: 4 }}>
          Tell tradies more
        </ThemedText>
        <ThemedText style={[styles.stepHint, { color: colors.textSecondary }]}>
          The more detail you give, the better quotes you'll get.
        </ThemedText>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>DESCRIPTION</ThemedText>
          <View>
            <TextInput
              style={[
                styles.input,
                styles.multilineInput,
                { color: colors.text, backgroundColor: '#fff', borderColor: colors.border },
              ]}
              placeholder="Describe the job in detail — what's the issue, what do you want done, any access considerations..."
              placeholderTextColor={colors.textSecondary}
              value={s.description}
              onChangeText={(t) => dispatch({ type: 'SET', field: 'description', value: t })}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={[styles.charCount, { color: colors.textSecondary }]}>
              {s.description.length} / 500
            </Text>
          </View>

          {/* AI Help button */}
          <Pressable
            onPress={handleAIDescribe}
            disabled={s.aiDescLoading || s.title.trim().length === 0}
            style={({ pressed }) => [
              styles.aiHelpBtn,
              {
                backgroundColor: '#E1F5EE',
                opacity: s.aiDescLoading || s.title.trim().length === 0 ? 0.5 : 1,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            {s.aiDescLoading ? (
              <ActivityIndicator size="small" color="#0F6E56" />
            ) : (
              <MaterialIcons name="auto-awesome" size={16} color="#0F6E56" />
            )}
            <Text style={styles.aiHelpBtnText}>Help me describe this</Text>
          </Pressable>
        </View>

        {/* Photos */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
            PHOTOS (OPTIONAL)
          </ThemedText>
          <Text style={[styles.fieldHint, { color: colors.textSecondary, marginBottom: 8 }]}>
            Photos help tradies understand the job and give more accurate quotes.
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoRow}
          >
            {s.photos.map((photo, i) => (
              <View key={i} style={styles.photoThumb}>
                <Image source={{ uri: photo.uri }} style={styles.photoImg} cachePolicy="disk" placeholder={{ blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH' }} />
                {photo.isCover && (
                  <View style={styles.coverBadge}>
                    <Text style={styles.coverBadgeText}>Cover</Text>
                  </View>
                )}
                <Pressable
                  onPress={() => dispatch({ type: 'REMOVE_PHOTO', index: i })}
                  style={styles.photoRemove}
                >
                  <Ionicons name="close" size={14} color="#fff" />
                </Pressable>
                {!photo.isCover && (
                  <Pressable
                    onPress={() => dispatch({ type: 'SET_COVER', index: i })}
                    style={styles.setCoverBtn}
                  >
                    <Text style={styles.setCoverText}>Set cover</Text>
                  </Pressable>
                )}
              </View>
            ))}
            {s.photos.length < 10 && (
              <Pressable
                onPress={handlePickPhotos}
                style={[styles.addPhotoBtn, { borderColor: colors.border }]}
              >
                <Ionicons name="camera-outline" size={24} color={colors.textSecondary} />
                <Text style={[styles.addPhotoText, { color: colors.textSecondary }]}>
                  Add photos
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </View>

        {/* Documents */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
            DOCUMENTS (OPTIONAL)
          </ThemedText>
          <Text style={[styles.fieldHint, { color: colors.textSecondary, marginBottom: 8 }]}>
            Have plans or sketches? Attach them to help tradies quote more accurately.
          </Text>
          {s.documents.map((doc, i) => (
            <View key={i} style={[styles.docItem, { backgroundColor: '#fff', borderColor: colors.border }]}>
              <MaterialIcons name="picture-as-pdf" size={20} color="#DC2626" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.docName, { color: colors.text }]} numberOfLines={1}>
                  {doc.name}
                </Text>
                <Text style={[styles.docSize, { color: colors.textSecondary }]}>
                  {(doc.size / 1024).toFixed(0)} KB
                </Text>
              </View>
              <Pressable onPress={() => dispatch({ type: 'REMOVE_DOC', index: i })}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
          ))}
          {s.documents.length < 5 && (
            <Pressable
              onPress={handlePickDocument}
              style={[styles.addDocBtn, { borderColor: colors.border }]}
            >
              <MaterialIcons name="attach-file" size={18} color={colors.textSecondary} />
              <Text style={[styles.addDocText, { color: colors.textSecondary }]}>
                Attach plans or documents (PDF)
              </Text>
            </Pressable>
          )}
        </View>

        {/* Location */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>LOCATION</ThemedText>
          <View style={[styles.locationInputWrap, { backgroundColor: '#fff', borderColor: colors.border }]}>
            <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.locationInput, { color: colors.text }]}
              placeholder="Suburb e.g. Surry Hills"
              placeholderTextColor={colors.textSecondary}
              value={s.suburb}
              onChangeText={handleSuburbChange}
            />
          </View>
          {locSuggestions.length > 0 && (
            <View style={[styles.suggestionsWrap, { backgroundColor: '#fff', borderColor: colors.border }]}>
              {locSuggestions.map((sub) => (
                <Pressable
                  key={sub}
                  onPress={() => selectSuburb(sub)}
                  style={({ pressed }) => [
                    styles.suggestionItem,
                    pressed && { backgroundColor: colors.tealBg },
                  ]}
                >
                  <Ionicons name="location" size={14} color={colors.teal} />
                  <Text style={[styles.suggestionText, { color: colors.text }]}>{sub}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <View style={[styles.locationInputWrap, { backgroundColor: '#fff', borderColor: colors.border }]}>
            <Text style={[styles.postcodePrefix, { color: colors.textSecondary }]}>Postcode</Text>
            <TextInput
              style={[styles.locationInput, { color: colors.text }]}
              placeholder="e.g. 2010"
              placeholderTextColor={colors.textSecondary}
              value={s.postcode}
              onChangeText={(t) => dispatch({ type: 'SET', field: 'postcode', value: t })}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
          <Pressable
            onPress={handleUseCurrentLocation}
            style={({ pressed }) => [styles.currentLocBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="navigate" size={14} color="#0F6E56" />
            <Text style={styles.currentLocText}>Use my current location</Text>
          </Pressable>
        </View>

        {/* Contact details */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
            CONTACT DETAILS (OPTIONAL)
          </ThemedText>
          <Text style={[styles.fieldHint, { color: colors.textSecondary, marginBottom: 8 }]}>
            Let builders contact you directly about this job.
          </Text>
          <View style={[styles.locationInputWrap, { backgroundColor: '#fff', borderColor: colors.border }]}>
            <Ionicons name="call-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.locationInput, { color: colors.text }]}
              placeholder="Phone number e.g. 0412 345 678"
              placeholderTextColor={colors.textSecondary}
              value={s.contactPhone}
              onChangeText={(t) => dispatch({ type: 'SET', field: 'contactPhone', value: t })}
              keyboardType="phone-pad"
              maxLength={15}
            />
          </View>
          <View style={[styles.locationInputWrap, { backgroundColor: '#fff', borderColor: colors.border }]}>
            <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.locationInput, { color: colors.text }]}
              placeholder="Email address"
              placeholderTextColor={colors.textSecondary}
              value={s.contactEmail}
              onChangeText={(t) => dispatch({ type: 'SET', field: 'contactEmail', value: t })}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={100}
            />
          </View>
        </View>

        {/* Enterprise-only fields */}
        {s.isEnterprise && (
          <View style={styles.fieldGroup}>
            <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
              {s.postingKind === 'contract' ? 'CONTRACT DETAILS' : 'PROJECT JOB DETAILS'}
            </ThemedText>
            <View style={[styles.locationInputWrap, { backgroundColor: '#fff', borderColor: colors.border }]}>
              <Ionicons name="cash-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.locationInput, { color: colors.text }]}
                placeholder="Budget (e.g. $5,000 - $10,000)"
                placeholderTextColor={colors.textSecondary}
                value={s.budget}
                onChangeText={(t) => dispatch({ type: 'SET', field: 'budget', value: t })}
              />
            </View>
            <View style={[styles.locationInputWrap, { backgroundColor: '#fff', borderColor: colors.border }]}>
              <Ionicons name="people-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.locationInput, { color: colors.text }]}
                placeholder="Workers needed"
                placeholderTextColor={colors.textSecondary}
                value={s.workersNeeded}
                onChangeText={(t) => dispatch({ type: 'SET', field: 'workersNeeded', value: t })}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>
            <View style={[styles.locationInputWrap, { backgroundColor: '#fff', borderColor: colors.border }]}>
              <Ionicons name="wallet-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.locationInput, { color: colors.text }]}
                placeholder={s.postingKind === 'contract' ? 'Estimated contract worth (e.g. $90k, $1,800/wk)' : 'Day rate (e.g. $450/day)'}
                placeholderTextColor={colors.textSecondary}
                value={s.dayRate}
                onChangeText={(t) => dispatch({ type: 'SET', field: 'dayRate', value: t })}
              />
            </View>
            <View style={[styles.locationInputWrap, { backgroundColor: '#fff', borderColor: colors.border }]}>
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.locationInput, { color: colors.text }]}
                placeholder={s.postingKind === 'contract' ? 'Contract length (e.g. 6 months, ongoing)' : 'Contract duration (e.g. 3 months)'}
                placeholderTextColor={colors.textSecondary}
                value={s.contractDuration}
                onChangeText={(t) => dispatch({ type: 'SET', field: 'contractDuration', value: t })}
              />
            </View>
            <View style={[styles.locationInputWrap, { backgroundColor: '#fff', borderColor: colors.border }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.locationInput, { color: colors.text }]}
                placeholder="Site requirements (e.g. White card required)"
                placeholderTextColor={colors.textSecondary}
                value={s.siteRequirements}
                onChangeText={(t) => dispatch({ type: 'SET', field: 'siteRequirements', value: t })}
              />
            </View>
          </View>
        )}
      </View>
    );
  }

  /* ───────────── Step 3: Review ───────────── */

  function renderStep3() {
    const urgencyOpt = URGENCY_OPTIONS.find((o) => o.value === s.urgency);
    const tradeDisplay = s.tradeType === 'Other' ? s.otherTrade : s.tradeType;

    return (
      <View style={styles.stepContent}>
        <ThemedText type="subtitle" style={{ marginBottom: 4 }}>
          Review your job
        </ThemedText>
        <ThemedText style={[styles.stepHint, { color: colors.textSecondary }]}>
          This is how tradies will see your job
        </ThemedText>

        {/* Preview card */}
        <View style={[styles.previewCard, { backgroundColor: '#fff', borderColor: colors.border }, Shadows.md]}>
          <View style={styles.previewHeader}>
            <Text style={[styles.previewTitle, { color: colors.text }]} numberOfLines={2}>
              {s.title}
            </Text>
            {urgencyOpt && (
              <View style={[styles.previewBadge, { backgroundColor: urgencyOpt.bg }]}>
                <Text style={[styles.previewBadgeText, { color: urgencyOpt.color }]}>
                  {urgencyOpt.label}
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.previewTradeBadge, { backgroundColor: '#E1F5EE' }]}>
            <Text style={styles.previewTradeText}>{tradeDisplay}</Text>
          </View>

          <Text style={[styles.previewDesc, { color: colors.textSecondary }]} numberOfLines={3}>
            {s.description}
          </Text>

          <View style={styles.previewLocationRow}>
            <Ionicons name="location" size={14} color={colors.textSecondary} />
            <Text style={[styles.previewLocationText, { color: colors.textSecondary }]}>
              {s.suburb}{s.postcode ? `, ${s.postcode}` : ''}
            </Text>
          </View>

          {s.photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {s.photos.map((p, i) => (
                <Image key={i} source={{ uri: p.uri }} style={styles.previewThumb} cachePolicy="disk" placeholder={{ blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH' }} />
              ))}
            </ScrollView>
          )}

          {s.documents.length > 0 && (
            <View style={styles.previewDocRow}>
              <MaterialIcons name="attach-file" size={14} color={colors.textSecondary} />
              <Text style={[styles.previewDocText, { color: colors.textSecondary }]}>
                {s.documents.length} document{s.documents.length > 1 ? 's' : ''} attached
              </Text>
            </View>
          )}

          {/* Site requirements — pinned to the bottom of the preview so
              tradies see the checklist they need to meet last, after the
              "what" and "where". */}
          {s.isEnterprise && s.siteRequirements.trim() ? (
            <View style={styles.previewReqRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.previewReqText, { color: colors.textSecondary }]}>
                Site requirements: {s.siteRequirements.trim()}
              </Text>
            </View>
          ) : null}

          <Text style={[styles.previewTimestamp, { color: colors.textSecondary }]}>
            Posted just now
          </Text>
        </View>

        {/* Edit shortcuts */}
        <View style={[styles.editSection, { backgroundColor: '#fff', borderColor: colors.border }]}>
          {[
            { label: 'Job title', value: s.title, step: 1 },
            { label: 'Trade', value: tradeDisplay, step: 1 },
            { label: 'Urgency', value: URGENCY_LABELS[s.urgency] ?? s.urgency, step: 1 },
            { label: 'Location', value: `${s.suburb}${s.postcode ? `, ${s.postcode}` : ''}`, step: 2 },
            { label: 'Description', value: s.description.slice(0, 60) + (s.description.length > 60 ? '...' : ''), step: 2 },
            { label: 'Photos', value: `${s.photos.length} attached`, step: 2 },
            { label: 'Documents', value: `${s.documents.length} attached`, step: 2 },
            { label: 'Phone', value: s.contactPhone || 'Not provided', step: 2 },
            { label: 'Email', value: s.contactEmail || 'Not provided', step: 2 },
          ].map((item, i) => (
            <Pressable
              key={i}
              onPress={() => animateToStep(s.step, item.step)}
              style={({ pressed }) => [
                styles.editRow,
                i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderLight },
                pressed && { backgroundColor: colors.tealBg },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.editLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                <Text style={[styles.editValue, { color: colors.text }]} numberOfLines={1}>
                  {item.value}
                </Text>
              </View>
              <MaterialIcons name="edit" size={16} color={colors.textSecondary} />
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  /* ───────────── Main render ───────────── */

  return (
    <AppShell
      title={isEditMode ? 'Edit Job' : `Post a Job  ·  ${s.step}/${totalSteps}`}
      showBack
      onBackPress={() => {
        if (s.step > 1) { animateToStep(s.step, s.step - 1); return; }
        // From Step 1, a business user goes back to the Personal/Business choice.
        if (!isEditMode && s.canBeEnterprise && s.posterMode !== 'unset') {
          dispatch({ type: 'SET', field: 'posterMode', value: 'unset' });
          return;
        }
        router.back();
      }}
    >
      <ReAnimated.View entering={FadeInUp.duration(300).delay(100)} style={{ flex: 1 }}>
      {/* Trust bar */}
      <View style={[styles.trustBar, { backgroundColor: '#E1F5EE' }]}>
        <MaterialIcons name="bolt" size={14} color="#0F6E56" />
        <Text style={styles.trustBarText}>Builders typically respond within 2 hours</Text>
      </View>

      {/* Progress indicator */}
      {renderProgressBar()}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              transform: [{ translateX: slideAnim }],
              opacity: fadeAnim,
            }}
          >
            {s.step === 1 && renderStep1()}
            {s.step === 2 && renderStep2()}
            {isWhenHowStep && (
              <View style={styles.stepContent}>
                <StepWhenAndHow
                  values={s.whenHow}
                  onChange={(next) => dispatch({ type: 'SET', field: 'whenHow', value: next })}
                />
              </View>
            )}
            {isReviewStep && renderStep3()}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
      </ReAnimated.View>

      {/* Bottom button */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: colors.canvas }]}>
        {s.step < totalSteps ? (
          <Pressable
            onPress={handleContinue}
            disabled={!currentStepValid}
            style={({ pressed }) => [
              styles.primaryBtn,
              !currentStepValid && { opacity: 0.4 },
              pressed && { opacity: 0.85 },
            ]}
          >
            <LinearGradient
              colors={currentStepValid ? ['#0d9488', '#0f766e'] : ['#9CA3AF', '#9CA3AF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGrad}
            >
              <Text style={styles.primaryBtnText}>Continue</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleSubmit}
            disabled={s.submitting}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
          >
            <LinearGradient
              colors={['#0d9488', '#0f766e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGrad}
            >
              {s.submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="send" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>{isEditMode ? 'Save Changes' : 'Post Job — Get Quotes'}</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        )}
      </View>
      {consentModal}
    </AppShell>
  );
}

/* ───────────── Fix: need React import for useState used inline ───────────── */
import React from 'react';

/* ───────────── Styles ───────────── */

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  headerBack: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    ...Type.h2,
    color: '#fff',
  },
  headerSubtitle: {
    ...Type.caption,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginTop: 1,
  },
  headerStepText: {
    ...Type.captionSemiBold,
    color: 'rgba(255,255,255,0.6)',
  },

  /* Trust bar */
  trustBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  trustBarText: {
    ...Type.label,
    fontWeight: '600',
    color: '#0F6E56',
  },

  /* Progress */
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 40,
    gap: 0,
  },
  progressStep: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  progressDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  progressLine: {
    flex: 1,
    height: 2,
  },
  progressDot: {
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 20,
  },
  progressLabel: {
    ...Type.label,
    fontWeight: '400',
    letterSpacing: 0.3,
  },

  /* Scroll / step content */
  scrollContent: {
    paddingBottom: 24,
  },
  stepContent: {
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  stepHint: {
    ...Type.body,
    marginBottom: 8,
  },

  /* Poster-type pre-step (Personal / Business) */
  posterWrap: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 14,
  },
  posterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: 18,
  },
  posterCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterCardTitle: {
    ...Type.h3,
    fontWeight: '700',
  },
  posterCardDesc: {
    ...Type.caption,
    marginTop: 2,
    lineHeight: 18,
  },

  /* Job vs Contract picker (Step 1, business) */
  kindRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kindCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    padding: 14,
    gap: 4,
  },
  kindTitle: {
    ...Type.bodySemiBold,
    fontWeight: '700',
  },
  kindDesc: {
    ...Type.caption,
    lineHeight: 16,
  },

  /* Fields */
  fieldGroup: {
    gap: 8,
  },
  label: {
    ...Type.label,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 15,
  },
  inputLarge: {
    fontSize: 17,
    height: 52,
  },
  multilineInput: {
    minHeight: 130,
    height: undefined,
    paddingTop: 14,
    paddingBottom: 30,
    textAlignVertical: 'top',
  },
  fieldHint: {
    ...Type.caption,
    fontStyle: 'italic',
  },

  /* Chips */
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    ...Type.bodySemiBold,
  },
  specChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specChip: {
    flexDirection: 'row',
    gap: 6,
  },
  aiSuggestedLabel: {
    ...Type.micro,
    color: '#0F6E56',
    textAlign: 'center',
    marginBottom: 2,
  },

  /* Urgency cards */
  urgencyRow: {
    flexDirection: 'row',
    gap: 10,
  },
  urgencyCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  urgencyLabel: {
    ...Type.captionSemiBold,
    fontWeight: '700',
  },
  urgencySubtitle: {
    ...Type.micro,
    fontWeight: '500',
    textAlign: 'center',
  },

  /* AI card */
  aiCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#0F6E56',
    borderRadius: 10,
    padding: 14,
    gap: 8,
    flexDirection: 'column',
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiCardTitle: {
    ...Type.captionSemiBold,
    fontWeight: '700',
    color: '#0F6E56',
  },
  aiCardText: {
    ...Type.caption,
    color: '#0F6E56',
    fontWeight: '500',
  },
  aiSuggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  aiSuggestionText: {
    ...Type.body,
    color: '#1e293b',
    flex: 1,
  },
  aiSuggestionBold: {
    fontWeight: '700',
    color: '#0F6E56',
  },
  aiClarifyText: {
    ...Type.caption,
    color: '#64748b',
    fontStyle: 'italic',
  },

  /* AI help button */
  aiHelpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  aiHelpBtnText: {
    ...Type.captionSemiBold,
    color: '#0F6E56',
  },

  /* Char count */
  charCount: {
    ...Type.label,
    fontWeight: '500',
    position: 'absolute',
    bottom: 10,
    right: 14,
  },

  /* Photos */
  photoRow: {
    gap: 10,
    paddingRight: 8,
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  coverBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15,110,86,0.85)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  coverBadgeText: {
    ...Type.micro,
    color: '#fff',
  },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setCoverBtn: {
    position: 'absolute',
    bottom: 4,
    left: 4,
  },
  setCoverText: {
    fontSize: 8,
    color: '#fff',
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPhotoText: {
    ...Type.micro,
    fontWeight: '600',
  },

  /* Documents */
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  docName: {
    ...Type.captionSemiBold,
  },
  docSize: {
    ...Type.label,
    fontWeight: '400',
  },
  addDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  addDocText: {
    ...Type.caption,
    fontWeight: '500',
  },

  /* Location */
  locationInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  locationInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  postcodePrefix: {
    ...Type.captionSemiBold,
  },
  suggestionsWrap: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: -4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  suggestionText: {
    ...Type.body,
  },
  currentLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  currentLocText: {
    ...Type.captionSemiBold,
    color: '#0F6E56',
  },

  /* Review / Preview */
  previewCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  previewTitle: {
    ...Type.h3,
    fontWeight: '700',
    flex: 1,
  },
  previewBadge: {
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  previewBadgeText: {
    ...Type.label,
  },
  previewTradeBadge: {
    alignSelf: 'flex-start',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  previewTradeText: {
    ...Type.label,
    fontWeight: '600',
    color: '#0F6E56',
  },
  previewDesc: {
    ...Type.caption,
  },
  previewLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewLocationText: {
    ...Type.caption,
  },
  previewThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 6,
  },
  previewDocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  previewDocText: {
    ...Type.caption,
  },
  previewReqRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  previewReqText: {
    ...Type.caption,
    flex: 1,
    lineHeight: 18,
  },
  previewTimestamp: {
    ...Type.label,
    fontWeight: '400',
    marginTop: 4,
  },

  /* Edit shortcuts */
  editSection: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  editLabel: {
    ...Type.label,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  editValue: {
    ...Type.body,
    fontWeight: '500',
    marginTop: 1,
  },

  /* Bottom bar */
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  primaryBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0d9488',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  primaryBtnGrad: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    ...Type.btnPrimary,
    color: '#fff',
  },
  outlineBtn: {
    borderWidth: 1.5,
    borderRadius: 14,
    height: 50,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {
    ...Type.btnSecondary,
  },

  /* Success screen */
  successContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 24,
  },
  successCheckCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0F6E56',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    textAlign: 'center',
  },
  successSubtitle: {
    ...Type.body,
    textAlign: 'center',
  },
  nextStepsCard: {
    width: '100%',
    borderRadius: 14,
    padding: 20,
    gap: 14,
  },
  nextStepsHeading: {
    ...Type.bodySemiBold,
    fontWeight: '700',
  },
  nextStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nextStepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextStepText: {
    ...Type.body,
    fontWeight: '500',
  },
  successButtons: {
    width: '100%',
    gap: 10,
  },
  browseLink: {
    ...Type.bodySemiBold,
    marginTop: 8,
  },

  /* Auth */
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  centeredText: {
    textAlign: 'center',
  },
  centeredSubtext: {
    ...Type.body,
    textAlign: 'center',
  },
});
