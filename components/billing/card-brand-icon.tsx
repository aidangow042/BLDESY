/**
 * CardBrandIcon — port of the shared card-brand chip in
 * `~/bldesy-web/app/portal/billing/native-actions.tsx` (VISA / Mastercard /
 * AMEX / fallback), used by the tradie + enterprise billing pages.
 */
import { StyleSheet, Text, View } from 'react-native';

import { FontFamily, Radius } from '@/constants/theme';

export function CardBrandIcon({ brand }: { brand: string }) {
  const b = brand.toLowerCase();

  if (b === 'visa') {
    return (
      <View style={[styles.chip, { backgroundColor: '#1a1f71' }]}>
        <Text style={[styles.chipText, styles.visa]}>VISA</Text>
      </View>
    );
  }
  if (b === 'mastercard') {
    return (
      <View style={[styles.chip, { backgroundColor: '#1a1a1a' }]}>
        <View style={styles.circles}>
          <View style={[styles.circle, { backgroundColor: '#eb001b' }]} />
          <View style={[styles.circle, styles.circleOverlap, { backgroundColor: '#f79e1b' }]} />
        </View>
      </View>
    );
  }
  if (b === 'amex') {
    return (
      <View style={[styles.chip, { backgroundColor: '#006fcf' }]}>
        <Text style={[styles.chipText, styles.amex]}>AMEX</Text>
      </View>
    );
  }
  return (
    <View style={[styles.chip, { backgroundColor: '#e5e7eb' }]}>
      <Text style={[styles.chipText, styles.fallback]} numberOfLines={1}>
        {brand.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    width: 56,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  chipText: {
    color: '#ffffff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '900',
  },
  visa: {
    fontSize: 11,
    fontStyle: 'italic',
    letterSpacing: 1,
  },
  amex: {
    fontSize: 9,
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  fallback: {
    color: '#6b7280',
    fontSize: 10,
    fontWeight: '600',
  },
  circles: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    opacity: 0.9,
  },
  circleOverlap: {
    marginLeft: -6,
  },
});
