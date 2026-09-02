/**
 * MethodTabs — the Email | Phone toggle at the top of the login and signup
 * forms. Mirrors the website's segmented control
 * (`grid-cols-2 gap-1 rounded-2xl bg-canvas p-1`, active tab
 * `bg-surface text-text-primary shadow-sm`).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type AuthMethod = 'email' | 'phone';

const METHODS: readonly AuthMethod[] = ['email', 'phone'];
const LABELS: Record<AuthMethod, string> = { email: 'Email', phone: 'Phone' };

interface Props {
  value: AuthMethod;
  onChange: (method: AuthMethod) => void;
}

export function MethodTabs({ value, onChange }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <View accessibilityRole="tablist" style={[styles.track, { backgroundColor: c.canvas }]}>
      {METHODS.map((method) => {
        const active = method === value;
        return (
          <Pressable
            key={method}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(method)}
            style={[styles.tab, active && [Shadows.sm, { backgroundColor: c.surface }]]}
          >
            <Text style={[styles.label, { color: active ? c.textPrimary : c.textSecondary }]}>
              {LABELS[method]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: Spacing.xs,
    padding: Spacing.xs,
    borderRadius: Radius.xl,
  },
  tab: {
    flex: 1,
    height: 36,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
});
