import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors, Radius, Spacing, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const LEGAL_ITEMS = [
  {
    key: 'terms',
    title: 'Terms of Service',
    subtitle: 'Your rights and responsibilities when using BLDESY!',
    icon: 'description' as const,
    url: 'https://bldesy.com.au/terms',
  },
  {
    key: 'privacy',
    title: 'Privacy Policy',
    subtitle: 'How we collect, use, and protect your personal data',
    icon: 'privacy-tip' as const,
    url: 'https://bldesy.com.au/privacy',
  },
  {
    key: 'disclaimer',
    title: 'Disclaimer',
    subtitle: 'Limitations of liability and service warranties',
    icon: 'info-outline' as const,
    url: 'https://bldesy.com.au/disclaimer',
  },
  {
    key: 'cookies',
    title: 'Cookie Policy',
    subtitle: 'How we use cookies and tracking technologies',
    icon: 'cookie' as const,
    url: 'https://bldesy.com.au/cookies',
  },
];

export default function LegalScreen() {
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Legal</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          Please read these documents carefully. By using BLDESY! you agree to our Terms of Service and Privacy Policy.
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: isDark ? colors.surface : '#ffffff', borderColor: colors.border },
          ]}
        >
          {LEGAL_ITEMS.map((item, index) => (
            <Pressable
              key={item.key}
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
              onPress={() => Linking.openURL(item.url)}
              accessibilityRole="link"
              accessibilityLabel={item.title}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: isDark ? colors.border : '#F8FAFC' },
                ]}
              >
                <MaterialIcons name={item.icon} size={18} color={colors.teal} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                  {item.subtitle}
                </Text>
              </View>
              <MaterialIcons name="open-in-new" size={16} color={colors.icon} />
            </Pressable>
          ))}
        </View>

        {/* Version / copyright */}
        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: colors.icon }]}>
            BLDESY! v1.0.0 · ABN 00 000 000 000
          </Text>
          <Text style={[styles.footerText, { color: colors.icon }]}>
            © {new Date().getFullYear()} BLDESY Pty Ltd. All rights reserved.
          </Text>
        </View>
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
    gap: Spacing.lg,
  },
  intro: {
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: -0.1,
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
    minHeight: 56,
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
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  footerRow: {
    alignItems: 'center',
    gap: 4,
    paddingTop: Spacing.sm,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
