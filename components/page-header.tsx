import {
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type PageHeaderProps = {
  title: string;
  subtitle: string;
  /** Rendered in the top-right area (icon, avatar, etc.) */
  rightElement?: React.ReactNode;
  /** 'warm' = amber-tinted (Saved), 'professional' = cool teal (Dashboard), 'default' = neutral teal */
  variant?: 'default' | 'warm' | 'professional';
  /** Faint watermark text in the background (e.g. an emoji) — ignored in compact mode */
  watermark?: string;
};

const GRADIENT_CONFIGS: Record<string, { light: [string, string]; dark: [string, string] }> = {
  default: {
    light: ['#0D7C66', '#0A6B58'],
    dark: ['#134E4A', '#0D3B3B'],
  },
  warm: {
    light: ['#0D7C66', '#0A6B58'],
    dark: ['#134E4A', '#0D3B3B'],
  },
  professional: {
    light: ['#0D7C66', '#0A6B58'],
    dark: ['#134E4A', '#0D3B3B'],
  },
};

export function PageHeader({
  title,
  subtitle,
  rightElement,
  variant = 'default',
}: PageHeaderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const gradientColors = GRADIENT_CONFIGS[variant][isDark ? 'dark' : 'light'];

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 6 }]}
    >
      <View style={styles.content}>
        {rightElement ? (
          <>
            <View style={styles.textLeft}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <View style={styles.rightSlot}>{rightElement}</View>
          </>
        ) : (
          <View style={styles.textCenter}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

/** Pre-styled circular icon wrapper for use in rightElement */
export function HeaderIcon({
  children,
  size = 40,
  onRichBackground = true,
}: {
  children: React.ReactNode;
  size?: number;
  /** Set true when used on a rich teal gradient background */
  onRichBackground?: boolean;
}) {
  return (
    <View
      style={[
        styles.iconCircle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: 'rgba(255,255,255,0.15)',
          borderColor: 'rgba(255,255,255,0.25)',
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
  size = 36,
}: {
  uri?: string | null;
  fallback?: React.ReactNode;
  size?: number;
}) {
  const { Image } = require('react-native');
  const ringSize = size + 6;

  return (
    <View
      style={[
        styles.avatarRing,
        {
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          borderColor: 'rgba(255,255,255,0.4)',
          backgroundColor: 'rgba(255,255,255,0.1)',
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
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: 'rgba(255,255,255,0.15)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {fallback}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  textCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  textLeft: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...Type.h3,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  subtitle: {
    ...Type.caption,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  rightSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarRing: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
