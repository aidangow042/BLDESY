/**
 * AuthFooterLink — "Don't have an account? Sign up" style footer row.
 * Mirrors the website's `text-sm text-text-secondary` line with a
 * `font-semibold text-primary` link.
 */
import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Props {
  prompt: string;
  linkLabel: string;
  href: Href;
}

export function AuthFooterLink({ prompt, linkLabel, href }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View style={styles.row}>
      <Text style={[styles.prompt, { color: c.textSecondary }]}>{prompt} </Text>
      <Link href={href} asChild>
        <Pressable hitSlop={6} accessibilityRole="link">
          <Text style={[styles.link, { color: c.primary }]}>{linkLabel}</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  prompt: {
    fontSize: 14,
    fontFamily: FontFamily.body,
  },
  link: {
    fontSize: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
});
