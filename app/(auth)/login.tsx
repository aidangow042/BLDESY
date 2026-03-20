import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert('Login failed', error.message);
    }
    // On success, root layout listener will redirect automatically
  }

  const gradientColors: [string, string, string] = isDark
    ? ['#042f2e', '#0f3d3a', '#134E4A']
    : ['#0d9488', '#0f766e', '#115e59'];

  const dotColor = 'rgba(255,255,255,0.07)';

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
          {/* Decorative dots */}
          <View style={styles.dotsLayer} pointerEvents="none">
            {Array.from({ length: 6 }).map((_, row) => (
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

          {/* Hero text */}
          <View style={styles.heroContent}>
            <Text style={styles.logo}>BLDESY!</Text>
            <Text style={styles.tagline}>Find trusted tradies, fast.</Text>
            <Text style={styles.socialProof}>
              Connecting Australians with quality tradies
            </Text>
          </View>
        </LinearGradient>

        {/* Form card — overlaps gradient */}
        <View style={styles.cardWrapper}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? colors.surface : '#ffffff',
              },
              Shadows.lg,
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Welcome back
            </Text>

            {/* Email input */}
            <View style={styles.inputGroup}>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: isDark ? colors.canvas : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <MaterialIcons
                  name="email"
                  size={20}
                  color={colors.icon}
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
                  accessibilityLabel="Email address"
                />
              </View>

              {/* Password input */}
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: isDark ? colors.canvas : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <MaterialIcons
                  name="lock"
                  size={20}
                  color={colors.icon}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Password"
                  placeholderTextColor={colors.icon}
                  secureTextEntry
                  autoComplete="password"
                  value={password}
                  onChangeText={setPassword}
                  accessibilityLabel="Password"
                />
              </View>
            </View>

            {/* Primary button */}
            <Pressable
              onPress={handleLogin}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Log in"
              style={({ pressed }) => [
                styles.btnWrapper,
                pressed && { opacity: 0.85 },
              ]}
            >
              <LinearGradient
                colors={['#0d9488', '#0f766e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btn}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Log in</Text>
                )}
              </LinearGradient>
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
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Don't have an account?{' '}
          </Text>
          <Link href="/(auth)/signup" asChild>
            <Pressable
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel="Sign up"
            >
              <Text style={[styles.footerLink, { color: colors.teal }]}>
                Sign up
              </Text>
            </Pressable>
          </Link>
        </View>
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

  // Hero
  hero: {
    paddingBottom: Spacing['4xl'] + 30,
    paddingHorizontal: Spacing['2xl'],
    overflow: 'hidden',
    position: 'relative',
    minHeight: SCREEN_HEIGHT * 0.38,
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
  heroContent: {
    zIndex: 1,
    gap: Spacing.sm,
  },
  logo: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
    color: '#ffffff',
  },
  tagline: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: -0.2,
  },
  socialProof: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.1,
  },

  // Card
  cardWrapper: {
    paddingHorizontal: Spacing['2xl'],
    marginTop: -30,
    zIndex: 10,
  },
  card: {
    borderRadius: Radius.xl,
    padding: Spacing['2xl'],
    gap: Spacing.xl,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },

  // Inputs
  inputGroup: {
    gap: Spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderRadius: Radius.md,
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
  btnWrapper: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0d9488',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  btn: {
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Forgot
  forgotBtn: {
    alignSelf: 'center',
    paddingVertical: Spacing.xs,
    minHeight: 44,
    justifyContent: 'center',
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing['2xl'],
    paddingHorizontal: Spacing['2xl'],
  },
  footerText: {
    fontSize: 15,
  },
  footerLink: {
    fontSize: 15,
    fontWeight: '700',
  },
});
