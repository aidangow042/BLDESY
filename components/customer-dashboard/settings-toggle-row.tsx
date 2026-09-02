/**
 * SettingsToggleRow — the settings page's ToggleRow (label + description +
 * switch), on a native Switch in the primary accent.
 */
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SettingsToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function SettingsToggleRow({ label, description, checked, onChange, disabled }: SettingsToggleRowProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={[styles.label, { color: c.textPrimary }]}>{label}</Text>
        <Text style={[styles.description, { color: c.textSecondary }]}>{description}</Text>
      </View>
      <Switch
        value={checked}
        onValueChange={onChange}
        disabled={disabled}
        accessibilityLabel={label}
        trackColor={{ false: c.border, true: c.primary }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.lg },
  text: { flex: 1, minWidth: 0 },
  label: { fontSize: 14, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
  description: { fontSize: 12, fontFamily: FontFamily.body, marginTop: 1 },
});
