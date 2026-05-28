/**
 * AuthCard — shared layout for /login, /signup, /forgot-password. Mirrors the
 * web's auth card (`~/bldesy-web/app/login/page.tsx`):
 *   • Outer canvas background, centred
 *   • Card with rounded-2xl border + soft shadow
 *   • Top stripe: teal gradient with white Russo One BLDESY! wordmark
 *   • Body: padded form area provided by the screen
 */

import { useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
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
  /** Show a back-chevron in the top-left of the gradient stripe. */
  showBack?: boolean;
}

export function AuthCard({ children, showBack = true }: AuthCardProps) {
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
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing['3xl'] }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            animStyle,
            styles.card,
            Shadows.md,
            { backgroundColor: c.surface, borderColor: c.border },
          ]}
        >
          {/* Gradient stripe with wordmark */}
          <LinearGradient
            colors={[c.primary, c.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.stripe}
          >
            {showBack ? (
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
            <Text style={styles.wordmark}>BLDESY!</Text>
          </LinearGradient>

          {/* Body */}
          <View style={styles.body}>{children}</View>
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
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  stripe: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  backBtn: {
    position: 'absolute',
    left: Spacing.md,
    top: Spacing.sm,
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
    fontSize: 28,
    letterSpacing: -0.5,
    color: '#ffffff',
  },
  body: {
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing['3xl'],
    gap: Spacing.lg,
  },
});
