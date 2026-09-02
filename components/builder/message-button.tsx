/**
 * MessageButton — the discovery surfaces' styled trigger over the shared
 * `SendMessageButton` (components/messages/send-message-button.tsx: guest
 * sign-in prompt, find-or-create via the website API, opens the thread). This
 * only supplies the three web treatments — filled gradient, outline, ghost —
 * plus the profile's sticky bar; the behaviour lives in one place.
 */
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

import { SendMessageButton } from '@/components/messages/send-message-button';
import { Colors, FontFamily, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type MessageButtonVariant = 'primary' | 'outline' | 'ghost' | 'sticky';

interface MessageButtonProps {
  /** The tradie's / company's `user_id`. */
  recipientId: string;
  label?: string;
  icon?: IoniconName | null;
  variant?: MessageButtonVariant;
  style?: StyleProp<ViewStyle>;
}

export function MessageButton({
  recipientId,
  label = 'Send a Message',
  icon = 'mail-outline',
  variant = 'primary',
  style,
}: MessageButtonProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const isFilled = variant === 'primary' || variant === 'sticky';
  const fg = isFilled ? '#ffffff' : variant === 'outline' ? c.primary : c.textPrimary;
  const height = variant === 'sticky' ? 56 : 44;
  const fontSize = variant === 'sticky' ? 16 : 14;

  const containerStyle = StyleSheet.flatten([
    styles.base,
    { height, borderRadius: variant === 'sticky' ? Radius.lg : Radius.xl },
    variant === 'outline' && { borderWidth: 2, borderColor: c.primary, backgroundColor: 'transparent' },
    variant === 'ghost' && { borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
    variant === 'sticky' && Shadows.lg,
    style,
  ]) as ViewStyle;

  return (
    <SendMessageButton recipientId={recipientId} style={containerStyle}>
      {isFilled ? (
        <LinearGradient
          colors={[c.primary, c.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={styles.row}>
        {icon ? <Ionicons name={icon} size={variant === 'sticky' ? 20 : 16} color={fg} /> : null}
        <Text style={[styles.label, { color: fg, fontSize }]}>{label}</Text>
      </View>
    </SendMessageButton>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
});
