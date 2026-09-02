// AUTO-SYNCED from ~/bldesy-web/types/index.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

export type {
  Database,
  Json,
  ProjectItem,
  ProjectVideo,
  Credentials,
  CredentialsVerified,
  AbnVerification,
  LicenceVerification,
  InsuranceVerification,
  InsuranceCertificate,
  InsuranceKind,
  InsuranceCheck,
  FaqItem,
  TeamMember,
  UserRole,
  JobStatus,
  Urgency,
  ApplicationStatus,
  PostingKind,
  LicenceState,
  LicenceVerificationStatus,
  AvailabilityStatus,
  AvailabilityDisplayMode,
  DayOccupancy,
  OccupiedDates,
  ProfileVisibilityMap,
  BuilderStatus,
  BldesyReviewStatus,
  QualityVerdict,
  BldesyScoreItem,
  BldesyScoreBreakdown,
  QualityFlag,
  SubscriptionPlan,
  SubscriptionStatusType,
} from "./database";

// Convenience row types
import type { Database } from "./database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type BuilderProfile =
  Database["public"]["Tables"]["builder_profiles"]["Row"];
export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type BuilderLicence =
  Database["public"]["Tables"]["builder_licences"]["Row"];
export type EnterpriseLicence =
  Database["public"]["Tables"]["enterprise_licences"]["Row"];
export type Application = Database["public"]["Tables"]["applications"]["Row"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type SavedBuilder =
  Database["public"]["Tables"]["saved_builders"]["Row"];
export type QualityReview =
  Database["public"]["Tables"]["quality_reviews"]["Row"];

// Combined builder with profile info (used in search results, detail pages)
export type BuilderWithProfile = BuilderProfile & {
  profiles: Profile;
  /** View-derived (public_builder_profiles, migration 20260723): false for
   *  paused / card-overdue tradies — hides enquiry CTAs, keeps the page. */
  accepting_enquiries?: boolean;
};

// Review with reviewer name attached
export type ReviewWithReviewer = Review & {
  profiles: Pick<Profile, "name" | "avatar_url">;
};

// Trade category union — keep in sync with the database values
export type TradeCategory =
  | "plumber"
  | "electrician"
  | "carpenter"
  | "painter"
  | "roofer"
  | "landscaper"
  | "tiler"
  | "concreter"
  | "bricklayer"
  | "plasterer"
  | "fencer"
  | "demolition"
  | "handyman"
  | "builder"
  | "kitchen"
  | "bathroom"
  | "flooring"
  | "hvac"
  | "pest_control"
  | "cleaning"
  | "solar"
  | "pool"
  | "locksmith"
  | "garage_doors"
  | "glass_glazing"
  | "scaffolding"
  | "earthmoving"
  | "waterproofing"
  | "insulation"
  | "fire_protection";

// Sort options for builder search
export type BuilderSortOption =
  | "relevance"
  | "rating"
  | "newest"
  | "closest"
  | "available";

// Match scoring
export interface MatchDetail {
  label: string;
  matched: boolean;
  points: number;
  maxPoints: number;
}

export interface MatchScore {
  percent: number;
  details: MatchDetail[];
}

export type BuilderSearchResult = BuilderWithProfile & {
  _match?: MatchScore;
  _distanceKm?: number | null;
  /** Review aggregate for the card stars + Top Rated sort; null = no reviews. */
  _rating?: { average: number; count: number } | null;
};

// Search filters
export interface BuilderSearchFilters {
  trade?: string;
  location?: string;
  urgency?: string;
  keywords?: string;
  verified?: boolean;
  /** Comma-separated state codes (NSW,QLD). Filters to builders licensed in any. */
  licensed_in?: string;
  /**
   * Comma-separated specialisation slugs (e.g. "colorbond-metal-roofing").
   * Soft signal only — boosts builders who do these sub-trades, never filters
   * anyone out. Matched against builder.specialisations[searchedTrade].
   */
  specialisations?: string;
  sort?: BuilderSortOption;
  page?: number;
}

export interface JobFilters {
  trade_category?: string;
  suburb?: string;
  urgency?: string;
  status?: string;
}
