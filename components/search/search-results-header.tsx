/**
 * SearchResultsHeader — ~/bldesy-web/components/search/search-results-header.tsx
 * on the teal primary → primary-dark gradient band from app/search/page.tsx.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { resultsCountLabel, resultsHeading } from '@/components/search/search-params';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SearchResultsHeaderProps {
  trade?: string;
  location?: string;
  total: number;
  keywords?: string[];
  onNewSearch: () => void;
}

export function SearchResultsHeader({ trade, location, total, keywords = [], onNewSearch }: SearchResultsHeaderProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <LinearGradient
      colors={[c.gradientHeaderFrom, c.gradientHeaderTo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.band}
    >
      <View style={styles.row}>
        <View style={styles.text}>
          <Text accessibilityRole="header" style={styles.heading}>
            {resultsHeading(trade, location)}
          </Text>
          <Text style={styles.count}>{resultsCountLabel(total)}</Text>
          {keywords.length > 0 ? (
            <View style={styles.chips}>
              {keywords.map((kw) => (
                <View key={kw} style={styles.chip}>
                  <Text style={styles.chipText}>{kw}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="link"
          onPress={onNewSearch}
          style={({ pressed }) => [styles.newSearch, pressed && { backgroundColor: 'rgba(255,255,255,0.25)' }]}
        >
          <Text style={styles.newSearchText}>New Search</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  band: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['2xl'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  heading: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 20,
    lineHeight: 26,
    color: '#ffffff',
  },
  count: {
    marginTop: 2,
    fontFamily: FontFamily.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.sm,
  },
  chip: {
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  chipText: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 12,
    color: '#ffffff',
  },
  newSearch: {
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newSearchText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
    color: '#ffffff',
  },
});
