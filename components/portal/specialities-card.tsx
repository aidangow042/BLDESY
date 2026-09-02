/**
 * SpecialitiesCard — port of `~/bldesy-web/components/builder/specialities-card.tsx`.
 *
 * Post-approval entry point for picking sub-trade specialities. By the time
 * this card shows every licensed trade's licence is already verified, so
 * non-licensed trades simply pick away. Saves straight to builder_profiles
 * (same path as edit-profile, RLS-scoped to the owner).
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SpecialityPicker } from '@/components/trades/speciality-picker';
import { Card } from '@/components/ui';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { updateOwnBuilderProfile } from '@/lib/data/profile-edit';
import {
  hasSpecialisations,
  sanitiseSpecialisations,
  type BuilderSpecialisations,
} from '@/lib/web/trade-specialisations';
import { formatTradeName } from '@/lib/web/trades';

import { usePortal } from './portal-context';

interface SpecialitiesCardProps {
  /** The builder's trades — drives which sub-trade groups appear. */
  trades: string[];
  /** Current specialisations from builder_profiles. */
  initial: BuilderSpecialisations;
}

export function SpecialitiesCard({ trades, initial }: SpecialitiesCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { refreshProfile } = usePortal();
  const [value, setValue] = useState<BuilderSpecialisations>(initial);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    [],
  );

  const eligible = trades.filter((t) => hasSpecialisations(t));
  if (eligible.length === 0) return null;

  const count = eligible.reduce((n, t) => n + (value[t]?.length ?? 0), 0);

  async function save() {
    const clean = sanitiseSpecialisations(value, trades);
    try {
      await updateOwnBuilderProfile({ specialisations: clean });
    } catch {
      return;
    }
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 2500);
    void refreshProfile();
  }

  return (
    <Card padding={Spacing.xl}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: c.textPrimary }]}>Your specialities</Text>
          <Text style={[styles.sub, { color: c.textSecondary }]}>
            {count > 0
              ? `${count} selected — you show first when customers search for these.`
              : 'Add the sub-trades you specialise in so the right jobs and searches surface you first.'}
          </Text>
        </View>
        {saved ? <Text style={[styles.saved, { color: c.success }]}>Saved ✓</Text> : null}
      </View>
      <View style={styles.picker}>
        <SpecialityPicker
          selectedTrades={eligible}
          value={value}
          onChange={setValue}
          onDone={() => void save()}
          tradeName={formatTradeName}
          triggerLabel={count > 0 ? 'Edit specialities' : 'Select specialities'}
          title="Your specialities"
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  sub: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  saved: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  picker: {
    marginTop: Spacing.md,
  },
});
