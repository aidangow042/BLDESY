import { Platform, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
  body: string;
  isMine: boolean;
  timestamp: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  /** If true, this message immediately follows another from the same sender */
  isGrouped?: boolean;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
}

export function MessageBubble({ body, isMine, timestamp, attachmentUrl, attachmentType, isGrouped }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const isImage = attachmentType?.startsWith('image');

  // Indigo for sent, light slate for received (matching website spec)
  const sentBg = '#4f46e5';
  const receivedBg = isDark ? colors.surface : '#f1f5f9';
  const receivedBorder = isDark ? colors.border : '#e2e8f0';

  return (
    <View style={[styles.row, isMine ? styles.rowRight : styles.rowLeft, isGrouped && { marginTop: 2 }]}>
      <View
        style={[
          styles.bubble,
          isMine
            ? { backgroundColor: sentBg, borderBottomRightRadius: 6 }
            : { backgroundColor: receivedBg, borderBottomLeftRadius: 6, borderWidth: isDark ? 0 : 1, borderColor: receivedBorder },
          ...Platform.select({
            ios: isMine ? [] : [{ shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 }],
            default: [],
          }) as any[],
        ]}
      >
        {isImage && attachmentUrl && (
          <Image source={{ uri: attachmentUrl }} style={styles.attachmentImage} contentFit="cover" cachePolicy="disk" placeholder={{ blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH' }} />
        )}
        <Text style={[styles.body, { color: isMine ? '#ffffff' : colors.text }]}>
          {body}
        </Text>
      </View>
      {/* Timestamp outside bubble for cleaner look */}
      {!isGrouped && (
        <Text style={[styles.time, isMine ? styles.timeRight : styles.timeLeft, { color: colors.textSecondary }]}>
          {formatTime(timestamp)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 3,
    paddingHorizontal: Spacing.lg,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  rowLeft: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
  },
  time: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 3,
    marginBottom: 4,
  },
  timeRight: {
    marginRight: 4,
  },
  timeLeft: {
    marginLeft: 4,
  },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: Radius.md,
    marginBottom: Spacing.xs,
  },
});
