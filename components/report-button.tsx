import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useToast } from '@/components/ui';
import { ReportModal, type ReportContentType } from '@/components/report-modal';

interface Props {
  contentType: ReportContentType;
  contentId?: string | null;
  reportedUserId?: string | null;
  allowBlock?: boolean;
  /** Render as an icon-only button (default) or a labelled row. */
  variant?: 'icon' | 'label';
  /** Icon size for the icon variant. */
  size?: number;
  color?: string;
  style?: ViewStyle;
}

/**
 * Drop-in Report affordance: an icon (or labelled row) that opens the
 * ReportModal and shows a confirmation toast on submit. Used across every UGC
 * surface (profiles, reviews, jobs, messages).
 */
export function ReportButton({
  contentType,
  contentId = null,
  reportedUserId = null,
  allowBlock = true,
  variant = 'icon',
  size = 20,
  color,
  style,
}: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const toast = useToast();
  const [open, setOpen] = useState(false);

  const tint = color ?? c.textSecondary;

  function handleSubmitted(didBlock: boolean) {
    setOpen(false);
    toast.show(
      didBlock ? 'Reported and blocked. Thanks for letting us know.' : 'Report submitted. Thanks for letting us know.',
      { variant: 'success', duration: 4000 },
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Report content"
        style={style}
      >
        {variant === 'icon' ? (
          <Ionicons name="flag-outline" size={size} color={tint} />
        ) : (
          <View style={styles.labelRow}>
            <Ionicons name="flag-outline" size={size} color={tint} />
            <Text style={[styles.label, { color: tint }]}>Report</Text>
          </View>
        )}
      </Pressable>

      <ReportModal
        visible={open}
        onClose={() => setOpen(false)}
        contentType={contentType}
        contentId={contentId}
        reportedUserId={reportedUserId}
        allowBlock={allowBlock}
        onSubmitted={handleSubmitted}
      />
    </>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 14, fontWeight: '600' },
});
