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
} from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';

type Role = 'customer' | 'builder';

export default function SignupScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

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

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={[styles.logo, { color: colors.tint }]}>BLDESY!</Text>
          <Text style={[styles.heading, { color: colors.text }]}>Create account</Text>
        </View>

        {/* Role toggle */}
        <View
          style={[
            styles.roleContainer,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {(['customer', 'builder'] as Role[]).map((r) => (
            <Pressable
              key={r}
              style={({ pressed }) => [
                styles.roleBtn,
                role === r && {
                  backgroundColor: colors.tintLight,
                  borderRadius: Radius.sm,
                },
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => setRole(r)}
            >
              <Text
                style={[
                  styles.roleBtnText,
                  { color: role === r ? colors.tint : colors.textSecondary },
                  role === r && { fontWeight: '600' },
                ]}
              >
                {r === 'customer' ? 'I need a tradie' : 'I am a tradie'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.form}>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            placeholder="Full name"
            placeholderTextColor={colors.icon}
            autoCapitalize="words"
            value={fullName}
            onChangeText={setFullName}
          />
          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            placeholder="Email"
            placeholderTextColor={colors.icon}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            placeholder="Password (8+ characters)"
            placeholderTextColor={colors.icon}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.tint },
              Shadows.md,
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create account</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Already have an account?{' '}
          </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
              <Text style={[styles.link, { color: colors.tint }]}>Log in</Text>
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
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing['5xl'],
  },
  header: {
    marginBottom: Spacing['3xl'],
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: Spacing.sm,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
  },
  roleContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.xs,
    marginBottom: Spacing['2xl'],
    gap: Spacing.xs,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  roleBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  form: {
    gap: Spacing.lg,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    fontSize: 15,
  },
  button: {
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing['3xl'],
  },
  footerText: {
    fontSize: 15,
  },
});
