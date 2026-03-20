import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors, Radius, Spacing, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type SettingsRow = {
  key: string;
  label: string;
  subtitle?: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
};

const SETTINGS_SECTIONS: { title: string; rows: SettingsRow[] }[] = [
  {
    title: 'Account',
    rows: [
      { key: 'profile', label: 'Edit Profile', subtitle: 'Name, phone, avatar', icon: 'person-outline' },
      { key: 'email', label: 'Email Address', subtitle: 'Change your login email', icon: 'email' },
      { key: 'password', label: 'Change Password', icon: 'lock-outline' },
    ],
  },
  {
    title: 'Preferences',
    rows: [
      { key: 'notifications', label: 'Notifications', subtitle: 'Push, email, SMS', icon: 'notifications-none' },
      { key: 'language', label: 'Language', subtitle: 'English (AU)', icon: 'language' },
    ],
  },
  {
    title: 'Privacy',
    rows: [
      { key: 'privacy', label: 'Privacy Settings', subtitle: 'Data, visibility', icon: 'shield-outlined' as any },
      { key: 'delete', label: 'Delete Account', subtitle: 'Permanently remove your data', icon: 'delete-outline' },
    ],
  },
];

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.canvas }]}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {SETTINGS_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {section.title}
            </Text>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? colors.surface : '#ffffff',
                  borderColor: colors.border,
                },
              ]}
            >
              {section.rows.map((row, index) => (
                <Pressable
                  key={row.key}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      borderTopWidth: index > 0 ? 1 : 0,
                      borderTopColor: colors.borderLight,
                      backgroundColor: pressed
                        ? isDark
                          ? 'rgba(255,255,255,0.04)'
                          : 'rgba(0,0,0,0.02)'
                        : 'transparent',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={row.label}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: isDark ? colors.border : '#F8FAFC' },
                    ]}
                  >
                    <MaterialIcons name={row.icon} size={18} color={colors.teal} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={[styles.rowLabel, { color: colors.text }]}>{row.label}</Text>
                    {row.subtitle ? (
                      <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                        {row.subtitle}
                      </Text>
                    ) : null}
                  </View>
                  <MaterialIcons name="chevron-right" size={18} color={colors.icon} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['5xl'],
    gap: Spacing.xl,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.sm,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    minHeight: 52,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12,
  },
});
