/**
 * HomeownerWaitlist — port of ~/bldesy-web/components/coverage/homeowner-waitlist.tsx:
 * the bottom waitlist capture with the suburb from the coverage search
 * prefilled. Re-keyed per resolved search because WaitlistForm seeds its
 * defaults once on mount.
 *
 * searchedSuburb is set ONLY when the coverage search came back uncovered —
 * that is the case where the map actually told the visitor "not your area
 * yet", a refusal worth recording as unserved demand.
 *
 * Hardcoded WHITE card (not the themed surface): the form's palette is fixed
 * light-theme hexes, so in dark mode it must sit on the light surface it was
 * designed for.
 */
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { WaitlistForm } from '@/components/waitlist/waitlist-form';
import { Radius, Shadows, Spacing } from '@/constants/theme';

import { useCoverage } from './coverage-context';

interface HomeownerWaitlistProps {
  onLayout?: (e: LayoutChangeEvent) => void;
}

export function HomeownerWaitlist({ onLayout }: HomeownerWaitlistProps) {
  const { result } = useCoverage();
  const uncovered = result !== null && result.zoneSlug === null;

  return (
    <View style={[styles.card, Shadows.sm]} onLayout={onLayout}>
      <WaitlistForm
        key={result ? `${result.label}:${result.postcode}` : 'blank'}
        source="coverage_map"
        defaultSuburb={result?.label ?? ''}
        defaultPostcode={result?.postcode ?? ''}
        searchedSuburb={uncovered ? result.label : undefined}
        title="Be first in line when your area opens"
        subtitle="Suburb plus an email or mobile is all it takes — we'll let you know the moment verified tradies go live near you."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: '#EADFCF',
    backgroundColor: '#ffffff',
    padding: Spacing.xl,
  },
});
