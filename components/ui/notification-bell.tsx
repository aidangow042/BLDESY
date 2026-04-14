/**
 * Notification bell with unread count badge.
 * Fetches notifications from Supabase and subscribes to real-time updates.
 */
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/auth-context';

type Props = {
  onPress: () => void;
  color?: string;
  size?: number;
};

export function NotificationBell({ onPress, color, size = 24 }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const { userId } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!userId) return;

    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    setUnreadCount(count ?? 0);
  }, [userId]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('notification-bell')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => fetchCount(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        () => fetchCount(),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchCount]);

  const iconColor = color || (isDark ? '#fff' : colors.text);

  return (
    <Pressable onPress={onPress} hitSlop={12} style={styles.container}>
      <Ionicons name="notifications-outline" size={size} color={iconColor} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
});
