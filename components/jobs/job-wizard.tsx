/**
 * JobWizard — port of ~/bldesy-web/components/jobs/job-wizard.tsx.
 *
 *   Customer:   Details → Description → Location → Review
 *   Enterprise: Details → Description → When & How → Location → Review
 *
 * Accounts with an enterprise_profiles row pick "Post as a homeowner" /
 * "Post as a business" first. Submit goes through `createJob` (POST /api/jobs);
 * the server's own error copy (waitlist_mode, payment_required, post_limit_reached,
 * enterprise_not_approved, rate_limited, validation) renders verbatim.
 *
 * App differences from the web (deliberate, see the port report):
 *   - guests may fill the wizard; on submit the draft is parked in memory and
 *     they are sent to login (the web shows "Sign in to post a job" up front);
 *   - the enterprise PaymentGate (Stripe checkout) is not ported — the API's
 *     402 message is shown instead (iOS sells nothing);
 *   - photo/document uploads need a session, so guests don't see the uploaders.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { Button, Card, useToast } from '@/components/ui';
import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRoles, useUser } from '@/lib/auth-context';
import { createJob } from '@/lib/data/jobs';
import { CONTACT_NETWORK_ERROR } from '@/lib/data/public-forms';
import { ROUTES } from '@/lib/routes';
import type { BuilderSpecialisations } from '@/lib/web/trade-specialisations';
import type { ContractRole, ContractType, PostingKind } from '@/types/database';

import { EnterpriseDetails } from './enterprise-details';
import { ErrorBanner } from './error-banner';
import { clearJobDraft, saveJobDraft, takeJobDraft } from './job-draft';
import { DOC_MIMES, uploadJobMedia, validateDocFile, validateImageFile, type PickedFile } from './job-media';
import { PhotoGrid } from './photo-uploader';
import { StepDescription, type DescriptionField } from './step-description';
import { StepDetails, type DetailsField } from './step-details';
import { StepIndicator } from './step-indicator';
import { StepLocation, type LocationField } from './step-location';
import { StepReview } from './step-review';
import { INITIAL_WHEN_AND_HOW, StepWhenAndHow, type WhenAndHowFields } from './when-and-how-step';
import {
  INITIAL_FORM,
  buildCreateJobInput,
  emptyContractRole,
  isWhenAndHowStep,
  locationStepNumber,
  normaliseContractRoles,
  postedDestination,
  postedNoun,
  reviewStepNumber,
  specialisationSlugsFor,
  stepLabelsFor,
  submitLabel,
  totalStepsFor,
  validateStep,
  type FormFields,
} from './wizard-model';

type StringField = DetailsField | DescriptionField | LocationField | 'postingKind' | 'workersNeeded';

/** App copy (legacy Post a Job screen) — the OS denied photo-library access. */
const PHOTO_PERMISSION_DENIED = 'Photo access denied — enable it in Settings to upload';

interface JobWizardProps {
  /** The page header (h1 + sub) rendered inside the same scroll view so "scroll to top" lands on it. */
  header?: ReactNode;
}

export function JobWizard({ header }: JobWizardProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const toast = useToast();
  const { authedUser, loading: authLoading } = useUser();
  const roles = useRoles();

  const [step, setStep] = useState(1);
  const [formFields, setFormFields] = useState<FormFields>(INITIAL_FORM);
  const [whenAndHow, setWhenAndHow] = useState<WhenAndHowFields>(INITIAL_WHEN_AND_HOW);
  // Which contract role's tab is open in the Multiple-roles editor.
  const [activeRoleIndex, setActiveRoleIndex] = useState(0);
  // Sub-trades the poster wants, keyed by trade slug. One trade per job, so this
  // holds at most one key; flattened to a slug array on submit.
  const [specialisations, setSpecialisations] = useState<BuilderSpecialisations>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailPreFilled, setEmailPreFilled] = useState(false);
  const [isEnterprise, setIsEnterprise] = useState(false);
  // posterTypeChosen = the user has confirmed which hat they're wearing. Accounts
  // with an enterprise_profiles row see the selector; customer-only users skip it.
  const [posterTypeChosen, setPosterTypeChosen] = useState(false);

  // Photo / document uploads (URLs in the enterprise-media bucket)
  const [jobPhotos, setJobPhotos] = useState<string[]>([]);
  const [jobDocs, setJobDocs] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [posted, setPosted] = useState<{ isEnterprise: boolean; postingKind: PostingKind } | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  // A guest who was sent to log in mid-wizard comes back to their draft.
  useEffect(() => {
    const draft = takeJobDraft();
    if (!draft) return;
    setFormFields(draft.form);
    setWhenAndHow(draft.whenAndHow);
    setSpecialisations(draft.specialisations);
    setJobPhotos(draft.jobPhotos);
    setJobDocs(draft.jobDocs);
    setIsEnterprise(draft.isEnterprise);
    setPosterTypeChosen(true);
    setStep(draft.step);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [step, posterTypeChosen, posted]);

  const rolesReady = !authLoading && (!authedUser || !roles.loading);
  const canBeEnterprise = Boolean(authedUser) && roles.enterpriseStatus !== null && roles.enterpriseStatus !== 'none';

  // No enterprise row (or a guest) — only the customer path is possible, so the
  // form renders straight away.
  useEffect(() => {
    if (rolesReady && !canBeEnterprise) setPosterTypeChosen(true);
  }, [rolesReady, canBeEnterprise]);

  // Pre-fill contact email from user once auth is resolved (phone-only accounts have "").
  useEffect(() => {
    if (authedUser?.email && !emailPreFilled && !formFields.contactEmail) {
      setFormFields((prev) => ({ ...prev, contactEmail: authedUser.email! }));
      setEmailPreFilled(true);
    }
  }, [authedUser, emailPreFilled, formFields.contactEmail]);

  const handleChange = useCallback((field: StringField, value: string) => {
    setFormFields((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field on change
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  // Step 1 changes: when the trade switches, any previously-picked specialities
  // belong to the old trade, so reset them.
  const handleDetailsChange = useCallback(
    (field: DetailsField, value: string) => {
      if (field === 'tradeCategory') {
        setSpecialisations((prev) => (formFields.tradeCategory === value ? prev : {}));
      }
      handleChange(field, value);
    },
    [formFields.tradeCategory, handleChange],
  );

  const specialisationSlugs = specialisationSlugsFor(specialisations, formFields.tradeCategory);

  // Contract role editors.
  const setContractType = (t: ContractType) => setFormFields((prev) => ({ ...prev, contractType: t }));
  const updateRole = (index: number, patch: Partial<ContractRole>) =>
    setFormFields((prev) => ({
      ...prev,
      contractRoles: prev.contractRoles.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    }));
  const addRole = () => {
    // Open the new role's tab as it's added.
    setActiveRoleIndex(formFields.contractRoles.length);
    setFormFields((prev) => ({ ...prev, contractRoles: [...prev.contractRoles, emptyContractRole()] }));
  };
  const removeRole = (index: number) => {
    setFormFields((prev) => ({ ...prev, contractRoles: prev.contractRoles.filter((_, i) => i !== index) }));
    // Keep the open tab within range after removal.
    setActiveRoleIndex((cur) => Math.max(0, Math.min(cur, formFields.contractRoles.length - 2)));
  };

  const activeContractRoles = normaliseContractRoles(formFields);
  const totalSteps = totalStepsFor(isEnterprise);
  const stepLabels = stepLabelsFor(isEnterprise);
  const reviewStep = reviewStepNumber(isEnterprise);
  const locationStep = locationStepNumber(isEnterprise);

  /* ── Uploads ─────────────────────────────────────────────────────────── */

  async function handlePhotoUpload() {
    if (!authedUser) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.show(PHOTO_PERMISSION_DENIED, { variant: 'warning' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const picked: PickedFile = {
      uri: asset.uri,
      name: asset.fileName ?? undefined,
      size: asset.fileSize ?? undefined,
      mimeType: asset.mimeType ?? undefined,
    };
    const err = validateImageFile(picked);
    if (err) {
      toast.show(err, { variant: 'warning' });
      return;
    }
    setUploadingPhoto(true);
    const url = await uploadJobMedia(picked, authedUser.id, 'photo');
    if (url) setJobPhotos((prev) => [...prev, url]);
    setUploadingPhoto(false);
  }

  async function handleDocUpload() {
    if (!authedUser) return;
    let result: DocumentPicker.DocumentPickerResult;
    try {
      result = await DocumentPicker.getDocumentAsync({ type: [...DOC_MIMES], multiple: false });
    } catch {
      return;
    }
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const picked: PickedFile = { uri: asset.uri, name: asset.name, size: asset.size ?? undefined, mimeType: asset.mimeType ?? undefined };
    const err = validateDocFile(picked);
    if (err) {
      toast.show(err, { variant: 'warning' });
      return;
    }
    setUploadingDoc(true);
    const url = await uploadJobMedia(picked, authedUser.id, 'doc');
    if (url) setJobDocs((prev) => [...prev, url]);
    setUploadingDoc(false);
  }

  /* ── Navigation ──────────────────────────────────────────────────────── */

  const handleNext = () => {
    const stepErrors = validateStep(step, formFields, isEnterprise);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, totalSteps));
  };

  const handleBack = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleEdit = (targetStep: number) => {
    setErrors({});
    setStep(targetStep);
  };

  function sendToLogin() {
    saveJobDraft({ form: formFields, whenAndHow, specialisations, jobPhotos, jobDocs, isEnterprise, step });
    router.push({ pathname: ROUTES.login, params: { redirect: ROUTES.postJob } } as Href);
  }

  async function handleSubmit() {
    if (!authedUser) {
      sendToLogin();
      return;
    }
    setPending(true);
    setServerError(null);
    try {
      const res = await createJob(
        buildCreateJobInput({ form: formFields, whenAndHow, specialisations, jobPhotos, jobDocs, isEnterprise }),
      );
      if (res.ok) {
        clearJobDraft();
        setPosted({ isEnterprise, postingKind: formFields.postingKind });
      } else if (res.status === 401) {
        sendToLogin();
      } else {
        setServerError(res.error);
      }
    } catch {
      setServerError(CONTACT_NETWORK_ERROR);
    } finally {
      setPending(false);
    }
  }

  function resetForAnother() {
    setPosted(null);
    setFormFields({ ...INITIAL_FORM, contactEmail: authedUser?.email || '', contractRoles: [emptyContractRole()] });
    setWhenAndHow(INITIAL_WHEN_AND_HOW);
    setSpecialisations({});
    setJobPhotos([]);
    setJobDocs([]);
    setErrors({});
    setServerError(null);
    setActiveRoleIndex(0);
    setStep(1);
    // A business account is re-asked which hat it's wearing, as a fresh /post-job would.
    if (canBeEnterprise) {
      setPosterTypeChosen(false);
      setIsEnterprise(false);
    }
  }

  /* ── Render ──────────────────────────────────────────────────────────── */

  const scroll = (children: ReactNode) => (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {header}
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // Loading state (auth + roles still resolving)
  if (!rolesReady) {
    return scroll(
      <View style={styles.centered}>
        <ActivityIndicator color={c.primary} />
      </View>,
    );
  }

  // Poster-type selector — shown to users who have an enterprise_profiles row.
  if (canBeEnterprise && !posterTypeChosen) {
    return scroll(
      <View style={styles.stack}>
        <Text style={[styles.selectorSub, { color: c.textSecondary }]}>
          You can post as your company or as a homeowner — pick which fits this job.
        </Text>
        <PosterTypeCard
          accent={c.primary}
          icon="home-outline"
          title="Post as a homeowner"
          blurb="A one-off job for your home or property. Free to post."
          c={c}
          onPress={() => {
            setIsEnterprise(false);
            setPosterTypeChosen(true);
          }}
        />
        <PosterTypeCard
          accent={c.indigo}
          icon="business-outline"
          title="Post as a business"
          blurb="A project job or contract on behalf of your company. Choose Job or Contract on the next step."
          c={c}
          onPress={() => {
            setIsEnterprise(true);
            setPosterTypeChosen(true);
          }}
        />
      </View>,
    );
  }

  // Success state
  if (posted) {
    const noun = postedNoun(posted.postingKind);
    const dest = postedDestination(posted.isEnterprise, posted.postingKind);
    const href = (dest.path === '/my-jobs' ? ROUTES.myJobs : dest.path) as Href;
    return scroll(
      <Card padding={Spacing['3xl']} style={styles.successCard}>
        <View style={[styles.successIcon, { backgroundColor: c.success + '1A' }]}>
          <Ionicons name="checkmark" size={32} color={c.success} />
        </View>
        <Text style={[styles.successTitle, { color: c.textPrimary }]}>{noun} Posted!</Text>
        <Text style={[styles.successBody, { color: c.textSecondary }]}>
          Your {noun.toLowerCase()} has been posted! Tradies in your area will be notified.
        </Text>
        <Button size="lg" onPress={() => router.replace(href)}>
          {dest.label}
        </Button>
        <Pressable accessibilityRole="link" onPress={resetForAnother} hitSlop={8}>
          <Text style={[styles.postAnother, { color: c.primary }]}>Post Another {noun}</Text>
        </Pressable>
      </Card>,
    );
  }

  const isContract = formFields.postingKind === 'contract';

  return scroll(
    <View style={styles.stack}>
      <StepIndicator currentStep={step} labels={stepLabels} />

      <Card padding={Spacing['2xl']} style={styles.card}>
        {/* Server error */}
        {serverError && step === reviewStep ? (
          <View style={{ marginBottom: Spacing['2xl'] }}>
            <ErrorBanner message={serverError} onDismiss={() => setServerError(null)} />
          </View>
        ) : null}

        {/* Step content */}
        <View style={styles.stepBody}>
          {step === 1 ? (
            <View style={styles.stack}>
              {/* Job vs Contract picker — enterprise users only */}
              {isEnterprise ? (
                <View>
                  <Text style={[styles.kindLabel, { color: c.textSecondary }]}>WHAT ARE YOU POSTING?</Text>
                  <View style={styles.kindRow}>
                    <KindCard
                      active={!isContract}
                      title="Job"
                      blurb="One trade for a single job — e.g. 3 carpenters for a fit-out. Pick the trade and how many workers you need."
                      c={c}
                      onPress={() => handleChange('postingKind', 'job')}
                    />
                    <KindCard
                      active={isContract}
                      title="Contract"
                      blurb="Several trades, or ongoing work — bundle a role per trade (count & rate each), or build a talent pool."
                      c={c}
                      onPress={() => handleChange('postingKind', 'contract')}
                    />
                  </View>
                  <Text style={[styles.kindHint, { color: c.textSecondary }]}>
                    Need more than one trade on a single post? Choose{' '}
                    <Text style={[styles.kindHintStrong, { color: c.indigo }]}>Contract → Multiple roles</Text>.
                  </Text>
                </View>
              ) : null}

              <StepDetails
                title={formFields.title}
                tradeCategory={formFields.tradeCategory}
                urgency={formFields.urgency}
                onChange={handleDetailsChange}
                errors={errors}
                specialisations={specialisations}
                onSpecialisationsChange={setSpecialisations}
                canUseAi={Boolean(authedUser)}
              />

              {/* Photo uploads — homeowner flow only. Enterprise posters upload via
                  "Site Photos & Plans" inside Project Job Details below. Needs a session. */}
              {!isEnterprise && authedUser ? (
                <View style={[styles.photoBox, { borderColor: c.border, backgroundColor: c.canvas }]}>
                  <Text style={[styles.photoLabel, { color: c.textPrimary }]}>Photos</Text>
                  <Text style={[styles.photoHint, { color: c.textSecondary }]}>
                    Upload photos of the job site to help tradies understand what&apos;s needed.
                  </Text>
                  <PhotoGrid
                    photos={jobPhotos}
                    uploading={uploadingPhoto}
                    onAdd={handlePhotoUpload}
                    onRemove={(i) => setJobPhotos((prev) => prev.filter((_, j) => j !== i))}
                  />
                </View>
              ) : null}

              {/* Enterprise extra fields */}
              {isEnterprise ? (
                <EnterpriseDetails
                  postingKind={formFields.postingKind}
                  contractType={formFields.contractType}
                  contractRoles={formFields.contractRoles}
                  activeRoleIndex={activeRoleIndex}
                  workersNeeded={formFields.workersNeeded}
                  rolesError={errors.contractRoles}
                  onChangeWorkers={(v) => handleChange('workersNeeded', v)}
                  onChangeContractType={setContractType}
                  onUpdateRole={updateRole}
                  onAddRole={addRole}
                  onRemoveRole={removeRole}
                  onSelectRoleTab={setActiveRoleIndex}
                  photos={jobPhotos}
                  docs={jobDocs}
                  uploadingPhoto={uploadingPhoto}
                  uploadingDoc={uploadingDoc}
                  onAddPhoto={handlePhotoUpload}
                  onRemovePhoto={(i) => setJobPhotos((prev) => prev.filter((_, j) => j !== i))}
                  onAddDoc={handleDocUpload}
                  onRemoveDoc={(i) => setJobDocs((prev) => prev.filter((_, j) => j !== i))}
                />
              ) : null}
            </View>
          ) : null}

          {step === 2 ? (
            <StepDescription
              description={formFields.description}
              budget={formFields.budget}
              tradeCategory={formFields.tradeCategory}
              title={formFields.title}
              onChange={handleChange}
              errors={errors}
              canUseAi={Boolean(authedUser)}
            />
          ) : null}

          {/* Enterprise-only "When and how" — employment terms + requirements. */}
          {isWhenAndHowStep(step, isEnterprise) ? <StepWhenAndHow values={whenAndHow} onChange={setWhenAndHow} /> : null}

          {step === locationStep ? (
            <StepLocation
              suburb={formFields.suburb}
              postcode={formFields.postcode}
              contactEmail={formFields.contactEmail}
              onChange={handleChange}
              errors={errors}
            />
          ) : null}

          {step === reviewStep ? (
            <StepReview
              formData={formFields}
              specialisations={specialisationSlugs}
              contractRoles={activeContractRoles}
              contractType={formFields.contractType}
              onEdit={handleEdit}
              locationStep={locationStep}
            />
          ) : null}
        </View>

        {/* Navigation buttons */}
        <View style={styles.navRow}>
          {step > 1 ? (
            <Button variant="ghost" onPress={handleBack} disabled={pending}>
              Back
            </Button>
          ) : (
            <View />
          )}
          {step < reviewStep ? (
            <Button onPress={handleNext}>Next</Button>
          ) : (
            <Button onPress={handleSubmit} disabled={pending} loading={pending}>
              {submitLabel(formFields.postingKind, pending)}
            </Button>
          )}
        </View>
      </Card>
    </View>,
  );
}

/* ── Sub-components ───────────────────────────────────────────────────── */

function PosterTypeCard({
  accent,
  icon,
  title,
  blurb,
  c,
  onPress,
}: {
  accent: string;
  icon: 'home-outline' | 'business-outline';
  title: string;
  blurb: string;
  c: Record<string, string>;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.posterCard,
        Shadows.sm,
        { backgroundColor: c.surface, borderColor: pressed ? accent + '66' : c.border },
      ]}
    >
      <View style={[styles.posterIcon, { backgroundColor: accent + '1A' }]}>
        <Ionicons name={icon} size={24} color={accent} />
      </View>
      <Text style={[styles.posterTitle, { color: c.textPrimary }]}>{title}</Text>
      <Text style={[styles.posterBlurb, { color: c.textSecondary }]}>{blurb}</Text>
      <View style={styles.posterContinue}>
        <Text style={[styles.posterContinueText, { color: accent }]}>Continue</Text>
        <Ionicons name="arrow-forward" size={16} color={accent} />
      </View>
    </Pressable>
  );
}

function KindCard({
  active,
  title,
  blurb,
  c,
  onPress,
}: {
  active: boolean;
  title: string;
  blurb: string;
  c: Record<string, string>;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      onPress={onPress}
      style={[
        styles.kindCard,
        {
          borderColor: active ? c.indigo : c.border,
          borderWidth: active ? 2 : 1,
          backgroundColor: active ? c.indigo + '0D' : c.surface,
        },
      ]}
    >
      <Text style={[styles.kindTitle, { color: c.textPrimary }]}>{title}</Text>
      <Text style={[styles.kindBlurb, { color: c.textSecondary }]}>{blurb}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing['5xl'],
    gap: Spacing['2xl'],
  },
  stack: { gap: Spacing['2xl'] },
  centered: { minHeight: 240, alignItems: 'center', justifyContent: 'center' },
  card: { marginTop: Spacing.sm },
  stepBody: { minHeight: 260 },
  navRow: {
    marginTop: Spacing['3xl'],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  selectorSub: { fontSize: 14, fontFamily: FontFamily.body, textAlign: 'center' },
  posterCard: {
    borderWidth: 2,
    borderRadius: Radius.xl,
    padding: Spacing['2xl'],
    gap: 4,
  },
  posterIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  posterTitle: { fontSize: 18, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  posterBlurb: { fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body },
  posterContinue: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.md },
  posterContinueText: { fontSize: 14, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  kindLabel: { fontSize: 12, fontFamily: FontFamily.bodySemiBold, fontWeight: '600', letterSpacing: 0.6, marginBottom: Spacing.sm },
  kindRow: { gap: Spacing.md },
  kindCard: { borderRadius: Radius.xl, padding: Spacing.lg, gap: 4 },
  kindTitle: { fontSize: 14, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  kindBlurb: { fontSize: 12, lineHeight: 18, fontFamily: FontFamily.body },
  kindHint: { fontSize: 11, lineHeight: 16, fontFamily: FontFamily.body, marginTop: Spacing.sm },
  kindHintStrong: { fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  photoBox: { borderWidth: 1, borderRadius: Radius.xl, padding: Spacing.lg, gap: 4 },
  photoLabel: { fontSize: 12, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  photoHint: { fontSize: 12, lineHeight: 18, fontFamily: FontFamily.body, marginBottom: Spacing.sm },
  successCard: { alignItems: 'center', gap: Spacing.md },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  successTitle: { fontSize: 20, fontFamily: FontFamily.bodyBold, fontWeight: '700', textAlign: 'center' },
  successBody: { fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body, textAlign: 'center', marginBottom: Spacing.md },
  postAnother: { fontSize: 14, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
});
