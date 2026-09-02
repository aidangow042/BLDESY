/**
 * TermsCheckbox — the clickwrap acceptance shared by every signup path.
 * Copy and structure mirror the website's `TermsCheckbox` in
 * components/auth/signup-form.tsx; the Terms / Privacy links open the website
 * pages in the in-app browser.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { WEB_PAGES } from '@/lib/routes';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function openPage(url: string) {
  WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.AUTOMATIC,
  }).catch(() => {});
}

export function TermsCheckbox({ checked, onChange }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel="I am 18 or over and I have read and agree to the BLDESY Terms of Service and Privacy Policy."
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [
        styles.box,
        { borderColor: c.border, backgroundColor: pressed ? c.canvas : c.surface },
      ]}
    >
      <View
        style={[
          styles.checkbox,
          {
            borderColor: checked ? c.primary : c.border,
            backgroundColor: checked ? c.primary : 'transparent',
          },
        ]}
      >
        {checked ? <Ionicons name="checkmark" size={12} color="#ffffff" /> : null}
      </View>
      <Text style={[styles.text, { color: c.textSecondary }]}>
        I am 18 or over and I have read and agree to the BLDESY{' '}
        <Text
          accessibilityRole="link"
          onPress={() => openPage(WEB_PAGES.terms)}
          style={[styles.link, { color: c.primary }]}
        >
          Terms of Service
        </Text>{' '}
        and{' '}
        <Text
          accessibilityRole="link"
          onPress={() => openPage(WEB_PAGES.privacy)}
          style={[styles.link, { color: c.primary }]}
        >
          Privacy Policy
        </Text>
        .
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  checkbox: {
    width: 16,
    height: 16,
    marginTop: 2,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FontFamily.body,
  },
  link: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
});
