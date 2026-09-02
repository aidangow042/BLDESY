/**
 * ACL misleading-conduct disclaimer rendered beneath verification badge
 * blocks wherever they're shown. Port of
 * ~/bldesy-web/components/builder/credentials-disclaimer.tsx — one wording so
 * it can't drift between screens.
 */
import { StyleSheet, Text, type TextStyle } from 'react-native';

import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function CredentialsDisclaimer({ style }: { style?: TextStyle }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <Text style={[styles.text, { color: c.textSecondary }, style]}>
      Badges confirm documents we&apos;ve checked — they aren&apos;t a guarantee of work quality or
      safety. Always confirm licences with the official register before hiring.
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 12, lineHeight: 18, fontFamily: FontFamily.body },
});
