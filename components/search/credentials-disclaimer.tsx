/**
 * The ACL credentials disclaimer for the discovery surfaces — a thin wrapper
 * over the shared `components/builder/credentials-disclaimer.tsx` (one wording,
 * one place) that adds the colour override the dark search hero needs.
 */
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import { CredentialsDisclaimer as SharedDisclaimer } from '@/components/builder/credentials-disclaimer';

interface CredentialsDisclaimerProps {
  style?: StyleProp<TextStyle>;
  /** Override the text colour (e.g. on the dark search hero). */
  color?: string;
}

export function CredentialsDisclaimer({ style, color }: CredentialsDisclaimerProps) {
  const flat = StyleSheet.flatten([color ? { color } : null, style]) as TextStyle | undefined;
  return <SharedDisclaimer style={flat} />;
}
