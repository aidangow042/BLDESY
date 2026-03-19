import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function PendingApprovalScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.warningLight,
              borderColor: colors.warning + '30',
            },
            Shadows.sm,
          ]}
        >
          <ThemedText style={styles.icon}>&#9203;</ThemedText>

          <ThemedText type="title" style={styles.title}>
            Application Submitted
          </ThemedText>

          <ThemedText style={[styles.body, { color: colors.textSecondary }]}>
            Thanks for signing up as a builder! We're reviewing your application and will approve you shortly.
          </ThemedText>

          <ThemedText style={[styles.body, { color: colors.textSecondary }]}>
            Once approved, you'll get full access to the Builder Portal — browse jobs, apply, and manage your profile.
          </ThemedText>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.tint },
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => router.replace('/(tabs)')}
        >
          <ThemedText style={styles.buttonText}>Back to Home</ThemedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
    gap: Spacing['3xl'],
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing['3xl'],
    alignItems: 'center',
    gap: Spacing.lg,
    width: '100%',
  },
  icon: {
    fontSize: 48,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    height: 52,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing['4xl'],
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
