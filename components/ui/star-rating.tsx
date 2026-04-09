/**
 * Star rating display — filled, half, and empty stars.
 * Used on builder profiles, search results, and review cards.
 */
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

type Props = {
  rating: number;
  size?: number;
  color?: string;
  emptyColor?: string;
  /** If provided, stars become tappable for input */
  onRate?: (rating: number) => void;
};

export function StarRating({
  rating,
  size = 16,
  color = '#f59e0b',
  emptyColor = '#d1d5db',
  onRate,
}: Props) {
  const stars = [];
  const rounded = Math.round(rating * 2) / 2; // Round to nearest 0.5

  for (let i = 1; i <= 5; i++) {
    let iconName: 'star' | 'star-half' | 'star-outline';
    let iconColor: string;

    if (rounded >= i) {
      iconName = 'star';
      iconColor = color;
    } else if (rounded >= i - 0.5) {
      iconName = 'star-half';
      iconColor = color;
    } else {
      iconName = 'star-outline';
      iconColor = emptyColor;
    }

    const star = (
      <Ionicons key={i} name={iconName} size={size} color={iconColor} />
    );

    if (onRate) {
      stars.push(
        <Pressable key={i} onPress={() => onRate(i)} hitSlop={4}>
          {star}
        </Pressable>,
      );
    } else {
      stars.push(star);
    }
  }

  return <View style={styles.container}>{stars}</View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
});
