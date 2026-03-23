import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { DashboardColors, DashboardFonts, DashboardShadows } from '@/constants/dashboard-theme';

type Action = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
};

type Props = {
  actions: Action[];
};

export function QuickActions({ actions }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Quick Actions</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {actions.map((action) => (
          <Pressable
            key={action.label}
            onPress={action.onPress}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }, DashboardShadows.subtle]}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <View style={styles.iconCircle}>
              <Ionicons name={action.icon} size={24} color={DashboardColors.accent} />
            </View>
            <Text style={styles.label} numberOfLines={2}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    gap: 10,
  },
  heading: {
    fontFamily: DashboardFonts.semiBold,
    fontSize: 16,
    color: DashboardColors.textPrimary,
    paddingHorizontal: 20,
  },
  scroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    width: 80,
    height: 80,
    backgroundColor: DashboardColors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DashboardColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 8,
  },
  iconCircle: {
    // icon sits directly, no wrapping circle needed at this size
  },
  label: {
    fontFamily: DashboardFonts.medium,
    fontSize: 10,
    color: DashboardColors.textPrimary,
    textAlign: 'center',
    lineHeight: 13,
  },
});
