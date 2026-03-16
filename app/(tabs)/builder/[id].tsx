import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

type BuilderProfile = {
  id: string;
  business_name: string;
  bio: string | null;
  trade_category: string;
  suburb: string;
  postcode: string;
  phone: string | null;
  website: string | null;
};

export default function BuilderProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [builder, setBuilder] = useState<BuilderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBuilder();
      checkIfSaved();
    }
  }, [id]);

  async function fetchBuilder() {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('builder_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setBuilder(data);
    }
    setLoading(false);
  }

  async function checkIfSaved() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const { data } = await supabase
      .from('saved_builders')
      .select('id')
      .eq('user_id', userData.user.id)
      .eq('builder_id', id)
      .maybeSingle();

    setIsSaved(!!data);
  }

  async function toggleSave() {
    setSavingToggle(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      Alert.alert('Sign in required', 'You need to be logged in to save builders.');
      setSavingToggle(false);
      return;
    }

    if (isSaved) {
      await supabase
        .from('saved_builders')
        .delete()
        .eq('user_id', userData.user.id)
        .eq('builder_id', id);
      setIsSaved(false);
    } else {
      const { error: insertError } = await supabase.from('saved_builders').insert({
        user_id: userData.user.id,
        builder_id: id,
      });
      if (insertError) {
        Alert.alert('Error', insertError.message);
      } else {
        setIsSaved(true);
      }
    }

    setSavingToggle(false);
  }

  function handleCall() {
    if (builder?.phone) {
      Linking.openURL(`tel:${builder.phone}`);
    }
  }

  function handleWebsite() {
    if (builder?.website) {
      const url = builder.website.startsWith('http')
        ? builder.website
        : `https://${builder.website}`;
      Linking.openURL(url);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.tint} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (error || !builder) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.centeredContainer}>
          <ThemedText type="subtitle">Builder not found</ThemedText>
          <ThemedText style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 14, lineHeight: 20 }}>
            {error ?? 'This builder profile could not be loaded.'}
          </ThemedText>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: colors.tint },
              pressed && { opacity: 0.7 },
            ]}
          >
            <ThemedText style={[styles.secondaryButtonText, { color: colors.tint }]}>
              Go back
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => pressed && { opacity: 0.7 }}
          >
            <ThemedText style={[styles.backText, { color: colors.tint }]}>Back</ThemedText>
          </Pressable>
          <View style={{ width: 40 }} />
        </View>

        {/* Business name */}
        <ThemedText type="title" style={styles.businessName}>
          {builder.business_name}
        </ThemedText>

        {/* Trade badge & location */}
        <View style={styles.metaRow}>
          <View style={[styles.tradeBadge, { backgroundColor: colors.tintLight }]}>
            <ThemedText style={[styles.tradeBadgeText, { color: colors.tint }]}>
              {builder.trade_category}
            </ThemedText>
          </View>
          <ThemedText style={{ color: colors.textSecondary, fontSize: 14 }}>
            {builder.suburb}, {builder.postcode}
          </ThemedText>
        </View>

        {/* Bio */}
        {builder.bio ? (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
            <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary }]}>ABOUT</ThemedText>
            <ThemedText style={styles.bioText}>{builder.bio}</ThemedText>
          </View>
        ) : null}

        {/* Contact info */}
        {builder.phone ? (
          <Pressable
            style={({ pressed }) => [
              styles.contactRow,
              { backgroundColor: colors.surface, borderColor: colors.border },
              Shadows.sm,
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleCall}
          >
            <ThemedText style={[styles.contactLabel, { color: colors.textSecondary }]}>Phone</ThemedText>
            <ThemedText style={{ color: colors.tint, fontSize: 15, fontWeight: '500' }}>{builder.phone}</ThemedText>
          </Pressable>
        ) : null}

        {builder.website ? (
          <Pressable
            style={({ pressed }) => [
              styles.contactRow,
              { backgroundColor: colors.surface, borderColor: colors.border },
              Shadows.sm,
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleWebsite}
          >
            <ThemedText style={[styles.contactLabel, { color: colors.textSecondary }]}>Website</ThemedText>
            <ThemedText style={{ color: colors.tint, fontSize: 15, fontWeight: '500' }} numberOfLines={1}>
              {builder.website}
            </ThemedText>
          </Pressable>
        ) : null}

        {/* Save button */}
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            isSaved
              ? { backgroundColor: 'transparent', borderColor: colors.tint, borderWidth: 1.5 }
              : { backgroundColor: colors.tint },
            (savingToggle || pressed) && { opacity: 0.7 },
          ]}
          onPress={toggleSave}
          disabled={savingToggle}
        >
          {savingToggle ? (
            <ActivityIndicator color={isSaved ? colors.tint : '#fff'} />
          ) : (
            <ThemedText
              style={[
                styles.saveButtonText,
                { color: isSaved ? colors.tint : '#fff' },
              ]}
            >
              {isSaved ? 'Saved \u2713' : 'Save Builder'}
            </ThemedText>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loader: {
    marginTop: 60,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
    gap: Spacing.md,
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    height: 52,
    paddingHorizontal: Spacing['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  contentContainer: {
    padding: Spacing['2xl'],
    gap: Spacing.lg,
    paddingBottom: Spacing['5xl'],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  businessName: {
    marginTop: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  tradeBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  tradeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  section: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  bioText: {
    fontSize: 15,
    lineHeight: 24,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    borderRadius: Radius.lg,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    ...Shadows.sm,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
