import {
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type PageHeaderProps = {
  title: string;
  subtitle: string;
  /** Rendered in the top-right area (icon, avatar, etc.) */
  rightElement?: React.ReactNode;
  /** 'warm' = amber-tinted (Saved), 'professional' = cool teal (Dashboard), 'default' = neutral teal */
  variant?: 'default' | 'warm' | 'professional';
  /** Faint watermark text in the background (e.g. an emoji) */
  watermark?: string;
};

const GRADIENT_CONFIGS: Record<string, { light: [string, string, string]; dark: [string, string, string] }> = {
  default: {
    light: ['#ccfbf1', '#e0f7f3', '#f0fdfa'],
    dark: ['#0f2a2a', '#134E4A', '#0f172a'],
  },
  warm: {
    light: ['#0f766e', '#0d9488', '#14b8a6'],
    dark: ['#042f2e', '#0f3d3a', '#134E4A'],
  },
  professional: {
    light: ['#0d9488', '#0f766e', '#115e59'],
    dark: ['#042f2e', '#0f3d3a', '#134E4A'],
  },
};

export function PageHeader({
  title,
  subtitle,
  rightElement,
  variant = 'default',
  watermark,
}: PageHeaderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const teal = colors.teal;
  const insets = useSafeAreaInsets();

  const gradientColors = GRADIENT_CONFIGS[variant][isDark ? 'dark' : 'light'];

  // Rich variants use white text; default uses theme colors
  const isRich = variant === 'warm' || variant === 'professional';
  const titleColor = isRich ? '#ffffff' : colors.text;
  const subtitleColor = isRich ? 'rgba(255,255,255,0.8)' : colors.textSecondary;
  const dotColor = isRich
    ? 'rgba(255,255,255,0.08)'
    : isDark
      ? 'rgba(45,212,191,0.06)'
      : 'rgba(13,148,136,0.06)';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { paddingTop: insets.top + Spacing.lg }]}
      >
        {/* Decorative dots pattern */}
        <View style={styles.patternLayer} pointerEvents="none">
          {Array.from({ length: 6 }).map((_, row) => (
            <View key={row} style={styles.patternRow}>
              {Array.from({ length: 8 }).map((_, col) => (
                <View
                  key={col}
                  style={[
                    styles.patternDot,
                    { backgroundColor: dotColor },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>

        {/* Watermark */}
        {watermark && (
          <Text style={[styles.watermark, { opacity: isRich ? 0.07 : (isDark ? 0.03 : 0.04) }]}>
            {watermark}
          </Text>
        )}

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.textColumn}>
            <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: subtitleColor }]}>
              {subtitle}
            </Text>
          </View>

          {rightElement && (
            <View style={styles.rightSlot}>{rightElement}</View>
          )}
        </View>
      </LinearGradient>

      {/* Bottom accent line */}
      <LinearGradient
        colors={
          isRich
            ? ['rgba(13,148,136,0.3)', 'rgba(13,148,136,0.08)', 'transparent']
            : isDark
              ? ['rgba(45,212,191,0.25)', 'rgba(45,212,191,0.05)', 'transparent']
              : ['rgba(13,148,136,0.15)', 'rgba(13,148,136,0.05)', 'transparent']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentLine}
      />
    </View>
  );
}

/** Pre-styled circular icon wrapper for use in rightElement */
export function HeaderIcon({
  children,
  size = 48,
  onRichBackground = false,
}: {
  children: React.ReactNode;
  size?: number;
  /** Set true when used on a rich teal gradient background */
  onRichBackground?: boolean;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View
      style={[
        styles.iconCircle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: onRichBackground
            ? 'rgba(255,255,255,0.18)'
            : isDark ? 'rgba(45,212,191,0.12)' : 'rgba(13,148,136,0.08)',
          borderColor: onRichBackground
            ? 'rgba(255,255,255,0.25)'
            : isDark ? 'rgba(45,212,191,0.2)' : 'rgba(13,148,136,0.12)',
        },
      ]}
    >
      {children}
    </View>
  );
}

/** Pre-styled avatar with ring for use in rightElement */
export function HeaderAvatar({
  uri,
  fallback,
  size = 52,
}: {
  uri?: string | null;
  fallback?: React.ReactNode;
  size?: number;
}) {
  const ringSize = size + 8;

  return (
    <View
      style={[
        styles.avatarRing,
        {
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          borderColor: 'rgba(255,255,255,0.5)',
          backgroundColor: 'rgba(255,255,255,0.12)',
        },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
        />
      ) : (
        <View
          style={[
            styles.avatarFallback,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: 'rgba(255,255,255,0.15)',
            },
          ]}
        >
          {fallback}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  gradient: {
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  patternLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: 10,
    opacity: 0.7,
  },
  patternRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  patternDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  watermark: {
    position: 'absolute',
    right: -10,
    top: -8,
    fontSize: 120,
    lineHeight: 130,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
    zIndex: 1,
  },
  textColumn: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.1,
    lineHeight: 20,
  },
  rightSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentLine: {
    height: 3,
  },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(13,148,136,0.3)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  avatarRing: {
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(13,148,136,0.4)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
