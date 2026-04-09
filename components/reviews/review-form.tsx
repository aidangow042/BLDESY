/**
 * Review submission form — lets customers rate and review builders.
 */
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { StarRating } from '@/components/ui/star-rating';

type Props = {
  jobId: string;
  builderId: string;
  builderName: string;
  onSubmitted?: () => void;
  onCancel?: () => void;
};

export function ReviewForm({ jobId, builderId, builderName, onSubmitted, onCancel }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (rating === 0) {
      Alert.alert('Rating required', 'Please select a star rating.');
      return;
    }

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Error', 'You must be logged in to leave a review.');
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from('reviews').insert({
      job_id: jobId,
      reviewer_id: user.id,
      reviewee_id: builderId,
      rating,
      comment: comment.trim() || null,
    });

    setSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        Alert.alert('Already reviewed', 'You have already left a review for this job.');
      } else {
        Alert.alert('Error', error.message);
      }
      return;
    }

    Alert.alert('Review submitted', 'Thanks for your feedback!');
    onSubmitted?.();
  }

  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC';
  const inputBorder = isDark ? colors.border : '#E2E8F0';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Rate {builderName}
      </Text>

      {/* Star rating input */}
      <View style={styles.ratingRow}>
        <StarRating rating={rating} size={32} onRate={setRating} />
        <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>
          {rating === 0 ? 'Tap to rate' : `${rating} star${rating !== 1 ? 's' : ''}`}
        </Text>
      </View>

      {/* Comment */}
      <TextInput
        style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]}
        placeholder="Share your experience (optional)"
        placeholderTextColor={colors.textSecondary}
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        maxLength={1000}
      />

      {/* Actions */}
      <View style={styles.actions}>
        {onCancel && (
          <Pressable style={[styles.cancelBtn, { borderColor: inputBorder }]} onPress={onCancel}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.submitBtn, { backgroundColor: colors.teal, opacity: submitting ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="send" size={16} color="#fff" />
              <Text style={styles.submitText}>Submit Review</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  title: {
    ...Type.h3,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  ratingLabel: {
    ...Type.body,
  },
  input: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    paddingHorizontal: Spacing.xl,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    ...Type.btnSecondary,
  },
  submitBtn: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: Spacing.xl,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#fff',
    ...Type.btnSecondary,
  },
});
