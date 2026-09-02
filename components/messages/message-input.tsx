/**
 * The composer — port of ~/bldesy-web/components/messages/message-input.tsx.
 * Mirrors the DB CHECK constraint (messages_body_length, 2000 chars) so long
 * pastes are truncated client-side; the remaining-characters counter appears
 * at 200 left, like the website.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MESSAGE_MAX_LENGTH } from '@/lib/data/messages';

interface MessageInputProps {
  onSend: (body: string) => void;
  disabled?: boolean;
  /** Safe-area / tab-bar padding under the bar. */
  bottomInset?: number;
}

export function MessageInput({ onSend, disabled, bottomInset = 0 }: MessageInputProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [text, setText] = useState('');

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  }

  const remaining = MESSAGE_MAX_LENGTH - text.length;
  const showCounter = remaining <= 200;
  const canSend = text.trim().length > 0 && !disabled;

  return (
    <View
      style={[
        styles.bar,
        { borderTopColor: c.border, backgroundColor: c.surface, paddingBottom: Spacing.md + bottomInset },
      ]}
    >
      <View style={styles.inputWrap}>
        <TextInput
          value={text}
          onChangeText={(v) => setText(v.slice(0, MESSAGE_MAX_LENGTH))}
          placeholder="Type a message..."
          placeholderTextColor={c.textSecondary + '80'}
          multiline
          maxLength={MESSAGE_MAX_LENGTH}
          editable={!disabled}
          style={[
            styles.input,
            { backgroundColor: c.canvas, borderColor: c.border, color: c.textPrimary, opacity: disabled ? 0.5 : 1 },
          ]}
          accessibilityLabel="Type a message"
        />
        {showCounter ? (
          <Text
            style={[styles.counter, { color: remaining < 0 ? c.error : c.textSecondary }]}
            accessibilityLiveRegion="polite"
          >
            {remaining}
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={handleSend}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Send message"
        accessibilityState={{ disabled: !canSend }}
        style={[styles.sendBtn, { backgroundColor: c.primary, opacity: canSend ? 1 : 0.4 }]}
      >
        <MaterialIcons name="send" size={20} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  inputWrap: { flex: 1, position: 'relative' },
  input: {
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  counter: { position: 'absolute', bottom: 4, right: 12, fontSize: 10, fontFamily: FontFamily.body },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
