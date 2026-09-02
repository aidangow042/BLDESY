/**
 * PortalMoreSheet — the web portal shell's mobile "More" sheet
 * (`~/bldesy-web/app/portal/portal-shell.tsx`, "Mobile 'More' sheet"): a dark
 * bottom sheet with the profile summary (photo / initial, business name,
 * trade) and every nav item not on the tab bar. Stage 2 items carry the web's
 * pill; Exit Portal is the primary-tinted accent row.
 */
import { forwardRef, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { usePathname, useRouter, type Href } from 'expo-router';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { OwnBuilderProfile } from '@/lib/data/portal';
import { ROUTES } from '@/lib/routes';
import { formatTradeName } from '@/lib/web/trades';

import { PORTAL_CHROME_BG } from './portal-header';
import { isPortalLinkActive, PORTAL_MORE_ITEMS } from './portal-nav';

interface PortalMoreSheetProps {
  profile: OwnBuilderProfile;
  onChange?: (index: number) => void;
}

export const PortalMoreSheet = forwardRef<BottomSheet, PortalMoreSheetProps>(function PortalMoreSheet(
  { profile, onChange },
  ref,
) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const router = useRouter();
  const pathname = usePathname();

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

  const maxHeight = useMemo(() => Math.round(windowHeight * 0.85), [windowHeight]);

  function go(href: string) {
    // Close on route change, as the web's pathname effect does.
    (ref as React.RefObject<BottomSheet | null>)?.current?.close();
    if (href === ROUTES.home) {
      router.navigate(ROUTES.home);
      return;
    }
    router.navigate(href as Href);
  }

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      enablePanDownToClose
      enableDynamicSizing
      maxDynamicContentSize={maxHeight}
      backdropComponent={renderBackdrop}
      onChange={onChange}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
      accessibilityLabel="More portal options"
    >
      <BottomSheetScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.md }]}
      >
        {/* Profile summary */}
        <View style={styles.profileRow}>
          {profile.profile_photo_url ? (
            <Image
              source={{ uri: profile.profile_photo_url }}
              style={styles.avatar}
              accessibilityLabel={profile.business_name}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: c.primary + '26' }]}>
              <Text style={[styles.avatarInitial, { color: c.primary }]}>
                {profile.business_name.charAt(0)}
              </Text>
            </View>
          )}
          <View style={styles.profileText}>
            <Text numberOfLines={1} style={styles.businessName}>
              {profile.business_name}
            </Text>
            <Text numberOfLines={1} style={styles.tradeName}>
              {formatTradeName(profile.trade_category)}
            </Text>
          </View>
        </View>

        <View style={styles.items}>
          {PORTAL_MORE_ITEMS.map((item) => {
            const active = isPortalLinkActive(pathname, item);
            const color = active
              ? c.primary
              : item.accent
                ? c.primary + 'CC'
                : 'rgba(255,255,255,0.7)';
            return (
              <Pressable
                key={item.label}
                accessibilityRole="link"
                accessibilityState={{ selected: active }}
                onPress={() => go(item.href)}
                style={({ pressed }) => [
                  styles.item,
                  active
                    ? { backgroundColor: c.primary + '14' }
                    : pressed
                      ? { backgroundColor: 'rgba(255,255,255,0.04)' }
                      : null,
                ]}
              >
                <Ionicons name={item.icon} size={18} color={color} />
                <Text style={[styles.itemLabel, { color }]}>{item.label}</Text>
                {item.badge ? (
                  <View style={[styles.badge, { borderColor: c.primary + '66', backgroundColor: c.primary + '1A' }]}>
                    <Text style={[styles.badgeText, { color: c.primary + 'E6' }]}>{item.badge}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: PORTAL_CHROME_BG,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  handle: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 40,
    height: 4,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  profileText: {
    flex: 1,
    minWidth: 0,
  },
  businessName: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  tradeName: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  items: {
    gap: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  itemLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  badge: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
});
