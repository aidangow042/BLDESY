/**
 * Cookie consent banner — shown once, dismissed permanently via AsyncStorage.
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Radius, Spacing, Shadows, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const STORAGE_KEY = 'bldesy_cookie_consent';

export function CookieBanner() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (!val) setVisible(true);
    });
  }, []);

  async function handleAccept() {
    await AsyncStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  }

  async function handleDecline() {
    await AsyncStorage.setItem(STORAGE_KEY, 'declined');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.surface : '#fff',
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, Spacing.md),
        },
        Shadows.lg,
      ]}
    >
      <View style={styles.content}>
        <Ionicons name="information-circle" size={20} color={colors.teal} />
        <Text style={[styles.text, { color: colors.text }]}>
          We use cookies and local storage to improve your experience.
        </Text>
      </View>
      <View style={styles.buttons}>
        <Pressable
          style={[styles.declineBtn, { borderColor: colors.border }]}
          onPress={handleDecline}
        >
          <Text style={[styles.declineText, { color: colors.textSecondary }]}>Decline</Text>
        </Pressable>
        <Pressable
          style={[styles.acceptBtn, { backgroundColor: colors.teal }]}
          onPress={handleAccept}
        >
          <Text style={styles.acceptText}>Accept</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    zIndex: 999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  text: {
    ...Type.caption,
    flex: 1,
    lineHeight: 18,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'flex-end',
  },
  declineBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  declineText: {
    ...Type.captionSemiBold,
  },
  acceptBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  acceptText: {
    ...Type.captionSemiBold,
    color: '#fff',
  },
});
