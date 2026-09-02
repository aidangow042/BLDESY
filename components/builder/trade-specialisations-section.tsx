/**
 * TradeSpecialisationsSection — ~/bldesy-web/components/builder/trade-specialisations-section.tsx:
 * the "Services" section — sub-trade specialisations grouped by trade. Hidden
 * when the builder hasn't declared any.
 */
import { StyleSheet, Text, View } from 'react-native';

import { ProfileSection } from '@/components/builder/profile-section';
import { Badge } from '@/components/ui';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getSpecialisationName, type BuilderSpecialisations } from '@/lib/web/trade-specialisations';
import { formatTradeName, getTradeBySlug } from '@/lib/web/trades';

function tradeName(slug: string): string {
  return getTradeBySlug(slug)?.name ?? formatTradeName(slug);
}

export function TradeSpecialisationsSection({ specialisations }: { specialisations: BuilderSpecialisations | null | undefined }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  if (!specialisations) return null;
  const entries = Object.entries(specialisations).filter(([, slugs]) => slugs.length > 0);
  if (entries.length === 0) return null;

  return (
    <ProfileSection title="Services">
      <View style={styles.groups}>
        {entries.map(([trade, slugs]) => (
          <View key={trade}>
            <Text style={[styles.groupLabel, { color: c.textSecondary }]}>{tradeName(trade)}</Text>
            <View style={styles.chips}>
              {slugs.map((slug) => (
                <Badge key={slug} variant="trade">
                  {getSpecialisationName(trade, slug) ?? slug.replace(/-/g, ' ')}
                </Badge>
              ))}
            </View>
          </View>
        ))}
      </View>
    </ProfileSection>
  );
}

const styles = StyleSheet.create({
  groups: {
    gap: Spacing.lg,
  },
  groupLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
    marginBottom: 6,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
});
