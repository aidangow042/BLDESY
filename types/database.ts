// AUTO-SYNCED from ~/bldesy-web/types/database.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// JSONB sub-structures for builder_profiles
export interface ProjectVideo {
  /** Public URL in the builder-videos bucket. */
  url: string;
  /** Poster frame captured at upload time (builder-media bucket) — the frame
   * is what runs through the AI image-moderation pipeline for the video. */
  poster: string | null;
}

export interface ProjectItem {
  title: string;
  description: string;
  images: string[];
  /** Optional — projects created before video support won't have this key. */
  videos?: ProjectVideo[] | null;
  before_image: string | null;
  after_image: string | null;
  cost_range: string | null;
  testimonial: string | null;
}

export interface Credentials {
  abn_verified: boolean;
  license_verified: boolean;
  insurance_verified: boolean;
  memberships: string[];
}

// Structured credential verification data (credentials_verified JSONB column)
export interface AbnVerification {
  number: string;
  verified: boolean;
  verified_at: string | null;
  entity_name: string;
  status: string;
  /** Last ABR re-check by the credential-recheck cron (acts as the batch cursor). */
  last_checked_at?: string | null;
  /** Set when the last ABR lookup failed or returned not-found; cleared on success. */
  last_check_error?: string | null;
}

export interface LicenceVerification {
  type: string;
  licence_number: string;
  verified: boolean;
  verified_at: string | null;
  status: string;
  category: string;
  display_label: string;
  source: "nsw_trades_api" | "nsw_security_api" | "nsw_asbestos_api" | "nsw_design_api" | "nsw_highrisk_api" | "nsw_whitecard_api" | "qbcc_register" | "admin" | "no_licence_required";
  verification_method?: "api" | "admin";
  /** state code (NSW/QLD) — denormalised so display can group by state */
  state?: string;
  /** 'individual' = personal licence; 'business' = company/corporate licence */
  licence_holder_type?: "individual" | "business";
  /** licensee name returned by the upstream register at verification time */
  matched_name?: string | null;
}

export interface InsuranceCheck {
  id:
    | "is_certificate"
    | "policy_number"
    | "insurer"
    | "coverage"
    | "expiry"
    | "name_match";
  label: string;
  status: "ok" | "warn" | "fail";
  detail: string;
}

export type InsuranceKind =
  | "public_liability"
  | "professional_indemnity"
  | "workers_compensation";

export interface InsuranceCertificate {
  verified: boolean;
  verified_at: string | null;
  verified_by: string;
  verdict?: "PASS" | "REVIEW" | "FAIL";
  confidence?: number;
  checks?: InsuranceCheck[];
  checked_at?: string;
  insurer_name?: string | null;
  matched_insurer?: string | null;
  policy_number?: string | null;
  insured_name?: string | null;
  coverage_amount?: string | null;
  coverage_amount_dollars?: number | null;
  expiry_date?: string | null;
  policy_type?: string | null;
  document_path?: string | null;
  /** User-typed policy name supplied at upload time. Used as AI context. */
  policy_name?: string | null;
}

export interface InsuranceVerification {
  public_liability?: InsuranceCertificate;
  professional_indemnity?: InsuranceCertificate;
  workers_compensation?: InsuranceCertificate;
}

/**
 * AI-verified government ID record. Persisted into
 * credentials_verified.government_id by /api/verify-government-id. The
 * document image itself lives in the private-credentials storage bucket;
 * we never persist the actual licence/passport number.
 */
export interface GovernmentIdVerification {
  verified: boolean;
  verified_at: string;
  document_type: "drivers_licence" | "passport" | "digital_licence" | null;
  document_path: string;
  extracted_name: string | null;
  /** Name we matched against (White Card holder for tradies, account name for enterprises). */
  matched_against: string | null;
  match_target: "white_card_holder" | "account_name" | null;
  /** User confirmed a fuzzy near-miss spelling at upload (OCR slip, not a mismatch). */
  name_confirmed_by_user?: boolean;
  expiry_date: string | null;
  issues: string[];
  /** Whether the structured tamper-evidence layer (PDF417 / MRZ) was exercised and passed. */
  structured_check?: {
    kind: "pdf417" | "mrz";
    decoded: boolean;
    valid: boolean;
  } | null;
}

export interface CredentialsVerified {
  abn?: AbnVerification;
  licences?: LicenceVerification[];
  insurance?: InsuranceVerification;
  government_id?: GovernmentIdVerification;
  state?: string;
}

/** One line-item in a BLDESY Score pillar breakdown. */
export interface BldesyScoreItem {
  key: string;
  label: string;
  ok: boolean;
  points: number;
  max: number;
  detail?: string;
}

/** The stored per-pillar breakdown behind a builder's BLDESY Score. */
export interface BldesyScoreBreakdown {
  verification: BldesyScoreItem[];
  reputation: BldesyScoreItem[];
  verification_points: number;
  reputation_points: number;
}

/** A single quality flag forcing human review (never auto-decline). */
export interface QualityFlag {
  type: string;
  evidence: string;
  source_url?: string | null;
  severity?: "low" | "medium" | "high";
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface TeamMember {
  name: string;
  role: string;
  photo_url: string | null;
}

export interface EnterprisePastProject {
  title: string;
  description: string;
  photo_urls: string[];
  /** Optional — projects created before video support won't have this key. */
  videos?: ProjectVideo[] | null;
  location: string | null;
  value_range: string | null;
  year_completed: number | null;
  trades_involved: string[];
}

export type UserRole = "customer" | "builder" | "enterprise";
export type JobStatus = "open" | "in_progress" | "completed" | "closed";
export type Urgency = "asap" | "this_week" | "flexible";
export type ApplicationStatus = "pending" | "accepted" | "rejected";
export type AvailabilityStatus = "available" | "limited" | "unavailable";
/**
 * How availability renders on the public profile: 'hidden' shows nothing
 * (default), 'next_available' shows a single date callout, 'calendar' shows a
 * month view of booked days. Owner-writable. See migration 20260704.
 */
export type AvailabilityDisplayMode = "hidden" | "next_available" | "calendar";
/** Occupancy of one booked day. v1 writes 'full' only; 'am'/'pm' reserved for half-days. */
export type DayOccupancy = "full" | "am" | "pm";
/** JSONB map of booked-out days, keyed "YYYY-MM-DD". */
export type OccupiedDates = Record<string, DayOccupancy>;
/**
 * Per-section public-profile visibility toggles. Absent key = visible; only
 * false keys are stored. Key names live in lib/profile-visibility.ts.
 */
export type ProfileVisibilityMap = Record<string, boolean>;
export type BuilderStatus = "pending_review" | "approved" | "rejected" | "active" | "suspended";
/**
 * Sub-state of the background BLDESY quality review, orthogonal to BuilderStatus.
 * Lives only while/after the automated check runs. See migration 20260625.
 */
export type BldesyReviewStatus = "pending" | "scanning" | "clean" | "flagged" | "declined";
/** Verdict the automated quality review can reach. Never 'declined' (human-only). */
export type QualityVerdict = "approved" | "flagged";
export type EnterpriseStatus = "pending_review" | "approved" | "rejected" | "active" | "suspended";
export type PosterType = "customer" | "enterprise";
export type PostingKind = "job" | "contract";

/** A contract can bundle several roles ("multiple jobs") or be a pure
 *  onboarding/talent-pool post. Stored as JSONB on jobs.contract_roles. */
export type ContractType = "project" | "onboarding";
export interface ContractRole {
  /** Trade slug — same vocabulary as jobs.trade_category. */
  trade: string;
  /** How many of this role are wanted. 0/unset for onboarding. */
  workers: number;
  /** Free-text rate, e.g. "$45/hr", "$1,800/week". Blank for onboarding. */
  rate: string;
  notes: string;
  /** When this role starts (YYYY-MM-DD). Per-role schedule for Multiple-roles
   *  contracts; blank/undefined for onboarding or legacy rows. */
  startDate?: string;
  /** Free-text duration for this role, e.g. "2 weeks". Optional. */
  duration?: string;
}
export type LicenceState = "NSW" | "QLD" | "VIC" | "SA" | "WA" | "TAS" | "ACT" | "NT";
export type LicenceVerificationStatus =
  | "pending"
  | "verified"
  | "rejected"
  | "expired"
  | "admin_review";
export type CompanySize = "1-10" | "11-50" | "51-200" | "200+";
export type NotificationType =
  | "application_received"
  | "new_application"
  | "job_filled"
  | "job_expiring"
  | "milestone"
  | "new_job_match"
  | "builder_approved"
  | "builder_rejected"
  | "referral_verified"
  | "eoi_received"
  | "message_received"
  | "billing_card_required"
  | "billing_contact_nudge"
  | "billing_grace_started"
  | "billing_pre_charge"
  | "application_accepted"
  | "application_rejected"
  | "credential_alert";
/**
 * Expression-of-interest lifecycle. 'dismissed' = the tradie cleared the lead
 * card from their portal dashboard. See migration 20260709.
 */
export type EoiStatus = "new" | "dismissed";
/**
 * Attribution code kinds. staff/channel are hand-created data rows (e.g.
 * Luke's code); tradie_referral is minted lazily per verified tradie.
 * See migration 20260706.
 */
export type SignupCodeType = "staff" | "channel" | "tradie_referral";
/**
 * Referral ledger lifecycle: signed_up → verified (payout trigger) → paid.
 * 'rejected' = gamed/duplicate attempt, kept with a reason for admin visibility.
 */
export type SignupAttributionStatus = "signed_up" | "verified" | "paid" | "rejected";
export type ContentReportType =
  | "builder_profile"
  | "enterprise_profile"
  | "review"
  | "job"
  | "message"
  | "user"
  | "ai_response";
export type ContentReportReason =
  | "spam"
  | "harassment"
  | "hate_speech"
  | "sexual"
  | "violence"
  | "scam"
  | "other";
export type ContentReportStatus = "pending" | "reviewed" | "actioned" | "dismissed";
export type EnterprisePlan = "starter" | "unlimited";
export type EnterpriseSubStatus = "active" | "cancelled" | "past_due" | "expired";
export type PaymentType = "job_post" | "subscription";
export type PaymentStatusType = "pending" | "succeeded" | "failed" | "refunded";
export type JobPaymentStatus = "free" | "paid" | "pending" | "draft";
export type SubscriptionPlan = "monthly" | "annual";
export type SubscriptionStatusType = "trialing" | "active" | "past_due" | "cancelled";
/**
 * Value-gated billing lifecycle, orthogonal to BuilderStatus (which stays the
 * approval pipeline): free -> grace -> active/paused, past_due during dunning.
 * founding_free is a MANUAL admin grandfather flag — never auto-assigned,
 * never metered, never billed. See migration 20260722.
 */
export type PlanState =
  | "free"
  | "grace"
  | "active"
  | "paused"
  | "founding_free"
  | "past_due";
/** Qualifying-contact event kinds. contact_copy + application_accepted land
 *  with migration 20260824 — writers degrade gracefully until it's pasted. */
export type ContactEventType =
  | "message"
  | "quote_request"
  | "phone_reveal"
  | "contact_copy"
  | "application_accepted";
/** Transactional billing-notice kinds (billing_notices idempotency ledger). */
export type BillingNoticeType =
  | "card_required"
  | "card_overdue"
  | "contact_nudge_2"
  | "grace_started"
  | "pre_charge_reminder"
  | "billing_activated"
  | "dunning_started"
  | "paused"
  | "reverted_free";
export type BillingNoticeStatus = "sending" | "sent" | "failed" | "dry_run";
export type EmploymentType =
  | "full_time_contract"
  | "part_time"
  | "casual"
  | "on_call"
  | "fixed_term";
export type PayType = "hourly" | "daily" | "fixed_contract" | "negotiable";

/**
 * JSONB shape for `jobs.required_capabilities`. Only keys with a requirement
 * level are included; omitted keys mean the job doesn't care about that
 * capability. The keys match `CapabilityKey` in lib/capabilities.ts.
 */
export type RequiredCapabilities = Partial<Record<string, "required" | "preferred">>;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          avatar_url: string | null;
          is_admin: boolean;
          /** Test/demo account — excluded from public counters and analytics (migration 20260808). */
          is_test: boolean;
        };
        Insert: {
          id: string;
          name: string;
          avatar_url?: string | null;
          is_admin?: boolean;
          is_test?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          avatar_url?: string | null;
          is_admin?: boolean;
          is_test?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      builder_profiles: {
        Row: {
          user_id: string;
          business_name: string;
          trading_name: string | null;
          trade_category: string;
          suburb: string;
          postcode: string;
          bio: string | null;
          phone: string | null;
          email: string | null;
          website: string | null;
          profile_photo_url: string | null;
          cover_photo_url: string | null;
          cover_color: string | null;
          display_images: string[] | null;
          projects: ProjectItem[] | null;
          credentials: Credentials | null;
          faqs: FaqItem[] | null;
          team_members: TeamMember[] | null;
          availability: AvailabilityStatus;
          abn: string | null;
          license_key: string | null;
          approved: boolean;
          status: BuilderStatus;
          rejection_reason: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_plan: SubscriptionPlan | null;
          billing_interval: "monthly" | "annual" | null;
          subscription_status: SubscriptionStatusType | null;
          license_number: string | null;
          license_type: string | null;
          approved_at: string | null;
          paid_at: string | null;
          contact_name: string | null;
          service_areas: string[] | null;
          trade_categories: string[] | null;
          response_time: string | null;
          credentials_verified: CredentialsVerified | null;
          state: string | null;
          licensed_states: string[];
          latitude: number | null;
          longitude: number | null;
          radius_km: number | null;
          government_id_path: string | null;
          government_id_type: "drivers_licence" | "passport" | "digital_licence" | null;
          government_id_uploaded_at: string | null;
          /** Per-trade sub-specialisations. Shape: { trade_slug: string[] }. Catalog in lib/trade-specialisations.ts. */
          specialisations: Record<string, string[]>;
          /** Opt-in to SMS job alerts via Mobile Message (requires a valid `phone`). */
          sms_alerts_enabled: boolean;
          /** BLDESY quality-review sub-state (system-written). See migration 20260625. */
          bldesy_review_status: BldesyReviewStatus | null;
          /** 0–100 BLDESY trust score (system-written). */
          bldesy_score: number | null;
          bldesy_score_breakdown: BldesyScoreBreakdown | null;
          /** Last time the review state was touched (drives the cron's stale-scan sweep). */
          bldesy_reviewed_at: string | null;
          /** Tradie opt-in to display their score publicly. Off by default; owner-writable. */
          display_bldesy_score: boolean;
          /** How availability renders publicly. Owner-writable; defaults 'hidden'. */
          availability_display_mode: AvailabilityDisplayMode;
          /** Date shown in next_available mode ("YYYY-MM-DD"). Owner-writable. */
          next_available_date: string | null;
          /** Booked-out days {"2026-07-15": "full"}. Public only in calendar mode. */
          occupied_dates: OccupiedDates;
          /** Per-section public visibility. Absent key = visible. Keys: lib/profile-visibility.ts. */
          profile_visibility: ProfileVisibilityMap;
          /** When the tradie dismissed the portal referral card. Owner-writable; null = card shows. */
          referral_card_dismissed_at: string | null;
          /** Tradie tier key (handyman|trade|specialist|commercial). See migration 20260525. */
          subscription_tier: string | null;
          /** Value-gated billing state (system-written). See migration 20260722. */
          plan_state: PlanState;
          /** Distinct non-voided qualified contacts. Trigger-maintained — never write. */
          qualified_contact_count: number;
          /** End of the 14-day grace period (= Stripe trial_end). */
          grace_ends_at: string | null;
          /** Set once a default payment method is on file (SetupIntent confirmed). */
          card_on_file_at: string | null;
          /** Cron-stamped when the flag is ON and no card exists; +7d hides from discovery. */
          card_required_at: string | null;
          plan_state_changed_at: string | null;
          /** Public-URL slug (unique, DB-generated on insert, immutable). See migration 20260726. */
          slug: string;
          /** Tradie-initiated pause (migration 20260807): set = unlisted from discovery; owner-writable. */
          search_paused_at: string | null;
        };
        Insert: {
          user_id: string;
          business_name: string;
          trading_name?: string | null;
          trade_category: string;
          suburb: string;
          postcode: string;
          bio?: string | null;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          profile_photo_url?: string | null;
          cover_photo_url?: string | null;
          cover_color?: string | null;
          display_images?: string[] | null;
          projects?: ProjectItem[] | null;
          credentials?: Credentials | null;
          faqs?: FaqItem[] | null;
          team_members?: TeamMember[] | null;
          availability?: AvailabilityStatus;
          abn?: string | null;
          license_key?: string | null;
          approved?: boolean;
          status?: BuilderStatus;
          rejection_reason?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_plan?: SubscriptionPlan | null;
          billing_interval?: "monthly" | "annual" | null;
          subscription_status?: SubscriptionStatusType | null;
          license_number?: string | null;
          government_id_path?: string | null;
          government_id_type?: "drivers_licence" | "passport" | "digital_licence" | null;
          government_id_uploaded_at?: string | null;
          license_type?: string | null;
          approved_at?: string | null;
          paid_at?: string | null;
          contact_name?: string | null;
          service_areas?: string[] | null;
          trade_categories?: string[] | null;
          response_time?: string | null;
          credentials_verified?: CredentialsVerified | null;
          state?: string | null;
          licensed_states?: string[];
          latitude?: number | null;
          longitude?: number | null;
          radius_km?: number | null;
          specialisations?: Record<string, string[]>;
          sms_alerts_enabled?: boolean;
          bldesy_review_status?: BldesyReviewStatus | null;
          bldesy_score?: number | null;
          bldesy_score_breakdown?: BldesyScoreBreakdown | null;
          bldesy_reviewed_at?: string | null;
          display_bldesy_score?: boolean;
          availability_display_mode?: AvailabilityDisplayMode;
          next_available_date?: string | null;
          occupied_dates?: OccupiedDates;
          profile_visibility?: ProfileVisibilityMap;
          referral_card_dismissed_at?: string | null;
          subscription_tier?: string | null;
          plan_state?: PlanState;
          qualified_contact_count?: number;
          grace_ends_at?: string | null;
          card_on_file_at?: string | null;
          card_required_at?: string | null;
          plan_state_changed_at?: string | null;
          /** Omit — the DB trigger generates it. */
          slug?: string;
          search_paused_at?: string | null;
        };
        Update: {
          user_id?: string;
          business_name?: string;
          trading_name?: string | null;
          trade_category?: string;
          suburb?: string;
          postcode?: string;
          bio?: string | null;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          profile_photo_url?: string | null;
          cover_photo_url?: string | null;
          cover_color?: string | null;
          display_images?: string[] | null;
          projects?: ProjectItem[] | null;
          credentials?: Credentials | null;
          faqs?: FaqItem[] | null;
          team_members?: TeamMember[] | null;
          availability?: AvailabilityStatus;
          abn?: string | null;
          license_key?: string | null;
          approved?: boolean;
          status?: BuilderStatus;
          rejection_reason?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_plan?: SubscriptionPlan | null;
          billing_interval?: "monthly" | "annual" | null;
          subscription_status?: SubscriptionStatusType | null;
          license_number?: string | null;
          license_type?: string | null;
          approved_at?: string | null;
          paid_at?: string | null;
          contact_name?: string | null;
          service_areas?: string[] | null;
          trade_categories?: string[] | null;
          response_time?: string | null;
          credentials_verified?: CredentialsVerified | null;
          state?: string | null;
          licensed_states?: string[];
          latitude?: number | null;
          longitude?: number | null;
          radius_km?: number | null;
          government_id_path?: string | null;
          government_id_type?: "drivers_licence" | "passport" | "digital_licence" | null;
          government_id_uploaded_at?: string | null;
          specialisations?: Record<string, string[]>;
          sms_alerts_enabled?: boolean;
          bldesy_review_status?: BldesyReviewStatus | null;
          bldesy_score?: number | null;
          bldesy_score_breakdown?: BldesyScoreBreakdown | null;
          bldesy_reviewed_at?: string | null;
          display_bldesy_score?: boolean;
          availability_display_mode?: AvailabilityDisplayMode;
          next_available_date?: string | null;
          occupied_dates?: OccupiedDates;
          profile_visibility?: ProfileVisibilityMap;
          referral_card_dismissed_at?: string | null;
          subscription_tier?: string | null;
          plan_state?: PlanState;
          qualified_contact_count?: number;
          grace_ends_at?: string | null;
          card_on_file_at?: string | null;
          card_required_at?: string | null;
          plan_state_changed_at?: string | null;
          /** Immutable — the DB trigger discards updates to it. */
          slug?: string;
          search_paused_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "builder_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      signup_codes: {
        Row: {
          code: string;
          type: SignupCodeType;
          owner_user_id: string | null;
          label: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          code: string;
          type: SignupCodeType;
          owner_user_id?: string | null;
          label?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          code?: string;
          type?: SignupCodeType;
          owner_user_id?: string | null;
          label?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      signup_attributions: {
        Row: {
          id: string;
          code: string;
          code_type: SignupCodeType;
          referrer_user_id: string | null;
          referred_user_id: string;
          status: SignupAttributionStatus;
          rejection_reason: string | null;
          /** Reward snapshot at creation — config changes never rewrite what's owed. */
          amount_cents: number;
          signed_up_at: string;
          verified_at: string | null;
          paid_at: string | null;
          paid_by: string | null;
          payout_method: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          code_type: SignupCodeType;
          referrer_user_id?: string | null;
          referred_user_id: string;
          status?: SignupAttributionStatus;
          rejection_reason?: string | null;
          amount_cents?: number;
          signed_up_at?: string;
          verified_at?: string | null;
          paid_at?: string | null;
          paid_by?: string | null;
          payout_method?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          code_type?: SignupCodeType;
          referrer_user_id?: string | null;
          referred_user_id?: string;
          status?: SignupAttributionStatus;
          rejection_reason?: string | null;
          amount_cents?: number;
          signed_up_at?: string;
          verified_at?: string | null;
          paid_at?: string | null;
          paid_by?: string | null;
          payout_method?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      quality_reviews: {
        Row: {
          id: string;
          builder_user_id: string;
          created_at: string;
          bldesy_score: number | null;
          verification_breakdown: BldesyScoreItem[] | null;
          reputation_breakdown: BldesyScoreItem[] | null;
          verdict: QualityVerdict;
          flags: QualityFlag[];
          raw_evidence: Json | null;
          reasoning: string | null;
          human_decision: "approved" | "declined" | null;
          decided_by: string | null;
          decided_at: string | null;
          decision_note: string | null;
        };
        Insert: {
          id?: string;
          builder_user_id: string;
          created_at?: string;
          bldesy_score?: number | null;
          verification_breakdown?: BldesyScoreItem[] | null;
          reputation_breakdown?: BldesyScoreItem[] | null;
          verdict: QualityVerdict;
          flags?: QualityFlag[];
          raw_evidence?: Json | null;
          reasoning?: string | null;
          human_decision?: "approved" | "declined" | null;
          decided_by?: string | null;
          decided_at?: string | null;
          decision_note?: string | null;
        };
        Update: {
          id?: string;
          builder_user_id?: string;
          created_at?: string;
          bldesy_score?: number | null;
          verification_breakdown?: BldesyScoreItem[] | null;
          reputation_breakdown?: BldesyScoreItem[] | null;
          verdict?: QualityVerdict;
          flags?: QualityFlag[];
          raw_evidence?: Json | null;
          reasoning?: string | null;
          human_decision?: "approved" | "declined" | null;
          decided_by?: string | null;
          decided_at?: string | null;
          decision_note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "quality_reviews_builder_user_id_fkey";
            columns: ["builder_user_id"];
            isOneToOne: false;
            referencedRelation: "builder_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      enterprise_profiles: {
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          abn: string | null;
          licence_number: string | null;
          insurance_details: string | null;
          company_size: CompanySize;
          industry_focus: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          contact_email: string | null;
          approved: boolean;
          status: EnterpriseStatus;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string | null;
          bio: string | null;
          logo_url: string | null;
          cover_photo_url: string | null;
          website: string | null;
          suburb: string | null;
          postcode: string | null;
          projects: ProjectItem[] | null;
          team_members: TeamMember[] | null;
          trades_needed: string[] | null;
          specialties: string[] | null;
          service_regions: string[] | null;
          years_established: number | null;
          active_projects_count: number | null;
          team_size: number | null;
          safety_record: string | null;
          certifications: string[] | null;
          past_projects: EnterprisePastProject[] | null;
          verified: boolean;
          has_active_subscription: boolean;
          subscription_plan: string | null;
          stripe_customer_id: string | null;
          credentials_verified: CredentialsVerified | null;
          licensed_states: string[];
          government_id_path: string | null;
          government_id_type: "drivers_licence" | "passport" | "digital_licence" | null;
          government_id_uploaded_at: string | null;
          /** Opt-in to SMS alerts when a tradie applies (requires a valid `contact_phone`). */
          sms_alerts_enabled: boolean;
          /** Per-section public visibility. Absent key = visible. Keys: lib/profile-visibility.ts. */
          profile_visibility: ProfileVisibilityMap;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_name: string;
          abn?: string | null;
          licence_number?: string | null;
          insurance_details?: string | null;
          company_size?: CompanySize;
          industry_focus?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          approved?: boolean;
          status?: EnterpriseStatus;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string | null;
          bio?: string | null;
          logo_url?: string | null;
          cover_photo_url?: string | null;
          website?: string | null;
          suburb?: string | null;
          postcode?: string | null;
          projects?: ProjectItem[] | null;
          team_members?: TeamMember[] | null;
          trades_needed?: string[] | null;
          specialties?: string[] | null;
          service_regions?: string[] | null;
          years_established?: number | null;
          active_projects_count?: number | null;
          team_size?: number | null;
          safety_record?: string | null;
          certifications?: string[] | null;
          past_projects?: EnterprisePastProject[] | null;
          verified?: boolean;
          has_active_subscription?: boolean;
          subscription_plan?: string | null;
          stripe_customer_id?: string | null;
          credentials_verified?: CredentialsVerified | null;
          licensed_states?: string[];
          government_id_path?: string | null;
          government_id_type?: "drivers_licence" | "passport" | "digital_licence" | null;
          government_id_uploaded_at?: string | null;
          sms_alerts_enabled?: boolean;
          profile_visibility?: ProfileVisibilityMap;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_name?: string;
          abn?: string | null;
          licence_number?: string | null;
          insurance_details?: string | null;
          company_size?: CompanySize;
          industry_focus?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          approved?: boolean;
          status?: EnterpriseStatus;
          rejection_reason?: string | null;
          updated_at?: string | null;
          bio?: string | null;
          logo_url?: string | null;
          cover_photo_url?: string | null;
          website?: string | null;
          suburb?: string | null;
          postcode?: string | null;
          projects?: ProjectItem[] | null;
          team_members?: TeamMember[] | null;
          trades_needed?: string[] | null;
          specialties?: string[] | null;
          service_regions?: string[] | null;
          years_established?: number | null;
          active_projects_count?: number | null;
          team_size?: number | null;
          safety_record?: string | null;
          certifications?: string[] | null;
          past_projects?: EnterprisePastProject[] | null;
          verified?: boolean;
          has_active_subscription?: boolean;
          subscription_plan?: string | null;
          stripe_customer_id?: string | null;
          credentials_verified?: CredentialsVerified | null;
          licensed_states?: string[];
          government_id_path?: string | null;
          government_id_type?: "drivers_licence" | "passport" | "digital_licence" | null;
          government_id_uploaded_at?: string | null;
          sms_alerts_enabled?: boolean;
          profile_visibility?: ProfileVisibilityMap;
        };
        Relationships: [
          {
            foreignKeyName: "enterprise_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      builder_licences: {
        Row: {
          id: string;
          builder_user_id: string;
          state: LicenceState;
          trade_category: string;
          licence_number: string;
          licence_type: string | null;
          licence_holder_name: string | null;
          licence_holder_type: "individual" | "business";
          matched_name: string | null;
          verified: boolean;
          verified_at: string | null;
          verification_status: LicenceVerificationStatus;
          verification_source: string | null;
          rejection_reason: string | null;
          expiry_warning_sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          builder_user_id: string;
          state: LicenceState;
          trade_category: string;
          licence_number: string;
          licence_type?: string | null;
          licence_holder_name?: string | null;
          licence_holder_type?: "individual" | "business";
          matched_name?: string | null;
          verified?: boolean;
          verified_at?: string | null;
          verification_status?: LicenceVerificationStatus;
          verification_source?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          builder_user_id?: string;
          state?: LicenceState;
          trade_category?: string;
          licence_number?: string;
          licence_type?: string | null;
          licence_holder_name?: string | null;
          licence_holder_type?: "individual" | "business";
          matched_name?: string | null;
          verified?: boolean;
          verified_at?: string | null;
          verification_status?: LicenceVerificationStatus;
          verification_source?: string | null;
          rejection_reason?: string | null;
          expiry_warning_sent_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      tradie_capabilities: {
        Row: {
          tradie_id: string;
          ppe: boolean;
          own_tools: boolean;
          own_vehicle: boolean;
          tools_of_trade_insurance: boolean;
          white_card: boolean;
          // white_card_number is intentionally NOT exposed via the
          // `authenticated` column grant — see migration 20260519. Only the
          // service role can SELECT it for admin verification.
          white_card_verified: boolean;
          white_card_verified_at: string | null;
          white_card_holder_name: string | null;
          // white_card_warning_sent_at is likewise service-role only (no
          // `authenticated` column grant) — staleness-warning cadence for the
          // credential-recheck cron.
          white_card_warning_sent_at: string | null;
          first_aid: boolean;
          first_aid_verified: boolean;
          working_at_heights: boolean;
          confined_spaces: boolean;
          traffic_control: boolean;
          forklift_licence: boolean;
          ewp_licence: boolean;
          asbestos_awareness: boolean;
          own_abn: boolean;
          gst_registered: boolean;
          public_liability_amount: number | null;
          personal_accident_insurance: boolean;
          notes: string | null;
          updated_at: string;
        };
        Insert: {
          tradie_id: string;
          ppe?: boolean;
          own_tools?: boolean;
          own_vehicle?: boolean;
          tools_of_trade_insurance?: boolean;
          white_card?: boolean;
          white_card_number?: string | null;
          white_card_verified?: boolean;
          white_card_verified_at?: string | null;
          white_card_holder_name?: string | null;
          white_card_warning_sent_at?: string | null;
          first_aid?: boolean;
          first_aid_verified?: boolean;
          working_at_heights?: boolean;
          confined_spaces?: boolean;
          traffic_control?: boolean;
          forklift_licence?: boolean;
          ewp_licence?: boolean;
          asbestos_awareness?: boolean;
          own_abn?: boolean;
          gst_registered?: boolean;
          public_liability_amount?: number | null;
          personal_accident_insurance?: boolean;
          notes?: string | null;
        };
        Update: {
          ppe?: boolean;
          own_tools?: boolean;
          own_vehicle?: boolean;
          tools_of_trade_insurance?: boolean;
          white_card?: boolean;
          white_card_number?: string | null;
          white_card_verified?: boolean;
          white_card_verified_at?: string | null;
          white_card_holder_name?: string | null;
          white_card_warning_sent_at?: string | null;
          first_aid?: boolean;
          first_aid_verified?: boolean;
          working_at_heights?: boolean;
          confined_spaces?: boolean;
          traffic_control?: boolean;
          forklift_licence?: boolean;
          ewp_licence?: boolean;
          asbestos_awareness?: boolean;
          own_abn?: boolean;
          gst_registered?: boolean;
          public_liability_amount?: number | null;
          personal_accident_insurance?: boolean;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tradie_capabilities_tradie_id_fkey";
            columns: ["tradie_id"];
            isOneToOne: true;
            referencedRelation: "builder_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      enterprise_licences: {
        Row: {
          id: string;
          enterprise_user_id: string;
          state: LicenceState;
          trade_category: string;
          licence_number: string;
          licence_type: string | null;
          licence_holder_name: string | null;
          licence_holder_type: "individual" | "business";
          matched_name: string | null;
          verified: boolean;
          verified_at: string | null;
          verification_status: LicenceVerificationStatus;
          verification_source: string | null;
          rejection_reason: string | null;
          expiry_warning_sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          enterprise_user_id: string;
          state: LicenceState;
          trade_category: string;
          licence_number: string;
          licence_type?: string | null;
          licence_holder_name?: string | null;
          licence_holder_type?: "individual" | "business";
          matched_name?: string | null;
          verified?: boolean;
          verified_at?: string | null;
          verification_status?: LicenceVerificationStatus;
          verification_source?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          enterprise_user_id?: string;
          state?: LicenceState;
          trade_category?: string;
          licence_number?: string;
          licence_type?: string | null;
          licence_holder_name?: string | null;
          licence_holder_type?: "individual" | "business";
          matched_name?: string | null;
          verified?: boolean;
          verified_at?: string | null;
          verification_status?: LicenceVerificationStatus;
          verification_source?: string | null;
          rejection_reason?: string | null;
          expiry_warning_sent_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      jobs: {
        Row: {
          id: string;
          customer_id: string;
          title: string;
          description: string;
          trade_category: string;
          urgency: Urgency;
          budget: string | null;
          suburb: string;
          postcode: string;
          status: JobStatus;
          created_at: string;
          poster_type: PosterType;
          posting_kind: PostingKind;
          /** "project" | "onboarding" — null for jobs and legacy posts. */
          contract_type: ContractType | null;
          /** Per-role breakdown for contracts. null for single jobs. */
          contract_roles: ContractRole[] | null;
          workers_needed: number;
          contract_duration: string | null;
          day_rate: string | null;
          start_date: string | null;
          site_requirements: string | null;
          photo_urls: string[] | null;
          document_urls: string[] | null;
          // Employment terms (enterprise Project Jobs only; nullable on the
          // existing flow, customers and legacy posts).
          employment_type: EmploymentType | null;
          end_date: string | null;
          is_ongoing: boolean;
          daily_start_time: string | null;
          daily_finish_time: string | null;
          days_per_week: number | null;
          work_days: string[] | null;
          pay_type: PayType | null;
          pay_rate_min: number | null;
          pay_rate_max: number | null;
          required_capabilities: RequiredCapabilities;
          min_public_liability: number | null;
          /** Sub-trade slugs this job wants (flat, scoped to trade_category).
           *  Soft matching signal. Catalogue in lib/trade-specialisations.ts. */
          specialisations: string[];
          /** Seeded/demo row — excluded from real feeds (migration 20260808). */
          is_test: boolean;
        };
        Insert: {
          id?: string;
          customer_id: string;
          title: string;
          description: string;
          trade_category: string;
          urgency: Urgency;
          budget?: string | null;
          suburb: string;
          postcode: string;
          status?: JobStatus;
          created_at?: string;
          poster_type?: PosterType;
          posting_kind?: PostingKind;
          contract_type?: ContractType | null;
          contract_roles?: ContractRole[] | null;
          workers_needed?: number;
          contract_duration?: string | null;
          day_rate?: string | null;
          start_date?: string | null;
          site_requirements?: string | null;
          photo_urls?: string[] | null;
          document_urls?: string[] | null;
          employment_type?: EmploymentType | null;
          end_date?: string | null;
          is_ongoing?: boolean;
          daily_start_time?: string | null;
          daily_finish_time?: string | null;
          days_per_week?: number | null;
          work_days?: string[] | null;
          pay_type?: PayType | null;
          pay_rate_min?: number | null;
          pay_rate_max?: number | null;
          required_capabilities?: RequiredCapabilities;
          min_public_liability?: number | null;
          specialisations?: string[];
        };
        Update: {
          id?: string;
          customer_id?: string;
          title?: string;
          description?: string;
          trade_category?: string;
          urgency?: Urgency;
          budget?: string | null;
          suburb?: string;
          postcode?: string;
          status?: JobStatus;
          created_at?: string;
          poster_type?: PosterType;
          posting_kind?: PostingKind;
          contract_type?: ContractType | null;
          contract_roles?: ContractRole[] | null;
          workers_needed?: number;
          contract_duration?: string | null;
          day_rate?: string | null;
          start_date?: string | null;
          site_requirements?: string | null;
          photo_urls?: string[] | null;
          document_urls?: string[] | null;
          employment_type?: EmploymentType | null;
          end_date?: string | null;
          is_ongoing?: boolean;
          daily_start_time?: string | null;
          daily_finish_time?: string | null;
          days_per_week?: number | null;
          work_days?: string[] | null;
          pay_type?: PayType | null;
          pay_rate_min?: number | null;
          pay_rate_max?: number | null;
          required_capabilities?: RequiredCapabilities;
          min_public_liability?: number | null;
          specialisations?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "jobs_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      applications: {
        Row: {
          id: string;
          job_id: string;
          builder_id: string;
          message: string | null;
          status: ApplicationStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          builder_id: string;
          message?: string | null;
          status?: ApplicationStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          builder_id?: string;
          message?: string | null;
          status?: ApplicationStatus;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_builder_id_fkey";
            columns: ["builder_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          id: string;
          job_id: string;
          reviewer_id: string;
          reviewee_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          reviewer_id: string;
          reviewee_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          reviewer_id?: string;
          reviewee_id?: string;
          rating?: number;
          comment?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey";
            columns: ["reviewee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_builders: {
        Row: {
          id: string;
          user_id: string;
          builder_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          builder_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          builder_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_builders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_builders_builder_id_fkey";
            columns: ["builder_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_profiles: {
        Row: {
          id: string;
          first_name: string;
          suburb: string;
          avatar_url: string | null;
          bio: string | null;
          homeowner_type: "owner-occupier" | "investor" | "property-manager";
          property_type: "house" | "unit" | "commercial";
          created_at: string;
        };
        Insert: {
          id: string;
          first_name: string;
          suburb: string;
          avatar_url?: string | null;
          bio?: string | null;
          homeowner_type: "owner-occupier" | "investor" | "property-manager";
          property_type: "house" | "unit" | "commercial";
          created_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          suburb?: string;
          avatar_url?: string | null;
          bio?: string | null;
          homeowner_type?: "owner-occupier" | "investor" | "property-manager";
          property_type?: "house" | "unit" | "commercial";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      builder_likes: {
        Row: {
          id: string;
          user_id: string;
          builder_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          builder_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          builder_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "builder_likes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "builder_likes_builder_id_fkey";
            columns: ["builder_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body: string | null;
          metadata: Record<string, unknown> | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body?: string | null;
          metadata?: Record<string, unknown> | null;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: NotificationType;
          title?: string;
          body?: string | null;
          metadata?: Record<string, unknown> | null;
          read?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      expressions_of_interest: {
        Row: {
          id: string;
          created_at: string;
          tradie_id: string;
          customer_user_id: string | null;
          name: string;
          email: string;
          phone: string | null;
          message: string | null;
          trade_category: string | null;
          status: EoiStatus;
          dismissed_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          tradie_id: string;
          customer_user_id?: string | null;
          name: string;
          email: string;
          phone?: string | null;
          message?: string | null;
          trade_category?: string | null;
          status?: EoiStatus;
          dismissed_at?: string | null;
        };
        Update: {
          // Column grants restrict authenticated updates to status/dismissed_at.
          status?: EoiStatus;
          dismissed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "expressions_of_interest_tradie_id_fkey";
            columns: ["tradie_id"];
            isOneToOne: false;
            referencedRelation: "builder_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      content_reports: {
        Row: {
          id: string;
          // NULL = automated system report (AI image moderation); only the
          // service role can insert NULL (RLS WITH CHECK auth.uid() = reporter_id).
          reporter_id: string | null;
          content_type: ContentReportType;
          content_id: string | null;
          reported_user_id: string | null;
          reason: ContentReportReason;
          detail: string | null;
          status: ContentReportStatus;
          resolved_by: string | null;
          resolution_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string | null;
          content_type: ContentReportType;
          content_id?: string | null;
          reported_user_id?: string | null;
          reason: ContentReportReason;
          detail?: string | null;
          status?: ContentReportStatus;
          resolved_by?: string | null;
          resolution_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: ContentReportStatus;
          resolved_by?: string | null;
          resolution_notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      blocked_users: {
        Row: {
          id: string;
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
        };
        Update: {
          blocker_id?: string;
          blocked_id?: string;
        };
        Relationships: [];
      };
      banned_words: {
        Row: { word: string; created_at: string };
        Insert: { word: string; created_at?: string };
        Update: { word?: string };
        Relationships: [];
      };
      // Service-role only (RLS enabled, no policies). Dedupe marker + audit
      // trail for automated image moderation (20260610_system_reports.sql).
      media_moderation: {
        Row: {
          id: string;
          bucket: string;
          object_path: string;
          owner_id: string | null;
          verdict: "pending" | "ok" | "flagged" | "skipped" | "error";
          category: string | null;
          confidence: number | null;
          model: string | null;
          report_id: string | null;
          created_at: string;
          checked_at: string | null;
        };
        Insert: {
          id?: string;
          bucket: string;
          object_path: string;
          owner_id?: string | null;
          verdict?: "pending" | "ok" | "flagged" | "skipped" | "error";
          category?: string | null;
          confidence?: number | null;
          model?: string | null;
          report_id?: string | null;
          created_at?: string;
          checked_at?: string | null;
        };
        Update: {
          verdict?: "pending" | "ok" | "flagged" | "skipped" | "error";
          category?: string | null;
          confidence?: number | null;
          model?: string | null;
          report_id?: string | null;
          checked_at?: string | null;
        };
        Relationships: [];
      };
      enterprise_subscriptions: {
        Row: {
          id: string;
          enterprise_profile_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          plan: EnterprisePlan;
          status: EnterpriseSubStatus;
          posts_limit: number | null;
          posts_used_this_cycle: number;
          current_period_start: string | null;
          current_period_end: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          enterprise_profile_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan: EnterprisePlan;
          status?: EnterpriseSubStatus;
          posts_limit?: number | null;
          posts_used_this_cycle?: number;
          current_period_start?: string | null;
          current_period_end?: string | null;
        };
        Update: {
          plan?: EnterprisePlan;
          status?: EnterpriseSubStatus;
          posts_limit?: number | null;
          posts_used_this_cycle?: number;
          current_period_start?: string | null;
          current_period_end?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      enterprise_payments: {
        Row: {
          id: string;
          enterprise_profile_id: string;
          job_id: string | null;
          stripe_payment_intent_id: string | null;
          amount: number;
          currency: string;
          type: PaymentType;
          status: PaymentStatusType;
          created_at: string;
        };
        Insert: {
          id?: string;
          enterprise_profile_id: string;
          job_id?: string | null;
          stripe_payment_intent_id?: string | null;
          amount: number;
          currency?: string;
          type: PaymentType;
          status?: PaymentStatusType;
        };
        Update: {
          job_id?: string | null;
          stripe_payment_intent_id?: string | null;
          amount?: number;
          status?: PaymentStatusType;
        };
        Relationships: [];
      };
      qbcc_licence_register: {
        Row: {
          id: number;
          licence_number: string;
          licensee_name: string | null;
          business_address: string | null;
          licence_class: string | null;
          financial_category: string | null;
          raw_data: Json | null;
          synced_at: string;
        };
        Insert: {
          licence_number: string;
          licensee_name?: string | null;
          business_address?: string | null;
          licence_class?: string | null;
          financial_category?: string | null;
          raw_data?: Json | null;
          synced_at?: string;
        };
        Update: {
          licence_number?: string;
          licensee_name?: string | null;
          business_address?: string | null;
          licence_class?: string | null;
          financial_category?: string | null;
          raw_data?: Json | null;
          synced_at?: string;
        };
        Relationships: [];
      };
      qbcc_sync_log: {
        Row: {
          id: number;
          synced_at: string;
          total_rows: number | null;
          new_rows: number | null;
          updated_rows: number | null;
          status: string;
          error_message: string | null;
        };
        Insert: {
          total_rows?: number | null;
          new_rows?: number | null;
          updated_rows?: number | null;
          status?: string;
          error_message?: string | null;
        };
        Update: {
          total_rows?: number | null;
          new_rows?: number | null;
          updated_rows?: number | null;
          status?: string;
          error_message?: string | null;
        };
        Relationships: [];
      };
      webhook_events: {
        Row: {
          event_id: string;
          processed_at: string;
        };
        Insert: {
          event_id: string;
          processed_at?: string;
        };
        Update: {
          event_id?: string;
          processed_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          last_message_text: string | null;
          last_message_at: string;
          unread_count_user1: number;
          unread_count_user2: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user1_id: string;
          user2_id: string;
          last_message_text?: string | null;
          last_message_at?: string;
          unread_count_user1?: number;
          unread_count_user2?: number;
        };
        Update: {
          last_message_text?: string | null;
          last_message_at?: string;
          unread_count_user1?: number;
          unread_count_user2?: number;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_user1_id_fkey";
            columns: ["user1_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_user2_id_fkey";
            columns: ["user2_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          attachment_url: string | null;
          attachment_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          attachment_url?: string | null;
          attachment_type?: string | null;
        };
        Update: {
          body?: string;
          attachment_url?: string | null;
          attachment_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      job_views: {
        Row: {
          id: string;
          job_id: string;
          viewer_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          viewer_id?: string | null;
          created_at?: string;
        };
        Update: {
          job_id?: string;
          viewer_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "job_views_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_views_viewer_id_fkey";
            columns: ["viewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      // Search-appearance tracking (migration 20260810) — same shape and
      // access model as profile_views: service-role writes, builder-self reads.
      search_appearances: {
        Row: {
          id: string;
          builder_user_id: string;
          searcher_user_id: string | null;
          searcher_ip_hash: string | null;
          appear_day: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          builder_user_id: string;
          searcher_user_id?: string | null;
          searcher_ip_hash?: string | null;
          appear_day?: string;
          created_at?: string;
        };
        Update: {
          builder_user_id?: string;
        };
        Relationships: [];
      };
      profile_views: {
        Row: {
          id: string;
          builder_user_id: string;
          viewer_user_id: string | null;
          viewer_ip_hash: string | null;
          view_day: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          builder_user_id: string;
          viewer_user_id?: string | null;
          viewer_ip_hash?: string | null;
          view_day?: string;
          created_at?: string;
        };
        Update: {
          builder_user_id?: string;
          viewer_user_id?: string | null;
          viewer_ip_hash?: string | null;
          view_day?: string;
        };
        Relationships: [];
      };
      // Qualified-contact billing ledger. Service-role only (RLS, zero
      // policies) — written by the capture hooks, voided via
      // /api/billing/void-contact. See migration 20260722.
      contact_events: {
        Row: {
          id: string;
          created_at: string;
          tradie_id: string;
          homeowner_id: string | null;
          /** Immutable copy of the homeowner user id — survives account deletion. */
          homeowner_key: string;
          job_id: string | null;
          event_type: ContactEventType;
          source_eoi_id: string | null;
          source_conversation_id: string | null;
          /** Migration 20260824 — null until pasted. */
          source_application_id: string | null;
          voided_at: string | null;
          void_reason: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          tradie_id: string;
          homeowner_id?: string | null;
          homeowner_key: string;
          job_id?: string | null;
          event_type: ContactEventType;
          source_eoi_id?: string | null;
          source_conversation_id?: string | null;
          source_application_id?: string | null;
          voided_at?: string | null;
          void_reason?: string | null;
        };
        Update: {
          voided_at?: string | null;
          void_reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contact_events_tradie_id_fkey";
            columns: ["tradie_id"];
            isOneToOne: false;
            referencedRelation: "builder_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      // Transactional billing-notice idempotency ledger (claim-before-send).
      // Service-role only. See migration 20260722.
      billing_notices: {
        Row: {
          id: string;
          created_at: string;
          tradie_id: string;
          notice_type: BillingNoticeType;
          cycle_key: string;
          channels: string[];
          delivery_status: BillingNoticeStatus;
          env: "production" | "preview" | "development";
        };
        Insert: {
          id?: string;
          created_at?: string;
          tradie_id: string;
          notice_type: BillingNoticeType;
          cycle_key: string;
          channels?: string[];
          delivery_status?: BillingNoticeStatus;
          env?: "production" | "preview" | "development";
        };
        Update: {
          channels?: string[];
          delivery_status?: BillingNoticeStatus;
        };
        Relationships: [
          {
            foreignKeyName: "billing_notices_tradie_id_fkey";
            columns: ["tradie_id"];
            isOneToOne: false;
            referencedRelation: "builder_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      // DB-backed feature switches (instant, no redeploy). Service-role only.
      // See migration 20260708.
      app_flags: {
        Row: {
          flag: string;
          enabled: boolean;
          updated_at: string;
        };
        Insert: {
          flag: string;
          enabled?: boolean;
          updated_at?: string;
        };
        Update: {
          enabled?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      // PII-safe public projections of the profile tables. The base tables are
      // RLS-locked to owner+admin; these views expose only non-sensitive columns
      // of active/approved rows to anon/authenticated. See migration
      // 20260610_lock_profile_pii.sql. Typed against the full table Row for
      // convenience — only the columns selected in the view exist at runtime.
      public_builder_profiles: {
        // accepting_enquiries is view-derived (migration 20260723, + tradie
        // pause 20260807): false for paused / card-overdue tradies. Discovery
        // consumers filter on it. meets_listing_bar (20260807) = the locked
        // minimum bar to be LISTED in search: fully verified + service area
        // + >=1 photo (completeness % is deliberately not part of the bar).
        Row: Database["public"]["Tables"]["builder_profiles"]["Row"] & {
          accepting_enquiries: boolean;
          meets_listing_bar: boolean;
        };
        Relationships: [];
      };
      public_enterprise_profiles: {
        Row: Database["public"]["Tables"]["enterprise_profiles"]["Row"];
        Relationships: [];
      };
      // Name/avatar-only projection of profiles (no is_admin). Base table is
      // locked to own-row + admin; cross-user readers use this view.
      public_profiles: {
        Row: Pick<
          Database["public"]["Tables"]["profiles"]["Row"],
          "id" | "name" | "avatar_url"
        >;
        Relationships: [];
      };
    };
    Functions: {
      increment_unread: {
        Args: {
          p_conversation_id: string;
          p_column: string;
        };
        Returns: undefined;
      };
      get_total_unread: {
        Args: {
          p_user_id: string;
        };
        Returns: number;
      };
      // Integer-only demand count over the (service-role-only) waitlist_jobs
      // table (migration 20260809). Authenticated execute only.
      waitlist_job_count: {
        Args: {
          p_trade: string | null;
          p_zone: string | null;
        };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
  };
}
