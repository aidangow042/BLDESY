import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';

import { Colors, Radius, Spacing, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email ?? null);
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
          setFullName(profile?.full_name ?? null);
        }
      })();
    }, []),
  );

  const handleChangeEmail = () => {
    Alert.prompt(
      'Change Email',
      'Enter your new email address. We\'ll send a confirmation link.',
      async (newEmail) => {
        if (!newEmail?.trim()) return;
        const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
        if (error) {
          Alert.alert('Error', error.message);
        } else {
          Alert.alert('Check Your Email', 'We\'ve sent a confirmation link to your new email address.');
        }
      },
      'plain-text',
      userEmail ?? '',
    );
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Reset Password',
      'We\'ll send a password reset link to your email address.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Link',
          onPress: async () => {
            if (!userEmail) return;
            const { error } = await supabase.auth.resetPasswordForEmail(userEmail);
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              Alert.alert('Email Sent', 'Check your inbox for the password reset link.');
            }
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data, saved builders, and job postings will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'Type your email to confirm: ' + (userEmail ?? ''),
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete',
                  style: 'destructive',
                  onPress: async () => {
                    await supabase.auth.signOut();
                    router.replace('/');
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  type SectionConfig = {
    title: string;
    rows: {
      key: string;
      label: string;
      subtitle?: string;
      icon: React.ComponentProps<typeof MaterialIcons>['name'];
      onPress?: () => void;
      rightElement?: React.ReactNode;
      destructive?: boolean;
    }[];
  };

  const sections: SectionConfig[] = [
    {
      title: 'Account',
      rows: [
        {
          key: 'profile',
          label: fullName || 'Edit Profile',
          subtitle: 'Name, phone, avatar',
          icon: 'person-outline',
          onPress: () => router.push('/builder-edit-profile'),
        },
        {
          key: 'email',
          label: 'Email Address',
          subtitle: userEmail ?? 'Not signed in',
          icon: 'email',
          onPress: handleChangeEmail,
        },
        {
          key: 'password',
          label: 'Change Password',
          subtitle: 'Reset via email link',
          icon: 'lock-outline',
          onPress: handleChangePassword,
        },
      ],
    },
    {
      title: 'Notifications',
      rows: [
        {
          key: 'push',
          label: 'Push Notifications',
          subtitle: 'Job updates and messages',
          icon: 'notifications-none',
          rightElement: (
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              trackColor={{ false: colors.border, true: colors.teal + '60' }}
              thumbColor={pushNotifications ? colors.teal : colors.icon}
            />
          ),
        },
        {
          key: 'emailNotif',
          label: 'Email Notifications',
          subtitle: 'Weekly digest and alerts',
          icon: 'mark-email-unread',
          rightElement: (
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              trackColor={{ false: colors.border, true: colors.teal + '60' }}
              thumbColor={emailNotifications ? colors.teal : colors.icon}
            />
          ),
        },
        {
          key: 'sms',
          label: 'SMS Notifications',
          subtitle: 'Urgent job alerts only',
          icon: 'sms',
          rightElement: (
            <Switch
              value={smsNotifications}
              onValueChange={setSmsNotifications}
              trackColor={{ false: colors.border, true: colors.teal + '60' }}
              thumbColor={smsNotifications ? colors.teal : colors.icon}
            />
          ),
        },
      ],
    },
    {
      title: 'Preferences',
      rows: [
        {
          key: 'language',
          label: 'Language',
          subtitle: 'English (AU)',
          icon: 'language',
          onPress: () =>
            Alert.alert('Language', 'English (AU) is currently the only supported language.'),
        },
        {
          key: 'appearance',
          label: 'Appearance',
          subtitle: isDark ? 'Dark mode (system)' : 'Light mode (system)',
          icon: isDark ? 'dark-mode' : 'light-mode',
          onPress: () =>
            Alert.alert(
              'Appearance',
              'BLDESY! follows your system appearance setting. Change it in your device Settings → Display & Brightness.',
            ),
        },
      ],
    },
    {
      title: 'Privacy & Data',
      rows: [
        {
          key: 'privacy',
          label: 'Privacy Settings',
          subtitle: 'Profile visibility and data sharing',
          icon: 'shield',
          onPress: () =>
            Alert.alert(
              'Privacy',
              'Your profile is only visible to other BLDESY! users. We never sell your data to third parties.',
            ),
        },
        {
          key: 'download',
          label: 'Download My Data',
          subtitle: 'Request a copy of your data',
          icon: 'download',
          onPress: () =>
            Alert.alert(
              'Data Export',
              'A data export request has been sent. You\'ll receive an email within 48 hours with a download link.',
            ),
        },
        {
          key: 'delete',
          label: 'Delete Account',
          subtitle: 'Permanently remove all data',
          icon: 'delete-outline',
          onPress: handleDeleteAccount,
          destructive: true,
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <View style={headerStyles.container}>
        <LinearGradient
          colors={isDark ? ['#042f2e', '#0a3a38', '#134E4A'] : ['#064E3B', '#0F6E56', '#1D9E75']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[headerStyles.gradient, { paddingTop: insets.top + Spacing.lg }]}
        >
          <View style={headerStyles.glowWrap} pointerEvents="none">
            <View style={[headerStyles.glow, isDark && { opacity: 0.06 }]} />
          </View>
          <View style={headerStyles.accentLines} pointerEvents="none">
            <View style={[headerStyles.accentLine, { left: '20%', opacity: 0.04 }]} />
            <View style={[headerStyles.accentLine, { left: '50%', opacity: 0.03 }]} />
            <View style={[headerStyles.accentLine, { left: '75%', opacity: 0.025 }]} />
          </View>
          <View style={headerStyles.content}>
            <View style={headerStyles.textCol}>
              <Text style={headerStyles.title}>Settings</Text>
              <Text style={headerStyles.subtitle}>Manage your account and preferences</Text>
            </View>
            <View style={headerStyles.iconCircle}>
              <MaterialIcons name="settings" size={22} color="#fff" />
            </View>
          </View>
        </LinearGradient>
        <LinearGradient
          colors={['rgba(13,148,136,0.12)', 'transparent']}
          style={headerStyles.bottomEdge}
        />
      </View>
      <Pressable
        onPress={() => router.back()}
        style={[styles.backButton, { top: insets.top + 12 }]}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={22} color="#ffffff" />
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => (
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
                      backgroundColor: pressed && row.onPress
                        ? isDark
                          ? 'rgba(255,255,255,0.04)'
                          : 'rgba(0,0,0,0.02)'
                        : 'transparent',
                    },
                  ]}
                  onPress={row.onPress}
                  disabled={!row.onPress}
                  accessibilityRole="button"
                  accessibilityLabel={row.label}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      {
                        backgroundColor: row.destructive
                          ? isDark ? colors.errorLight : '#fef2f2'
                          : isDark ? colors.border : '#F0FDFA',
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={row.icon}
                      size={18}
                      color={row.destructive ? colors.error : colors.teal}
                    />
                  </View>
                  <View style={styles.rowText}>
                    <Text
                      style={[
                        styles.rowLabel,
                        { color: row.destructive ? colors.error : colors.text },
                      ]}
                    >
                      {row.label}
                    </Text>
                    {row.subtitle ? (
                      <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                        {row.subtitle}
                      </Text>
                    ) : null}
                  </View>
                  {row.rightElement ?? (
                    row.onPress ? (
                      <MaterialIcons name="chevron-right" size={18} color={colors.icon} />
                    ) : null
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* App info footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.icon }]}>
            BLDESY! v1.0.0
          </Text>
          <Text style={[styles.footerText, { color: colors.icon }]}>
            Made with ❤️ in Australia
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
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
    paddingHorizontal: Spacing.xs,
    marginTop: Spacing.xs,
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
    gap: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12,
  },
  footer: {
    alignItems: 'center',
    gap: 4,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});

const headerStyles = StyleSheet.create({
  container: { position: 'relative' },
  gradient: {
    paddingBottom: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  glowWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  glow: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: -40,
    marginRight: -40,
  },
  accentLines: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  accentLine: {
    position: 'absolute',
    top: -20,
    width: 1,
    height: '150%',
    backgroundColor: '#fff',
    transform: [{ rotate: '15deg' }],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
    zIndex: 1,
  },
  textCol: { flex: 1, gap: 4 },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 36,
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.1,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.75)',
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomEdge: { height: 3 },
});
