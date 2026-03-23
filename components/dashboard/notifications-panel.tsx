import { forwardRef, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';

import { DashboardColors, DashboardFonts } from '@/constants/dashboard-theme';
import { mockNotifications, type NotificationItem } from '@/lib/dashboard-mock-data';

const EVENT_ICONS: Record<NotificationItem['type'], React.ComponentProps<typeof Ionicons>['name']> = {
  view: 'eye-outline',
  save: 'bookmark-outline',
  quote: 'mail-outline',
  review: 'star-outline',
  system: 'megaphone-outline',
};

export const NotificationsPanel = forwardRef<BottomSheet>(function NotificationsPanel(_, ref) {
  const snapPoints = useMemo(() => ['50%', '85%'], []);
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
      />
    ),
    [],
  );

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <Pressable onPress={markAllRead} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.6 }}>
            <Text style={styles.markAllRead}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {/* List */}
      <BottomSheetScrollView contentContainerStyle={styles.list}>
        {notifications.map((item, index) => (
          <View key={item.id}>
            <View style={styles.row}>
              {/* Unread dot */}
              {!item.read && <View style={styles.unreadDot} />}

              {/* Icon */}
              <View style={[styles.iconCircle, !item.read && styles.iconCircleUnread]}>
                <Ionicons name={EVENT_ICONS[item.type]} size={16} color={DashboardColors.accent} />
              </View>

              {/* Text */}
              <View style={styles.textWrap}>
                <Text style={[styles.notifText, !item.read && styles.notifTextUnread]} numberOfLines={2}>
                  {item.text}
                </Text>
                <Text style={styles.timestamp}>{item.timestamp}</Text>
              </View>

              {/* Dismiss */}
              <Pressable
                onPress={() => dismissNotification(item.id)}
                hitSlop={8}
                style={({ pressed }) => pressed && { opacity: 0.5 }}
              >
                <Ionicons name="close" size={16} color={DashboardColors.textMuted} />
              </Pressable>
            </View>

            {index < notifications.length - 1 && <View style={styles.divider} />}
          </View>
        ))}

        {notifications.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={32} color={DashboardColors.textMuted} />
            <Text style={styles.emptyText}>No notifications</Text>
          </View>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: DashboardColors.base,
  },
  handle: {
    backgroundColor: DashboardColors.textMuted,
    width: 36,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: DashboardColors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: DashboardFonts.bold,
    fontSize: 18,
    color: DashboardColors.textPrimary,
  },
  unreadBadge: {
    backgroundColor: DashboardColors.badgeRed,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    fontFamily: DashboardFonts.bold,
    fontSize: 11,
    color: '#fff',
  },
  markAllRead: {
    fontFamily: DashboardFonts.medium,
    fontSize: 13,
    color: DashboardColors.accent,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  unreadDot: {
    position: 'absolute',
    left: -10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DashboardColors.accent,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DashboardColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconCircleUnread: {
    backgroundColor: DashboardColors.accentDim,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  notifText: {
    fontFamily: DashboardFonts.regular,
    fontSize: 13,
    color: DashboardColors.textSecondary,
    lineHeight: 18,
  },
  notifTextUnread: {
    fontFamily: DashboardFonts.medium,
    color: DashboardColors.textPrimary,
  },
  timestamp: {
    fontFamily: DashboardFonts.regular,
    fontSize: 11,
    color: DashboardColors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: DashboardColors.border,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: {
    fontFamily: DashboardFonts.regular,
    fontSize: 14,
    color: DashboardColors.textMuted,
  },
});
