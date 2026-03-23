import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Role = 'customer' | 'builder';

export default function SignupScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ role?: string }>();

  const [role, setRole] = useState<Role>(params.role === 'builder' ? 'builder' : 'customer');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Entrance animation
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(24);

  useEffect(() => {
    cardOpacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) });
    cardTranslateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.ease) });
  }, []);

  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  // Clear error when user types
  useEffect(() => {
    if (error) setError(null);
  }, [fullName, businessName, email, password, confirmPassword]);

  async function handleSignup() {
    if (!fullName || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (role === 'builder' && !businessName.trim()) {
      setError('Please enter your business name.');
      return;
    }

    setLoading(true);
    setError(null);

    const metadata: Record<string, string> = { full_name: fullName, role };
    if (role === 'builder') {
      metadata.business_name = businessName;
    }

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      setSuccess(true);
    }
  }

  function handleSocialStub(provider: string) {
    setError(`${provider} sign-up coming soon.`);
  }

  const gradientColors: [string, string, string] = isDark
    ? ['#042f2e', '#0f3d3a', '#134E4A']
    : ['#0d9488', '#0f766e', '#115e59'];

  const dotColor = 'rgba(255,255,255,0.07)';

  if (success) {
    return (
      <View style={[styles.container, { backgroundColor: colors.canvas }]}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + Spacing.xl, minHeight: SCREEN_HEIGHT * 0.28 }]}
        >
          <View style={styles.heroContent}>
            <Text style={styles.logo}>BLDESY!</Text>
          </View>
        </LinearGradient>
        <View style={[styles.successCard, { backgroundColor: isDark ? colors.surface : '#ffffff' }, Shadows.lg]}>
          <View style={[styles.successIconCircle, { backgroundColor: colors.successLight }]}>
            <MaterialIcons name="check-circle" size={40} color={colors.success} />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>Check your email</Text>
          <Text style={[styles.successBody, { color: colors.textSecondary }]}>
            We sent a confirmation link to{'\n'}
            <Text style={{ fontWeight: '700', color: colors.text }}>{email}</Text>
            {'\n'}Verify your email to get started.
          </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable
              style={({ pressed }) => [styles.successBtn, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
            >
              <Text style={styles.successBtnText}>Back to login</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    );
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
        {/* Gradient hero section */}
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + Spacing.xl }]}
        >
          {/* Back button */}
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, { top: insets.top + Spacing.sm }, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialIcons name="arrow-back" size={22} color="rgba(255,255,255,0.8)" />
          </Pressable>

          {/* Decorative dots */}
          <View style={styles.dotsLayer} pointerEvents="none">
            {Array.from({ length: 5 }).map((_, row) => (
              <View key={row} style={styles.dotsRow}>
                {Array.from({ length: 9 }).map((_, col) => (
                  <View
                    key={col}
                    style={[styles.dot, { backgroundColor: dotColor }]}
                  />
                ))}
              </View>
            ))}
          </View>

          {/* Subtle branded icon */}
          <View style={styles.heroIconBg} pointerEvents="none">
            <MaterialIcons name="construction" size={80} color="rgba(255,255,255,0.06)" />
          </View>

          {/* Hero text */}
          <View style={styles.heroContent}>
            <Text style={styles.logo}>BLDESY!</Text>
            <Text style={styles.tagline}>Create your account</Text>
          </View>
        </LinearGradient>

        {/* Fade transition */}
        <LinearGradient
          colors={[isDark ? '#134E4A' : '#115e59', isDark ? colors.canvas : colors.canvas]}
          style={styles.gradientFade}
        />

        {/* Card area with entrance animation */}
        <Animated.View style={[styles.cardWrapper, cardAnimStyle]}>
          {/* Role selector */}
          <View style={styles.roleSelectorWrapper}>
            <View
              style={[
                styles.roleSelector,
                {
                  backgroundColor: isDark ? colors.surface : '#ffffff',
                  borderColor: isDark ? colors.border : 'rgba(0,0,0,0.06)',
                },
                Shadows.md,
              ]}
            >
              {(['customer', 'builder'] as Role[]).map((r) => {
                const isActive = role === r;
                return (
                  <Pressable
                    key={r}
                    style={[
                      styles.roleBtn,
                      isActive && { backgroundColor: '#0F6E56' },
                      !isActive && { backgroundColor: 'transparent' },
                    ]}
                    onPress={() => setRole(r)}
                    accessibilityRole="button"
                    accessibilityLabel={r === 'customer' ? 'Customer' : 'Builder'}
                    accessibilityState={{ selected: isActive }}
                  >
                    <MaterialIcons
                      name={r === 'customer' ? 'person' : 'construction'}
                      size={18}
                      color={isActive ? '#ffffff' : colors.teal}
                    />
                    <Text
                      style={[
                        styles.roleText,
                        { color: isActive ? '#ffffff' : colors.teal },
                        isActive && styles.roleTextActive,
                      ]}
                    >
                      {r === 'customer' ? 'Customer' : 'Builder'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Form card */}
          <View
            style={[
              styles.card,
              { backgroundColor: isDark ? colors.surface : '#ffffff' },
              Shadows.lg,
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {role === 'customer' ? 'Get started' : 'Join as a builder'}
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

            {/* Form inputs */}
            <View style={styles.inputGroup}>
              {/* Full name */}
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: isDark ? colors.canvas : colors.surface,
                    borderColor: focusedField === 'name' ? colors.teal : colors.border,
                    borderWidth: focusedField === 'name' ? 1.5 : 1,
                  },
                ]}
              >
                <MaterialIcons
                  name="person"
                  size={20}
                  color={focusedField === 'name' ? colors.teal : colors.icon}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Full name"
                  placeholderTextColor={colors.icon}
                  autoCapitalize="words"
                  autoComplete="name"
                  value={fullName}
                  onChangeText={setFullName}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  accessibilityLabel="Full name"
                />
              </View>

              {/* Business name — builder only */}
              {role === 'builder' ? (
                <View>
                  <View
                    style={[
                      styles.inputRow,
                      {
                        backgroundColor: isDark ? colors.canvas : colors.surface,
                        borderColor: focusedField === 'business' ? colors.teal : colors.border,
                        borderWidth: focusedField === 'business' ? 1.5 : 1,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="business"
                      size={20}
                      color={focusedField === 'business' ? colors.teal : colors.icon}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Business name"
                      placeholderTextColor={colors.icon}
                      autoCapitalize="words"
                      value={businessName}
                      onChangeText={setBusinessName}
                      onFocus={() => setFocusedField('business')}
                      onBlur={() => setFocusedField(null)}
                      accessibilityLabel="Business name"
                    />
                  </View>
                  <Text style={[styles.builderNote, { color: colors.textSecondary }]}>
                    You'll complete your builder profile after sign-up
                  </Text>
                </View>
              ) : null}

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
                  name="email"
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
                  placeholder="Password (8+ characters)"
                  placeholderTextColor={colors.icon}
                  secureTextEntry
                  autoComplete="new-password"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  accessibilityLabel="Password, 8 or more characters"
                />
              </View>

              {/* Confirm password */}
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: isDark ? colors.canvas : colors.surface,
                    borderColor: focusedField === 'confirm' ? colors.teal : colors.border,
                    borderWidth: focusedField === 'confirm' ? 1.5 : 1,
                  },
                ]}
              >
                <MaterialIcons
                  name="lock-outline"
                  size={20}
                  color={focusedField === 'confirm' ? colors.teal : colors.icon}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Confirm password"
                  placeholderTextColor={colors.icon}
                  secureTextEntry
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocusedField('confirm')}
                  onBlur={() => setFocusedField(null)}
                  accessibilityLabel="Confirm password"
                />
              </View>
            </View>

            {/* Primary button */}
            <Pressable
              onPress={handleSignup}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Create account"
              style={({ pressed }) => [
                styles.btnWrapper,
                pressed && !loading && { opacity: 0.85, transform: [{ scale: 0.985 }] },
                loading && { opacity: 0.7 },
              ]}
            >
              <View style={styles.btn}>
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.btnText}>Creating account…</Text>
                  </View>
                ) : (
                  <Text style={styles.btnText}>Create account</Text>
                )}
              </View>
            </Pressable>

            {/* Fine print */}
            <Text style={[styles.finePrint, { color: colors.icon }]}>
              By creating an account you agree to our Terms of Service and Privacy Policy.
            </Text>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.icon }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Social login stubs */}
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
                    {
                      borderColor: colors.border,
                      backgroundColor: isDark ? colors.canvas : '#ffffff',
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Apple"
                >
                  <Ionicons name="logo-apple" size={20} color={isDark ? colors.text : '#000000'} />
                  <Text style={[styles.socialBtnText, { color: colors.text }]}>
                    Continue with Apple
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {/* Footer */}
            <View style={styles.footerInCard}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                Already have an account?{' '}
              </Text>
              <Link href="/(auth)/login" asChild>
                <Pressable
                  style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                  accessibilityRole="button"
                  accessibilityLabel="Log in"
                >
                  <Text style={[styles.footerLink, { color: colors.teal }]}>
                    Log in
                  </Text>
                </Pressable>
              </Link>
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

  // Back button
  backBtn: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    zIndex: 10,
  },

  // Hero
  hero: {
    paddingBottom: Spacing['4xl'] + 20,
    paddingHorizontal: Spacing['2xl'],
    overflow: 'hidden',
    position: 'relative',
    minHeight: SCREEN_HEIGHT * 0.26,
    justifyContent: 'flex-end',
  },
  dotsLayer: {
    ...StyleSheet.absoluteFillObject,
    gap: 18,
    paddingHorizontal: 10,
    paddingTop: 20,
    opacity: 0.9,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  heroIconBg: {
    position: 'absolute',
    top: 60,
    right: 30,
    opacity: 1,
  },
  heroContent: {
    zIndex: 1,
    gap: Spacing.sm,
  },
  logo: {
    fontSize: 36,
    fontFamily: 'RussoOne_400Regular',
    letterSpacing: -0.5,
    color: '#ffffff',
  },
  tagline: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: -0.2,
  },

  // Gradient fade
  gradientFade: {
    height: 20,
    marginTop: -20,
  },

  // Card wrapper
  cardWrapper: {
    paddingHorizontal: Spacing['2xl'],
    marginTop: -Spacing['3xl'],
    zIndex: 10,
  },

  // Role selector
  roleSelectorWrapper: {
    marginBottom: Spacing.lg,
  },
  roleSelector: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Radius.full,
    padding: 4,
    gap: 4,
  },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.full,
    gap: Spacing.xs + 2,
    minHeight: 48,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  roleTextActive: {
    fontWeight: '700',
  },

  // Card
  card: {
    borderRadius: 16,
    padding: Spacing['2xl'],
    gap: Spacing.xl,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderRadius: Radius.md,
    marginTop: -Spacing.sm,
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
    height: 52,
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
  builderNote: {
    fontSize: 12,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
    fontStyle: 'italic',
  },

  // Button
  btnWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F6E56',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  btn: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F6E56',
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

  // Fine print
  finePrint: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: -Spacing.sm,
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

  // Social login
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

  // Footer inside card
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

  // Success state
  successCard: {
    marginHorizontal: Spacing['2xl'],
    marginTop: -30,
    borderRadius: 16,
    padding: Spacing['3xl'],
    alignItems: 'center',
    gap: Spacing.lg,
    zIndex: 10,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  successBody: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  successBtn: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F6E56',
    alignSelf: 'stretch',
    marginTop: Spacing.sm,
  },
  successBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
