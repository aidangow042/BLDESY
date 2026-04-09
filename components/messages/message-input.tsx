import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
};

export function MessageInput({ onSend, disabled }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const canSend = text.trim().length > 0 && !sending && !disabled;

  async function handleSend() {
    if (!canSend) return;
    const msg = text.trim();
    setText('');
    setSending(true);
    try {
      await onSend(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={[styles.container, { borderTopColor: colors.border, backgroundColor: isDark ? colors.surface : '#ffffff' }]}>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
            color: colors.text,
          },
        ]}
        value={text}
        onChangeText={setText}
        placeholder="Type a message..."
        placeholderTextColor={colors.textSecondary}
        multiline
        maxLength={2000}
        editable={!disabled}
        returnKeyType="send"
        blurOnSubmit={false}
        onSubmitEditing={Platform.OS === 'web' ? handleSend : undefined}
      />
      <Pressable
        style={[styles.sendBtn, { backgroundColor: canSend ? colors.teal : colors.border }]}
        onPress={handleSend}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Send message"
      >
        {sending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <MaterialIcons name="send" size={20} color={canSend ? '#fff' : colors.textSecondary} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    fontSize: 15,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
