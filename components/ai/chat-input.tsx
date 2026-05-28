/**
 * ChatInput — sticky input at the bottom of the AI tab. Mirrors web
 * `components/ai/chat-input.tsx`: rounded-full pill input + round send button
 * with primary gradient.
 */

import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  loading: boolean;
}

export function ChatInput({ value, onChange, onSubmit, disabled, loading }: ChatInputProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const canSend = !loading && value.trim().length > 0;

  return (
    <View style={[styles.bar, { backgroundColor: c.surface + 'CC', borderTopColor: c.border }]}>
      <View style={styles.row}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="Ask me anything…"
          placeholderTextColor={c.textSecondary + '66'}
          editable={!disabled}
          onSubmitEditing={onSubmit}
          returnKeyType="send"
          style={[
            styles.input,
            {
              backgroundColor: c.canvas,
              color: c.textPrimary,
              borderColor: c.border,
              fontFamily: FontFamily.body,
            },
          ]}
        />
        <Pressable
          onPress={onSubmit}
          disabled={!canSend}
          style={({ pressed }) => [
            styles.sendBtn,
            !canSend && { opacity: 0.35 },
            pressed && canSend && { transform: [{ scale: 0.95 }] },
            Shadows.md,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Send message"
        >
          <LinearGradient
            colors={[c.primary, c.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <TextSendGlyph />
        </Pressable>
      </View>
    </View>
  );
}

function TextSendGlyph() {
  // Paper-plane glyph rendered via a single rotated triangle of text — keeps
  // bundle small without pulling in another icon library.
  return (
    <View style={styles.glyphWrap}>
      <View style={[styles.glyphLine, { transform: [{ rotate: '45deg' }] }]} />
      <View style={[styles.glyphArrow, { transform: [{ rotate: '45deg' }, { translateX: 1 }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: 10,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 18,
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphWrap: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphLine: {
    position: 'absolute',
    width: 14,
    height: 2,
    backgroundColor: '#ffffff',
    borderRadius: 1,
  },
  glyphArrow: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: '#ffffff',
    transform: [{ rotate: '45deg' }],
  },
});
