/**
 * BuilderProfileView — ~/bldesy-web/components/builder/builder-profile-view.tsx,
 * RENDER ONLY, in the web's mobile order: header → Express Interest modal →
 * trust band → (the sidebar first, trust-first) availability, business
 * details, capabilities → early-profile card, About, Services, Our Work,
 * Reviews, Team, FAQ → the quiet Report chip. Page-level visibility gating for
 * the sections whose columns must stay exposed to search; view-gated sections
 * (about, projects, team, faqs, contact) need no code — the view NULLs them.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AboutSection } from '@/components/builder/about-section';
import { AvailabilitySection } from '@/components/builder/availability-section';
import { BusinessDetails } from '@/components/builder/business-details';
import { CapabilitiesSection } from '@/components/builder/capabilities-section';
import { EarlyProfileCard } from '@/components/builder/early-profile-card';
import { ExpressInterestModal } from '@/components/builder/express-interest';
import { FaqAccordion } from '@/components/builder/faq-accordion';
import { countMainSections } from '@/components/builder/profile-helpers';
import { ProfileHeader } from '@/components/builder/profile-header';
import { ProjectGallery } from '@/components/builder/project-gallery';
import { ReviewsSection } from '@/components/builder/reviews-section';
import { TeamMembers } from '@/components/builder/team-members';
import { TradeSpecialisationsSection } from '@/components/builder/trade-specialisations-section';
import { TrustBand } from '@/components/builder/trust-band';
import { ReportButton } from '@/components/report-button';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { BuilderReviewsResult } from '@/lib/data/builders';
import type { TradieCapabilities } from '@/lib/web/capabilities';
import { isSectionVisible } from '@/lib/web/profile-visibility';
import type { BuilderWithProfile } from '@/types';

export interface BuilderProfileViewData {
  builder: BuilderWithProfile;
  reviews: BuilderReviewsResult;
  capabilities: TradieCapabilities | null;
  /** Sydney "today" — governs the availability pill and calendar. */
  todayYmd: string;
  isVerified: boolean;
}

export function BuilderProfileView({ data }: { data: BuilderProfileViewData }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { builder, reviews: reviewData, capabilities, todayYmd, isVerified } = data;
  const id = builder.user_id;
  const [eoiOpen, setEoiOpen] = useState(false);

  const visibility = builder.profile_visibility ?? {};
  const showServices = isSectionVisible(visibility, 'services');
  const showBusinessDetails = isSectionVisible(visibility, 'business_details');
  const showCapabilities = isSectionVisible(visibility, 'capabilities');
  const showReviews = isSectionVisible(visibility, 'reviews');

  const showEarlyProfileCard = countMainSections(builder, { showServices, showReviews }) < 2;

  return (
    <View style={styles.article}>
      <ProfileHeader
        builder={builder}
        builderId={id}
        isVerified={isVerified}
        averageRating={reviewData.averageRating}
        totalReviews={reviewData.totalReviews}
        availabilityDisplayMode={builder.availability_display_mode ?? 'hidden'}
        nextAvailableDate={builder.next_available_date ?? null}
        todayYmd={todayYmd}
        onExpressInterest={() => setEoiOpen(true)}
      />

      <ExpressInterestModal visible={eoiOpen} onClose={() => setEoiOpen(false)} builderId={id} businessName={builder.business_name} />

      <View style={styles.sections}>
        <TrustBand
          credentialsVerified={builder.credentials_verified}
          credentials={builder.credentials}
          licensedStates={builder.licensed_states}
          bldesyScore={builder.bldesy_score}
          displayBldesyScore={Boolean(builder.display_bldesy_score)}
          tradeSlugs={
            builder.trade_categories && builder.trade_categories.length > 0
              ? builder.trade_categories
              : builder.trade_category
                ? [builder.trade_category]
                : null
          }
        />

        {/* Sidebar first — mobile reads trust-first. */}
        <AvailabilitySection
          mode={builder.availability_display_mode ?? 'hidden'}
          nextAvailableDate={builder.next_available_date ?? null}
          occupiedDates={builder.occupied_dates ?? null}
          businessName={builder.business_name}
          todayYmd={todayYmd}
        />
        {showBusinessDetails ? <BusinessDetails builder={builder} /> : null}
        {showCapabilities ? <CapabilitiesSection capabilities={capabilities} /> : null}

        {/* Main column */}
        {showEarlyProfileCard ? <EarlyProfileCard businessName={builder.business_name} /> : null}
        <AboutSection builder={builder} />
        {showServices ? <TradeSpecialisationsSection specialisations={builder.specialisations} /> : null}
        <ProjectGallery projects={builder.projects} />
        {showReviews ? (
          <ReviewsSection
            reviews={reviewData.reviews}
            averageRating={reviewData.averageRating}
            totalReviews={reviewData.totalReviews}
            starBreakdown={reviewData.starBreakdown}
          />
        ) : null}
        <TeamMembers members={builder.team_members} />
        <FaqAccordion faqs={builder.faqs} />

        {/* Quiet report affordance at the end of the content */}
        <View style={styles.reportRow}>
          <View style={[styles.reportChip, { backgroundColor: c.surface, borderColor: c.border }]}>
            <ReportButton variant="label" contentType="builder_profile" contentId={id} reportedUserId={id} size={16} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  article: {
    paddingBottom: Spacing['3xl'],
  },
  sections: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing['2xl'],
    gap: Spacing['2xl'],
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  reportChip: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
});
