/**
 * Photo grid + document list for the Post a Job wizard — the inline uploaders
 * in ~/bldesy-web/components/jobs/job-wizard.tsx (homeowner "Photos" box and
 * the enterprise "Site Photos & Plans" / "Documents (PDF, plans, specs)").
 * Picking + uploading is the wizard's job; these render state and fire callbacks.
 */
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface PhotoGridProps {
  photos: string[];
  uploading: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
  /** Hover/spinner tint — primary for homeowners, indigo for enterprise. */
  accent?: string;
}

export function PhotoGrid({ photos, uploading, onAdd, onRemove, accent }: PhotoGridProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const tint = accent ?? c.primary;

  return (
    <View style={styles.grid}>
      {photos.map((url, i) => (
        <View key={`${url}-${i}`} style={[styles.tile, { borderColor: c.border }]}>
          <Image source={{ uri: url }} style={styles.tileImage} contentFit="cover" accessibilityLabel={`Photo ${i + 1}`} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove photo ${i + 1}`}
            onPress={() => onRemove(i)}
            hitSlop={6}
            style={[styles.remove, { backgroundColor: c.error + 'E6' }]}
          >
            <Ionicons name="close" size={14} color="#ffffff" />
          </Pressable>
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add photo"
        accessibilityState={{ busy: uploading, disabled: uploading }}
        disabled={uploading}
        onPress={onAdd}
        style={({ pressed }) => [
          styles.addTile,
          { borderColor: pressed ? tint + '4D' : c.border },
        ]}
      >
        {uploading ? (
          <ActivityIndicator size="small" color={tint} />
        ) : (
          <>
            <Ionicons name="image-outline" size={20} color={c.textSecondary + '66'} />
            <Text style={[styles.addText, { color: c.textSecondary + '80' }]}>Add photo</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

interface DocumentListProps {
  docs: string[];
  uploading: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
  accent?: string;
}

export function DocumentList({ docs, uploading, onAdd, onRemove, accent }: DocumentListProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const tint = accent ?? c.indigo;

  return (
    <View style={{ gap: Spacing.sm }}>
      {docs.map((url, i) => (
        <View key={`${url}-${i}`} style={[styles.docRow, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Ionicons name="document-text-outline" size={16} color={tint} />
          <Pressable
            accessibilityRole="link"
            onPress={() => WebBrowser.openBrowserAsync(url).catch(() => {})}
            style={{ flex: 1 }}
          >
            <Text style={[styles.docLink, { color: tint }]} numberOfLines={1}>
              Document {i + 1}
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => onRemove(i)} hitSlop={6}>
            <Text style={[styles.docRemove, { color: c.error }]}>Remove</Text>
          </Pressable>
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: uploading, disabled: uploading }}
        disabled={uploading}
        onPress={onAdd}
        style={({ pressed }) => [styles.docAdd, { borderColor: pressed ? tint + '66' : c.border }]}
      >
        {uploading ? (
          <ActivityIndicator size="small" color={tint} />
        ) : (
          <Ionicons name="add" size={16} color={c.textSecondary} />
        )}
        <Text style={[styles.docAddText, { color: c.textSecondary }]}>Upload document</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tile: {
    width: 112,
    height: 80,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  tileImage: { width: '100%', height: '100%' },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: {
    width: 112,
    height: 80,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addText: { fontSize: 10, fontFamily: FontFamily.body },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  docLink: { fontSize: 12, fontFamily: FontFamily.body },
  docRemove: { fontSize: 12, fontFamily: FontFamily.body },
  docAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  docAddText: { fontSize: 12, fontFamily: FontFamily.body },
});
