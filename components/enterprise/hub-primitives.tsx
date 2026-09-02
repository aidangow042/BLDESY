/**
 * Enterprise Hub building blocks — the Tailwind recipes the website's
 * /enterprise/* pages repeat (gradient header card, `rounded-2xl border
 * bg-surface shadow-sm` sections, status pills, metric cards, rounded-full
 * pill buttons, the centred spinner, the confirm dialogs) as small native
 * primitives. Indigo is the accent throughout (`c.indigo`).
 */
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors, FontFamily, Radius, Shadows, Spacing, type ThemeTokens } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { jobStatusLabel, jobStatusTone } from '@/lib/enterprise-hub/format';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

export function useHubTheme(): ThemeTokens {
  const scheme = useColorScheme() ?? 'light';
  return Colors[scheme];
}

/* ── Screen scaffold ────────────────────────────────────────────────── */

interface HubScreenProps {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Vertical gap between top-level blocks (web space-y-8 = 32, space-y-6 = 24). */
  gap?: number;
  contentStyle?: StyleProp<ViewStyle>;
}

/** The `mx-auto max-w-6xl px-4 py-6` content column, scrollable. */
export function HubScreen({ children, refreshing, onRefresh, gap = Spacing['2xl'], contentStyle }: HubScreenProps) {
  const c = useHubTheme();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.canvas }}
      contentContainerStyle={[styles.screen, { gap }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.indigo} /> : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

/* ── Gradient header card ───────────────────────────────────────────── */

interface GradientHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: { label: string; onPress: () => void; icon?: IoniconName };
  /** Rendered under the title row (e.g. the analytics period pills). */
  children?: ReactNode;
  /** Alternate stops (analytics uses indigo-700 → violet-500). */
  colors?: [string, string, string];
}

/** `rounded-2xl bg-gradient-to-br from-indigo-dark via-indigo to-indigo-light px-6 py-8 text-white`. */
export function GradientHeader({ title, subtitle, action, children, colors }: GradientHeaderProps) {
  const c = useHubTheme();
  return (
    <LinearGradient
      colors={colors ?? [c.indigoDark, c.indigo, c.indigoLight]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <View pointerEvents="none" style={styles.blobTopRight} />
      <View pointerEvents="none" style={styles.blobBottomLeft} />
      <View style={styles.gradientBody}>
        <View style={styles.gradientTextCol}>
          {typeof title === 'string' ? (
            <Text accessibilityRole="header" style={styles.gradientTitle}>
              {title}
            </Text>
          ) : (
            title
          )}
          {subtitle ? <Text style={styles.gradientSubtitle}>{subtitle}</Text> : null}
        </View>
        {action ? (
          <Pressable
            accessibilityRole="button"
            onPress={action.onPress}
            style={({ pressed }) => [styles.whitePill, Shadows.sm, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name={action.icon ?? 'add'} size={16} color={c.indigo} />
            <Text style={[styles.whitePillLabel, { color: c.indigo }]}>{action.label}</Text>
          </Pressable>
        ) : null}
        {children}
      </View>
    </LinearGradient>
  );
}

/* ── Section card ───────────────────────────────────────────────────── */

interface SectionCardProps {
  children?: ReactNode;
  /** Header row (`px-5 py-4 border-b`) with an optional right-hand link. */
  title?: string;
  action?: { label: string; onPress: () => void };
  /** Body padding (web p-5 = 20). 0 for divided lists. */
  padding?: number;
  style?: StyleProp<ViewStyle>;
  /** Tinted variant — the "Live Job Insights" indigo panel. */
  tone?: 'surface' | 'indigo' | 'error';
}

/** `rounded-2xl border border-border bg-surface shadow-sm`. */
export function SectionCard({ children, title, action, padding = Spacing.xl, style, tone = 'surface' }: SectionCardProps) {
  const c = useHubTheme();
  const toneStyle =
    tone === 'indigo'
      ? { backgroundColor: c.indigo + '0D', borderColor: c.indigo + '33' }
      : tone === 'error'
        ? { backgroundColor: c.error + '05', borderColor: c.error + '33' }
        : { backgroundColor: c.surface, borderColor: c.border };
  return (
    <View style={[styles.card, toneStyle, Shadows.sm, style]}>
      {title ? (
        <View style={[styles.cardHeader, { borderBottomColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{title}</Text>
          {action ? <LinkText label={action.label} onPress={action.onPress} /> : null}
        </View>
      ) : null}
      <View style={{ padding }}>{children}</View>
    </View>
  );
}

/** `text-sm font-bold text-text-primary` section heading. */
export function SectionTitle({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useHubTheme();
  return <Text style={[styles.cardTitle, { color: c.textPrimary }, style]}>{children}</Text>;
}

/** `text-2xl font-bold` page heading + `text-sm text-text-secondary` subtitle. */
export function PageTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const c = useHubTheme();
  return (
    <View style={styles.pageTitleRow}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text accessibilityRole="header" style={[styles.pageTitle, { color: c.textPrimary }]}>
          {title}
        </Text>
        {subtitle ? <Text style={[styles.pageSubtitle, { color: c.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/** `text-xs font-semibold text-indigo hover:underline`. */
export function LinkText({
  label,
  onPress,
  color,
  size = 12,
  icon,
}: {
  label: string;
  onPress: () => void;
  color?: string;
  size?: number;
  icon?: IoniconName;
}) {
  const c = useHubTheme();
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8} style={styles.linkRow}>
      {icon ? <Ionicons name={icon} size={size + 2} color={color ?? c.indigo} /> : null}
      <Text style={[styles.link, { color: color ?? c.indigo, fontSize: size }]}>{label}</Text>
    </Pressable>
  );
}

/* ── Pills ──────────────────────────────────────────────────────────── */

export type PillTone = 'indigo' | 'success' | 'warning' | 'error' | 'neutral' | 'primary' | 'amber';

export function pillColours(tone: PillTone, c: ThemeTokens): { bg: string; fg: string } {
  switch (tone) {
    case 'indigo':
      return { bg: c.indigo + '1A', fg: c.indigo };
    case 'success':
      return { bg: c.successBg, fg: c.success };
    case 'warning':
      return { bg: c.warning + '1A', fg: c.warning };
    case 'error':
      return { bg: c.error + '1A', fg: c.error };
    case 'primary':
      return { bg: c.primary + '1A', fg: c.primary };
    case 'amber':
      // Tailwind amber-100 / amber-800 — the "preferred" + partial-match chips.
      return { bg: '#fef3c7', fg: '#92400e' };
    default:
      return { bg: c.canvas, fg: c.textSecondary };
  }
}

/** Small rounded-full pill: `px-2.5 py-0.5 text-[10px]/text-xs font-bold`. */
export function TinyPill({
  label,
  tone = 'indigo',
  size = 'xs',
  dot,
  onPress,
  trailing,
  style,
}: {
  label: string;
  tone?: PillTone;
  size?: 'xxs' | 'xs' | 'sm';
  /** Leading status dot in the foreground colour. */
  dot?: boolean;
  onPress?: () => void;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useHubTheme();
  const { bg, fg } = pillColours(tone, c);
  const fontSize = size === 'xxs' ? 10 : size === 'sm' ? 12 : 11;
  const body = (
    <View style={[styles.pill, { backgroundColor: bg }, style]}>
      {dot ? <View style={[styles.pillDot, { backgroundColor: fg }]} /> : null}
      <Text style={[styles.pillLabel, { color: fg, fontSize }]}>{label}</Text>
      {trailing}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={6}>
      {body}
    </Pressable>
  );
}

/** Job status pill — open / in progress / completed / closed, with the web's colour map. */
export function JobStatusPill({ status, size = 'xxs' }: { status: string; size?: 'xxs' | 'xs' | 'sm' }) {
  const tone = jobStatusTone(status);
  const pillTone: PillTone =
    tone === 'open' ? 'success' : tone === 'in_progress' ? 'primary' : tone === 'completed' ? 'neutral' : 'error';
  return <TinyPill label={jobStatusLabel(status)} tone={pillTone} size={size} dot />;
}

/* ── Buttons ────────────────────────────────────────────────────────── */

export type PillButtonVariant =
  | 'indigo'
  | 'primary'
  | 'white'
  | 'outline-indigo'
  | 'outline-error'
  | 'outline-white'
  | 'outline'
  | 'success'
  | 'error'
  | 'ghost';

interface PillButtonProps {
  label: string;
  onPress: () => void;
  variant?: PillButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: IoniconName;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** `rounded-full px-4 py-1.5 text-xs font-bold` and friends. */
export function PillButton({
  label,
  onPress,
  variant = 'indigo',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  style,
}: PillButtonProps) {
  const c = useHubTheme();
  const isDisabled = disabled || loading;
  const palette = (() => {
    switch (variant) {
      case 'primary':
        return { bg: c.primary, fg: '#ffffff', border: 'transparent' };
      case 'white':
        return { bg: '#ffffff', fg: c.indigo, border: 'transparent' };
      case 'outline-indigo':
        return { bg: 'transparent', fg: c.indigo, border: c.indigo };
      case 'outline-error':
        return { bg: 'transparent', fg: c.error, border: c.error };
      case 'outline-white':
        return { bg: 'transparent', fg: '#ffffff', border: 'rgba(255,255,255,0.4)' };
      case 'outline':
        return { bg: c.surface, fg: c.textPrimary, border: c.border };
      case 'success':
        return { bg: c.success, fg: '#ffffff', border: 'transparent' };
      case 'error':
        return { bg: c.error, fg: '#ffffff', border: 'transparent' };
      case 'ghost':
        return { bg: 'transparent', fg: c.textSecondary, border: 'transparent' };
      default:
        return { bg: c.indigo, fg: '#ffffff', border: 'transparent' };
    }
  })();
  const height = size === 'sm' ? 32 : size === 'lg' ? 48 : 40;
  const fontSize = size === 'sm' ? 12 : 14;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pillButton,
        {
          height,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: palette.border === 'transparent' ? 0 : 1,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          paddingHorizontal: size === 'sm' ? Spacing.lg : Spacing.xl,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : icon ? (
        <Ionicons name={icon} size={fontSize + 2} color={palette.fg} />
      ) : null}
      <Text style={[styles.pillButtonLabel, { color: palette.fg, fontSize }]}>{label}</Text>
    </Pressable>
  );
}

/* ── Metric card ────────────────────────────────────────────────────── */

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: ReactNode;
  /** Left border accent colour (`border-l-4 border-l-indigo`). */
  accent?: string;
  icon?: IoniconName;
  /** Inline badge next to the value ("+3 today"). */
  badge?: ReactNode;
  compact?: boolean;
}

export function MetricCard({ label, value, sub, accent, icon, badge, compact = false }: MetricCardProps) {
  const c = useHubTheme();
  return (
    <View
      style={[
        styles.metric,
        Shadows.sm,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
          borderLeftColor: accent ?? c.border,
          borderLeftWidth: accent ? 4 : 1,
          padding: compact ? Spacing.lg : Spacing.xl,
        },
      ]}
    >
      <View style={styles.metricLabelRow}>
        {icon ? <Ionicons name={icon} size={compact ? 16 : 18} color={c.textSecondary + '66'} /> : null}
        <Text style={[styles.metricLabel, { color: c.textSecondary }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={styles.metricValueRow}>
        <Text style={[styles.metricValue, { color: c.textPrimary, fontSize: compact ? 24 : 30 }]}>{value}</Text>
        {badge}
      </View>
      {sub ? <Text style={[styles.metricSub, { color: c.textSecondary }]}>{sub}</Text> : null}
    </View>
  );
}

/* ── States ─────────────────────────────────────────────────────────── */

/** Centred indigo spinner with optional caption ("Loading dashboard..."). */
export function Spinner({ label, minHeight = 240 }: { label?: string; minHeight?: number }) {
  const c = useHubTheme();
  return (
    <View style={[styles.spinner, { minHeight }]}>
      <ActivityIndicator size="large" color={c.indigo} />
      {label ? <Text style={[styles.spinnerLabel, { color: c.textSecondary }]}>{label}</Text> : null}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  compact = false,
}: {
  icon?: IoniconName;
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void; variant?: PillButtonVariant };
  compact?: boolean;
}) {
  const c = useHubTheme();
  return (
    <View style={[styles.empty, { paddingVertical: compact ? Spacing['3xl'] : Spacing['5xl'] }]}>
      {icon ? <Ionicons name={icon} size={48} color={c.textSecondary + '4D'} style={{ marginBottom: Spacing.md }} /> : null}
      <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>{title}</Text>
      {body ? <Text style={[styles.emptyBody, { color: c.textSecondary }]}>{body}</Text> : null}
      {action ? (
        <PillButton
          label={action.label}
          onPress={action.onPress}
          variant={action.variant ?? 'indigo'}
          style={{ marginTop: Spacing.lg }}
        />
      ) : null}
    </View>
  );
}

/** `rounded-xl border border-success/30 bg-success-bg px-4 py-3 text-sm` — also the error twin. */
export function InlineBanner({
  tone,
  children,
  style,
}: {
  tone: 'success' | 'error' | 'warning';
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useHubTheme();
  const colour = tone === 'success' ? c.success : tone === 'error' ? c.error : c.warning;
  const bg = tone === 'success' ? c.successBg : colour + '0D';
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.banner, { backgroundColor: bg, borderColor: colour + '4D' }, style]}
    >
      <Text style={[styles.bannerText, { color: tone === 'error' ? c.error : tone === 'success' ? c.success : c.textPrimary }]}>
        {children}
      </Text>
    </View>
  );
}

/* ── Modal ──────────────────────────────────────────────────────────── */

interface HubModalProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** `max-w-sm` 384 · `max-w-md` 448 · `max-w-lg` 512. */
  maxWidth?: number;
  dismissable?: boolean;
  accessibilityLabel?: string;
}

/** `fixed inset-0 bg-black/50` overlay + `rounded-2xl bg-surface p-6 shadow-xl` card. */
export function HubModal({
  visible,
  onClose,
  children,
  maxWidth = 448,
  dismissable = true,
  accessibilityLabel,
}: HubModalProps) {
  const c = useHubTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => dismissable && onClose()}>
      <Pressable style={styles.overlay} onPress={() => dismissable && onClose()} accessibilityLabel="Close dialog">
        <Pressable
          accessibilityViewIsModal
          accessibilityLabel={accessibilityLabel}
          onPress={() => {}}
          style={[styles.modalCard, Shadows.xl, { backgroundColor: c.surface, maxWidth }]}
        >
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Hairline row divider (`divide-y divide-border`). */
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const c = useHubTheme();
  return <View style={[styles.divider, { backgroundColor: c.border }, style]} />;
}

/** Initial-letter avatar (`rounded-full bg-indigo/10 text-indigo font-bold`). */
export function InitialAvatar({ name, size = 48, tone = 'indigo' }: { name: string | null | undefined; size?: number; tone?: 'indigo' | 'shell' }) {
  const c = useHubTheme();
  const initial = (name ?? '').trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: tone === 'shell' ? c.indigo + '26' : c.indigo + '1A',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: tone === 'shell' ? 2 : 0,
        borderColor: 'rgba(255,255,255,0.1)',
      }}
    >
      <Text style={{ color: c.indigo, fontFamily: FontFamily.bodyBold, fontWeight: '700', fontSize: Math.round(size * 0.36) }}>
        {initial}
      </Text>
    </View>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing['3xl'],
  },
  gradient: {
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing['3xl'],
    overflow: 'hidden',
  },
  blobTopRight: {
    position: 'absolute',
    right: -64,
    top: -64,
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  blobBottomLeft: {
    position: 'absolute',
    left: -40,
    bottom: -40,
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  gradientBody: {
    gap: Spacing.lg,
  },
  gradientTextCol: {
    gap: 4,
  },
  gradientTitle: {
    color: '#ffffff',
    fontSize: 24,
    lineHeight: 30,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
  },
  gradientSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  whitePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#ffffff',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing['2xl'],
    height: 40,
  },
  whitePillLabel: {
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  pageTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  pageTitle: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  pageSubtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  link: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillLabel: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.full,
  },
  pillButtonLabel: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  metric: {
    flex: 1,
    minWidth: 0,
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  metricLabel: {
    flex: 1,
    fontSize: 10,
    lineHeight: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  metricValue: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
  },
  metricSub: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 14,
    fontFamily: FontFamily.body,
  },
  spinner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  spinnerLabel: {
    fontSize: 14,
    fontFamily: FontFamily.body,
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBody: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
    textAlign: 'center',
  },
  banner: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  bannerText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    borderRadius: Radius.xl,
    padding: Spacing['2xl'],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
});
