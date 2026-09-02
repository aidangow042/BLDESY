/**
 * FieldLabel — the wizard's `text-sm font-medium text-text-primary` label with
 * the red required asterisk, or a muted "(optional)" suffix.
 */
import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface FieldLabelProps {
  children: string;
  required?: boolean;
  optional?: boolean;
  /** Small uppercase variant (the enterprise / When & How `text-xs font-bold uppercase` labels). */
  small?: boolean;
  /** Muted colour (the web's `text-text-secondary` labels in the profile editor). */
  muted?: boolean;
  nativeID?: string;
}

export function FieldLabel({ children, required, optional, small, muted, nativeID }: FieldLabelProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View style={styles.row}>
      <Text
        nativeID={nativeID}
        style={[
          small ? styles.small : styles.label,
          { color: muted || small ? c.textSecondary : c.textPrimary },
        ]}
      >
        {small ? children.toUpperCase() : children}
        {required ? <Text style={{ color: c.error }}> *</Text> : null}
        {optional ? (
          <Text style={[styles.optional, { color: c.textSecondary }]}> (optional)</Text>
        ) : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  small: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  optional: {
    fontFamily: FontFamily.body,
    fontWeight: '400',
  },
});
