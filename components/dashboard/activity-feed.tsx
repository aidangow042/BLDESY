import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { DashboardColors, DashboardFonts, DashboardShadows } from '@/constants/dashboard-theme';
import { mockActivityFeed, type ActivityEvent } from '@/lib/dashboard-mock-data';

const EVENT_ICONS: Record<ActivityEvent['type'], React.ComponentProps<typeof Ionicons>['name']> = {
  view: 'eye-outline',
  save: 'bookmark-outline',
  quote: 'mail-outline',
  review: 'star-outline',
  application_viewed: 'document-text-outline',
};

type Props = {
  onViewAll?: () => void;
};

export function ActivityFeed({ onViewAll }: Props) {
  const events = mockActivityFeed.slice(0, 5);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>Recent Activity</Text>
        <Pressable onPress={onViewAll} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.6 }}>
          <Text style={styles.viewAll}>View all</Text>
        </Pressable>
      </View>

      {/* Events */}
      <View style={[styles.card, DashboardShadows.subtle]}>
        {events.map((event, index) => (
          <View key={event.id}>
            <View style={styles.eventRow}>
              {/* Icon */}
              <View style={styles.iconCircle}>
                <Ionicons
                  name={EVENT_ICONS[event.type]}
                  size={16}
                  color={DashboardColors.accent}
                />
              </View>

              {/* Text */}
              <View style={styles.eventText}>
                <Text style={styles.eventMain} numberOfLines={2}>
                  {event.text}
                  {event.rating ? ` ${'★'.repeat(event.rating)}` : ''}
                </Text>
                <Text style={styles.eventTime}>{event.timestamp}</Text>
              </View>

              {/* Action button */}
              {event.actionLabel && (
                <Pressable
                  style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.actionText}>{event.actionLabel}</Text>
                </Pressable>
              )}
            </View>

            {/* Divider */}
            {index < events.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  heading: {
    fontFamily: DashboardFonts.semiBold,
    fontSize: 16,
    color: DashboardColors.textPrimary,
  },
  viewAll: {
    fontFamily: DashboardFonts.medium,
    fontSize: 13,
    color: DashboardColors.accent,
  },
  card: {
    marginHorizontal: 20,
    backgroundColor: DashboardColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DashboardColors.border,
    padding: 4,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DashboardColors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  eventText: {
    flex: 1,
    gap: 2,
  },
  eventMain: {
    fontFamily: DashboardFonts.regular,
    fontSize: 13,
    color: DashboardColors.textPrimary,
    lineHeight: 18,
  },
  eventTime: {
    fontFamily: DashboardFonts.regular,
    fontSize: 11,
    color: DashboardColors.textMuted,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: DashboardColors.accentDim,
  },
  actionText: {
    fontFamily: DashboardFonts.semiBold,
    fontSize: 12,
    color: DashboardColors.accent,
  },
  divider: {
    height: 1,
    backgroundColor: DashboardColors.border,
    marginHorizontal: 12,
  },
});
