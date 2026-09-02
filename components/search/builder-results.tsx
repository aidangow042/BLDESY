/**
 * BuilderResults — ~/bldesy-web/components/search/builder-results.tsx: the
 * page of result cards with the save heart wired to `useSavedBuilders`, and
 * ONE credentials disclaimer under the list (standing legal rule: verification
 * badges never appear without it).
 */
import { StyleSheet, View } from 'react-native';

import { BuilderCard } from '@/components/search/builder-card';
import { CredentialsDisclaimer } from '@/components/search/credentials-disclaimer';
import { Spacing } from '@/constants/theme';
import { useSavedBuilders } from '@/lib/data/saved';
import type { BuilderSearchResult } from '@/types';

interface BuilderResultsProps {
  builders: BuilderSearchResult[];
}

export function BuilderResults({ builders }: BuilderResultsProps) {
  const { isSaved, toggleSave } = useSavedBuilders();

  return (
    <View style={styles.list}>
      {builders.map((builder, index) => (
        <BuilderCard
          key={builder.user_id}
          builder={builder}
          position={index}
          saved={isSaved(builder.user_id)}
          onToggleSave={toggleSave}
        />
      ))}
      <CredentialsDisclaimer style={styles.disclaimer} />
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.xl,
  },
  disclaimer: {
    paddingTop: Spacing.xs,
  },
});
