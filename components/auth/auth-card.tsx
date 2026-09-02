/**
 * AuthCard — shared layout for /login, /signup, /forgot-password. Mirrors the
 * website's auth card (`~/bldesy-web/app/login/page.tsx`):
 *   • Canvas background, card centred, `max-w-[450px]`
 *   • Teal gradient header (`from-primary to-primary-dark`, px-6 py-6) with the
 *     white Russo One `BLDESY!` wordmark (`font-display text-3xl tracking-tight`)
 *   • White card body below (px-6 py-8) holding the h1, optional lead and form
 */

import { useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface AuthCardProps {
  /** Body of the card (form fields, primary button, links). */
  children: React.ReactNode;
  /** The page h1 (web: `text-2xl font-bold text-center`). */
  title?: string;
  /** Lead paragraph under the h1 (web: `text-sm text-text-secondary text-center`). */
  subtitle?: string;
  /** Show a back-chevron in the top-left of the gradient header. */
  showBack?: boolean;
}

export function AuthCard({ children, title, subtitle, showBack = true }: AuthCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    translateY.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [opacity, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: c.canvas }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing['3xl'] },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[animStyle, styles.card, Shadows.md, { backgroundColor: c.surface, borderColor: c.border }]}
        >
          {/* Teal gradient header with the wordmark */}
          <LinearGradient
            colors={[c.gradientHeaderFrom, c.gradientHeaderTo]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            {showBack && router.canGoBack() ? (
              <Pressable
                onPress={() => router.back()}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.backChevron}>‹</Text>
              </Pressable>
            ) : null}
            <Text style={styles.wordmark} accessibilityRole="header">
              BLDESY!
            </Text>
          </LinearGradient>

          {/* White card body */}
          <View style={styles.body}>
            {title ? (
              <View style={styles.heading}>
                <Text accessibilityRole="header" style={[styles.title, { color: c.textPrimary }]}>
                  {title}
                </Text>
                {subtitle ? (
                  <Text style={[styles.subtitle, { color: c.textSecondary }]}>{subtitle}</Text>
                ) : null}
              </View>
            ) : null}
            {children}
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 450,
    alignSelf: 'center',
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing['2xl'],
  },
  backBtn: {
    position: 'absolute',
    left: Spacing.md,
    top: Spacing.lg,
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChevron: {
    fontSize: 28,
    lineHeight: 28,
    color: 'rgba(255,255,255,0.9)',
  },
  wordmark: {
    fontFamily: FontFamily.display,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.75,
    color: '#ffffff',
  },
  body: {
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing['3xl'],
    gap: Spacing.lg,
  },
  heading: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
    textAlign: 'center',
  },
});
