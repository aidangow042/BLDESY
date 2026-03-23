import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, Radius } from '@/constants/theme';

type Role = 'customer' | 'builder';

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();

  const [role, setRole] = useState<Role>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [toggleWidth, setToggleWidth] = useState(0);

  // Entrance animation
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(16);

  useEffect(() => {
    cardOpacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.ease) });
    cardTranslateY.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.ease) });
  }, []);

  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  // Role toggle animation
  const toggleX = useSharedValue(0);

  useEffect(() => {
    toggleX.value = withTiming(role === 'customer' ? 0 : 1, {
      duration: 200,
      easing: Easing.out(Easing.ease),
    });
  }, [role]);

  const indicatorStyle = useAnimatedStyle(() => {
    const halfWidth = (toggleWidth - 6) / 2; // container padding = 3 each side
    return {
      transform: [
        {
          translateX: interpolate(toggleX.value, [0, 1], [0, halfWidth]),
        },
      ],
    };
  });

  const onToggleLayout = useCallback((e: any) => {
    setToggleWidth(e.nativeEvent.layout.width);
  }, []);

  // Clear error when user types
  useEffect(() => {
    if (error) setError(null);
  }, [email, password]);

  async function handleLogin() {
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError(authError.message);
    }
    // On success, root layout listener will redirect automatically
  }

  function handleSocialStub(provider: string) {
    setError(`${provider} sign-in coming soon.`);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.canvas }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Compact dark header */}
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 16,
              backgroundColor: isDark ? '#042f2e' : '#0F4F3E',
            },
          ]}
        >
          <Text style={styles.headerLogo}>BLDESY!</Text>
          <Text style={styles.headerTagline}>Find trusted tradies, fast.</Text>
        </View>

        {/* Content area with entrance animation */}
        <Animated.View style={[styles.contentArea, cardAnimStyle]}>
          {/* Browse as guest */}
          <Pressable
            onPress={() => router.replace('/(tabs)' as any)}
            style={({ pressed }) => [
              styles.guestButton,
              {
                backgroundColor: isDark ? colors.surface : '#ffffff',
                borderColor: colors.teal,
              },
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Browse without an account"
          >
            <Text style={[styles.guestButtonText, { color: colors.teal }]}>
              Browse without an account
            </Text>
            <MaterialIcons name="arrow-forward" size={18} color={colors.teal} />
          </Pressable>

          {/* Role toggle */}
          <View style={styles.toggleWrapper}>
            <View
              style={[
                styles.toggleContainer,
                { backgroundColor: isDark ? '#0f2a2a' : '#E1F5EE' },
              ]}
              onLayout={onToggleLayout}
            >
              {/* Animated indicator */}
              {toggleWidth > 0 && (
                <Animated.View
                  style={[
                    styles.toggleIndicator,
                    {
                      width: (toggleWidth - 6) / 2,
                      backgroundColor: isDark ? colors.teal : '#0F4F3E',
                    },
                    indicatorStyle,
                  ]}
                />
              )}

              {/* Customer button */}
              <Pressable
                style={styles.toggleBtn}
                onPress={() => setRole('customer')}
                accessibilityRole="button"
                accessibilityLabel="Customer"
                accessibilityState={{ selected: role === 'customer' }}
              >
                <MaterialIcons
                  name="person"
                  size={16}
                  color={
                    role === 'customer'
                      ? isDark ? '#0f172a' : '#ffffff'
                      : isDark ? colors.teal : '#0F4F3E'
                  }
                />
                <Text
                  style={[
                    styles.toggleText,
                    {
                      color:
                        role === 'customer'
                          ? isDark ? '#0f172a' : '#ffffff'
                          : isDark ? colors.teal : '#0F4F3E',
                      fontWeight: role === 'customer' ? '700' : '600',
                    },
                  ]}
                >
                  Customer
                </Text>
              </Pressable>

              {/* Builder button */}
              <Pressable
                style={styles.toggleBtn}
                onPress={() => setRole('builder')}
                accessibilityRole="button"
                accessibilityLabel="Builder"
                accessibilityState={{ selected: role === 'builder' }}
              >
                <MaterialIcons
                  name="construction"
                  size={16}
                  color={
                    role === 'builder'
                      ? isDark ? '#0f172a' : '#ffffff'
                      : isDark ? colors.teal : '#0F4F3E'
                  }
                />
                <Text
                  style={[
                    styles.toggleText,
                    {
                      color:
                        role === 'builder'
                          ? isDark ? '#0f172a' : '#ffffff'
                          : isDark ? colors.teal : '#0F4F3E',
                      fontWeight: role === 'builder' ? '700' : '600',
                    },
                  ]}
                >
                  Builder
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Login card */}
          <View
            style={[
              styles.card,
              { backgroundColor: isDark ? colors.surface : '#ffffff' },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {role === 'customer' ? 'Welcome back' : 'Builder login'}
            </Text>

            {/* Error banner */}
            {error ? (
              <Pressable
                onPress={() => setError(null)}
                style={[
                  styles.errorBanner,
                  {
                    backgroundColor: colors.errorLight,
                    borderColor: colors.error,
                  },
                ]}
              >
                <MaterialIcons name="error-outline" size={18} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]} numberOfLines={2}>
                  {error}
                </Text>
                <MaterialIcons name="close" size={16} color={colors.error} style={{ opacity: 0.6 }} />
              </Pressable>
            ) : null}

            {/* Input fields */}
            <View style={styles.inputGroup}>
              {/* Email */}
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: isDark ? colors.canvas : colors.surface,
                    borderColor: focusedField === 'email' ? colors.teal : colors.border,
                    borderWidth: focusedField === 'email' ? 1.5 : 1,
                  },
                ]}
              >
                <MaterialIcons
                  name="mail"
                  size={20}
                  color={focusedField === 'email' ? colors.teal : colors.icon}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Email address"
                  placeholderTextColor={colors.icon}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  accessibilityLabel="Email address"
                />
              </View>

              {/* Password */}
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: isDark ? colors.canvas : colors.surface,
                    borderColor: focusedField === 'password' ? colors.teal : colors.border,
                    borderWidth: focusedField === 'password' ? 1.5 : 1,
                  },
                ]}
              >
                <MaterialIcons
                  name="lock"
                  size={20}
                  color={focusedField === 'password' ? colors.teal : colors.icon}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Password"
                  placeholderTextColor={colors.icon}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  accessibilityLabel="Password"
                />
                <Pressable
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.icon}
                  />
                </Pressable>
              </View>
            </View>

            {/* Log in button */}
            <Pressable
              onPress={handleLogin}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Log in"
              style={({ pressed }) => [
                styles.btn,
                pressed && !loading && { opacity: 0.85, transform: [{ scale: 0.985 }] },
                loading && { opacity: 0.7 },
              ]}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.btnText}>Logging in…</Text>
                </View>
              ) : (
                <Text style={styles.btnText}>Log in</Text>
              )}
            </Pressable>

            {/* Forgot password */}
            <Link href="/(auth)/forgot-password" asChild>
              <Pressable
                style={({ pressed }) => [
                  styles.forgotBtn,
                  pressed && { opacity: 0.6 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Forgot password"
              >
                <Text style={[styles.forgotText, { color: colors.teal }]}>
                  Forgot password?
                </Text>
              </Pressable>
            </Link>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.icon }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Social login */}
            <View style={styles.socialGroup}>
              <Pressable
                onPress={() => handleSocialStub('Google')}
                style={({ pressed }) => [
                  styles.socialBtn,
                  {
                    borderColor: colors.border,
                    backgroundColor: isDark ? colors.canvas : '#ffffff',
                  },
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
              >
                <Ionicons name="logo-google" size={20} color={isDark ? colors.text : '#4285F4'} />
                <Text style={[styles.socialBtnText, { color: colors.text }]}>
                  Continue with Google
                </Text>
              </Pressable>

              {Platform.OS === 'ios' ? (
                <Pressable
                  onPress={() => handleSocialStub('Apple')}
                  style={({ pressed }) => [
                    styles.socialBtn,
                    styles.appleSocialBtn,
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Apple"
                >
                  <Ionicons name="logo-apple" size={20} color="#ffffff" />
                  <Text style={[styles.socialBtnText, styles.appleSocialBtnText]}>
                    Continue with Apple
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {/* Sign up link */}
            <View style={styles.footerInCard}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                Don't have an account?{' '}
              </Text>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/(auth)/signup' as any,
                    params: { role },
                  })
                }
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                accessibilityRole="button"
                accessibilityLabel="Sign up"
              >
                <Text style={[styles.footerLink, { color: colors.teal }]}>
                  Sign up
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* Bottom spacer */}
        <View style={{ height: insets.bottom + Spacing['3xl'] }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Compact header
  header: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  headerLogo: {
    fontSize: 32,
    fontFamily: 'RussoOne_400Regular',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  headerTagline: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 6,
  },

  // Content area
  contentArea: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: 24,
  },

  // Guest button
  guestButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  guestButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Role toggle
  toggleWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  toggleContainer: {
    width: '70%',
    height: 40,
    borderRadius: 20,
    flexDirection: 'row',
    padding: 3,
    position: 'relative',
  },
  toggleIndicator: {
    position: 'absolute',
    top: 3,
    left: 3,
    height: 34,
    borderRadius: 17,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 1,
  },
  toggleText: {
    fontSize: 13,
  },

  // Card
  card: {
    borderRadius: 16,
    padding: Spacing['2xl'],
    gap: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    textAlign: 'center',
  },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },

  // Inputs
  inputGroup: {
    gap: Spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  inputIcon: {
    width: 20,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },

  // Button
  btn: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F4F3E',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  // Forgot
  forgotBtn: {
    alignSelf: 'center',
    paddingVertical: Spacing.xs,
    minHeight: 36,
    justifyContent: 'center',
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Social
  socialGroup: {
    gap: Spacing.md,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    gap: Spacing.md,
  },
  socialBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  appleSocialBtn: {
    backgroundColor: '#000000',
    borderWidth: 0,
  },
  appleSocialBtnText: {
    color: '#ffffff',
  },

  // Footer
  footerInCard: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.xs,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
