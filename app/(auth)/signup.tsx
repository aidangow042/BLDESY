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
  ScrollView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

  const [role, setRole] = useState<Role>('customer');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Sign up failed', error.message);
    } else {
      Alert.alert(
        'Check your email',
        'We sent you a confirmation link. Verify your email to continue.',
      );
    }
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

          {/* Hero text */}
          <View style={styles.heroContent}>
            <Text style={styles.logo}>BLDESY!</Text>
            <Text style={styles.heroHeading}>Create your account</Text>
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
            {/* Role segmented control */}
            <View style={styles.segmentedWrapper}>
              <View
                style={[
                  styles.segmented,
                  {
                    backgroundColor: isDark ? colors.canvas : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                {(['customer', 'builder'] as Role[]).map((r) => {
                  const isActive = role === r;
                  return (
                    <Pressable
                      key={r}
                      style={({ pressed }) => [
                        styles.segmentBtn,
                        isActive && styles.segmentBtnActive,
                        pressed && !isActive && { opacity: 0.7 },
                      ]}
                      onPress={() => setRole(r)}
                      accessibilityRole="button"
                      accessibilityLabel={r === 'customer' ? 'I need a tradie' : 'I am a tradie'}
                      accessibilityState={{ selected: isActive }}
                    >
                      {isActive ? (
                        <LinearGradient
                          colors={['#0d9488', '#0f766e']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                        />
                      ) : null}
                      <MaterialIcons
                        name={r === 'customer' ? 'person' : 'construction'}
                        size={16}
                        color={isActive ? '#ffffff' : colors.icon}
                        style={styles.segmentIcon}
                      />
                      <Text
                        style={[
                          styles.segmentText,
                          { color: isActive ? '#ffffff' : colors.textSecondary },
                          isActive && styles.segmentTextActive,
                        ]}
                      >
                        {r === 'customer' ? 'I need a tradie' : 'I am a tradie'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Form inputs */}
            <View style={styles.inputGroup}>
              {/* Full name */}
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
                  name="person"
                  size={20}
                  color={colors.icon}
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
                  accessibilityLabel="Full name"
                />
              </View>

              {/* Email */}
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

              {/* Password */}
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
                  placeholder="Password (8+ characters)"
                  placeholderTextColor={colors.icon}
                  secureTextEntry
                  autoComplete="new-password"
                  value={password}
                  onChangeText={setPassword}
                  accessibilityLabel="Password, 8 or more characters"
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
                  <Text style={styles.btnText}>Create account</Text>
                )}
              </LinearGradient>
            </Pressable>

            {/* Fine print */}
            <Text style={[styles.finePrint, { color: colors.icon }]}>
              By creating an account you agree to our Terms of Service and Privacy Policy.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}>
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
    minHeight: SCREEN_HEIGHT * 0.28,
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
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: '#ffffff',
  },
  heroHeading: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: -0.2,
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

  // Segmented control
  segmentedWrapper: {
    gap: Spacing.sm,
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.xs,
    minHeight: 44,
    overflow: 'hidden',
    position: 'relative',
  },
  segmentBtnActive: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  segmentIcon: {
    zIndex: 1,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    zIndex: 1,
  },
  segmentTextActive: {
    fontWeight: '700',
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

  // Fine print
  finePrint: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: -Spacing.sm,
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
