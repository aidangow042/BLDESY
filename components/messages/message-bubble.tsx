import { Image, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
  body: string;
  isMine: boolean;
  timestamp: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
}

export function MessageBubble({ body, isMine, timestamp, attachmentUrl, attachmentType }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const isImage = attachmentType?.startsWith('image');

  return (
    <View style={[styles.row, isMine ? styles.rowRight : styles.rowLeft]}>
      <View
        style={[
          styles.bubble,
          isMine
            ? { backgroundColor: colors.teal, borderBottomRightRadius: 4 }
            : { backgroundColor: isDark ? colors.surface : '#f1f5f9', borderBottomLeftRadius: 4 },
        ]}
      >
        {isImage && attachmentUrl && (
          <Image
            source={{ uri: attachmentUrl }}
            style={styles.attachmentImage}
            resizeMode="cover"
          />
        )}
        <Text style={[styles.body, { color: isMine ? '#ffffff' : colors.text }]}>
          {body}
        </Text>
        <Text
          style={[
            styles.time,
            { color: isMine ? 'rgba(255,255,255,0.6)' : colors.textSecondary },
          ]}
        >
          {formatTime(timestamp)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  rowLeft: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  body: {
    ...Type.body,
  },
  time: {
    ...Type.micro,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: Radius.md,
    marginBottom: Spacing.xs,
  },
});
