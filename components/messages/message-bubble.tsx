/**
 * One chat bubble — port of ~/bldesy-web/components/messages/message-bubble.tsx.
 * Sender = primary, receiver = surface + border, failed = error tint with the
 * website's "Failed to send" label.
 */
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MESSAGE_SEND_FAILED_LABEL } from '@/lib/data/messages';

interface MessageBubbleProps {
  body: string;
  isSender: boolean;
  timestamp: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
}

export function formatMessageTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function MessageBubble({ body, isSender, timestamp, attachmentUrl, attachmentType }: MessageBubbleProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const isFailed = attachmentType === 'failed';

  const bubbleStyle = isFailed
    ? { backgroundColor: c.error + '1A', borderColor: c.error + '33', borderWidth: 1 }
    : isSender
      ? { backgroundColor: c.primary }
      : { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1 };
  const textColor = isSender && !isFailed ? '#fff' : c.textPrimary;

  return (
    <View style={[styles.row, isSender ? styles.rowEnd : styles.rowStart]}>
      <View
        style={[
          styles.bubble,
          Shadows.sm,
          bubbleStyle,
          isSender ? styles.bubbleSender : styles.bubbleReceiver,
        ]}
      >
        {attachmentUrl && attachmentType === 'image' ? (
          <Image
            source={{ uri: attachmentUrl }}
            accessibilityLabel="Attachment"
            contentFit="cover"
            cachePolicy="disk"
            style={styles.attachmentImage}
          />
        ) : null}
        {attachmentUrl && attachmentType === 'document' ? (
          <Pressable
            onPress={() => Linking.openURL(attachmentUrl)}
            accessibilityRole="link"
            style={[
              styles.docLink,
              { backgroundColor: isSender ? 'rgba(255,255,255,0.1)' : c.canvas },
            ]}
          >
            <MaterialIcons name="description" size={16} color={isSender ? 'rgba(255,255,255,0.9)' : c.primary} />
            <Text style={[styles.docText, { color: isSender ? 'rgba(255,255,255,0.9)' : c.primary }]}>
              View document
            </Text>
          </Pressable>
        ) : null}
        <Text style={[styles.body, { color: textColor }]}>{body}</Text>
        <View style={[styles.metaRow, isSender && styles.metaRowEnd]}>
          <Text style={[styles.time, { color: isSender && !isFailed ? 'rgba(255,255,255,0.5)' : c.textSecondary }]}>
            {formatMessageTime(timestamp)}
          </Text>
          {isFailed ? (
            <Text style={[styles.failed, { color: c.error }]}>{MESSAGE_SEND_FAILED_LABEL}</Text>
          ) : isSender ? (
            <MaterialIcons name="check" size={14} color="rgba(255,255,255,0.4)" />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: Spacing.lg, marginVertical: 4 },
  rowEnd: { justifyContent: 'flex-end' },
  rowStart: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', paddingHorizontal: Spacing.lg, paddingVertical: 10, borderRadius: Radius.xl },
  bubbleSender: { borderBottomRightRadius: Radius.sm },
  bubbleReceiver: { borderBottomLeftRadius: Radius.sm },
  attachmentImage: { width: 220, height: 160, borderRadius: Radius.lg, marginBottom: Spacing.sm },
  docLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    padding: 10,
    marginBottom: Spacing.sm,
  },
  docText: { fontSize: 12, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
  body: { fontSize: 15, lineHeight: 22, fontFamily: FontFamily.body },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaRowEnd: { justifyContent: 'flex-end' },
  time: { fontSize: 11, fontFamily: FontFamily.body },
  failed: { fontSize: 11, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
});
