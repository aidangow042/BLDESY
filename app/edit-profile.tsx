import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { File } from 'expo-file-system';

import { Colors, Radius, Spacing, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

const AVATAR_SIZE = 88;

// Upload a local image URI to the avatars bucket and return the public URL.
async function uploadAvatar(localUri: string, userId: string): Promise<string | null> {
  try {
    const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const fileName = `${userId}/avatar-${Date.now()}.${ext}`;
    const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

    const file = new File(localUri);
    const arrayBuffer = await file.arrayBuffer();

    const { error } = await supabase.storage
      .from('avatars')
      .upload(fileName, arrayBuffer, { contentType, upsert: true });

    if (error) {
      console.error('Avatar upload error:', error.message);
      return null;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    return data.publicUrl;
  } catch (err) {
    console.error('Avatar upload failed:', err);
    return null;
  }
}

export default function EditProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [pendingAvatarUri, setPendingAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      setUserEmail(user.email ?? '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, avatar_url, phone')
        .eq('id', user.id)
        .single();

      setFullName(profile?.name ?? '');
      setPhone(profile?.phone ?? '');
      setAvatarUrl(profile?.avatar_url ?? null);
      setLoading(false);
    })();
  }, []);

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library to change your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      setPendingAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    if (!fullName.trim()) {
      Alert.alert('Name required', 'Please enter your full name.');
      return;
    }

    setSaving(true);
    try {
      let finalAvatarUrl = avatarUrl;

      // Upload new avatar if one was picked
      if (pendingAvatarUri) {
        const uploaded = await uploadAvatar(pendingAvatarUri, userId);
        if (uploaded) {
          finalAvatarUrl = uploaded;
        } else {
          Alert.alert('Upload failed', 'Could not upload your avatar. Your other changes will still be saved.');
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          name: fullName.trim(),
          phone: phone.trim() || null,
          avatar_url: finalAvatarUrl,
        })
        .eq('id', userId);

      if (error) {
        console.error('Profile update error:', error);
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } finally {
      setSaving(false);
    }
  };

  const displayAvatar = pendingAvatarUri ?? avatarUrl;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.canvas }]}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.canvas }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={headerStyles.container}>
        <LinearGradient
          colors={isDark ? ['#042f2e', '#0a3a38', '#134E4A'] : ['#064E3B', '#0F6E56', '#1D9E75']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[headerStyles.gradient, { paddingTop: insets.top + Spacing.lg }]}
        >
          <View style={headerStyles.glowWrap} pointerEvents="none">
            <View style={[headerStyles.glow, isDark && { opacity: 0.06 }]} />
          </View>
          <View style={headerStyles.accentLines} pointerEvents="none">
            <View style={[headerStyles.accentLine, { left: '20%', opacity: 0.04 }]} />
            <View style={[headerStyles.accentLine, { left: '50%', opacity: 0.03 }]} />
            <View style={[headerStyles.accentLine, { left: '75%', opacity: 0.025 }]} />
          </View>
          <View style={headerStyles.content}>
            <View style={headerStyles.textCol}>
              <Text style={headerStyles.title}>My Profile</Text>
              <Text style={headerStyles.subtitle}>Name and avatar</Text>
            </View>
            <View style={headerStyles.iconCircle}>
              <MaterialIcons name="person" size={22} color="#fff" />
            </View>
          </View>
        </LinearGradient>
        <LinearGradient
          colors={['rgba(13,148,136,0.12)', 'transparent']}
          style={headerStyles.bottomEdge}
        />
      </View>

      {/* Back button */}
      <Pressable
        onPress={() => router.back()}
        style={[styles.backButton, { top: insets.top + 12 }]}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={22} color="#ffffff" />
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Photo
          </Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? colors.surface : '#ffffff',
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.avatarRow}>
              <Pressable
                onPress={handlePickAvatar}
                style={styles.avatarWrap}
                accessibilityRole="button"
                accessibilityLabel="Change profile photo"
                accessibilityHint="Opens your photo library"
              >
                {displayAvatar ? (
                  <Image
                    source={{ uri: displayAvatar }}
                    style={styles.avatar}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatarPlaceholder,
                      { backgroundColor: isDark ? colors.border : colors.tealBg },
                    ]}
                  >
                    <MaterialIcons name="person" size={36} color={colors.teal} />
                  </View>
                )}
                <View style={[styles.avatarEditBadge, { backgroundColor: colors.teal }]}>
                  <MaterialIcons name="photo-camera" size={12} color="#fff" />
                </View>
              </Pressable>

              <View style={styles.avatarMeta}>
                <Text style={[styles.avatarLabel, { color: colors.text }]}>
                  Profile Photo
                </Text>
                <Text style={[styles.avatarHint, { color: colors.textSecondary }]}>
                  Tap to choose from your library
                </Text>
                {pendingAvatarUri && (
                  <Text style={[styles.avatarPending, { color: colors.teal }]}>
                    New photo selected
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Personal details section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Details
          </Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? colors.surface : '#ffffff',
                borderColor: colors.border,
              },
            ]}
          >
            {/* Full name field */}
            <View style={styles.fieldRow}>
              <View
                style={[
                  styles.fieldIconWrap,
                  { backgroundColor: isDark ? colors.border : '#F0FDFA' },
                ]}
              >
                <MaterialIcons name="badge" size={18} color={colors.teal} />
              </View>
              <View style={styles.fieldContent}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  Full Name
                </Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.text }]}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Your full name"
                  placeholderTextColor={colors.icon}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="done"
                  accessibilityLabel="Full name"
                />
              </View>
            </View>

            {/* Phone number field */}
            <View
              style={[styles.fieldRow, { borderTopWidth: 1, borderTopColor: colors.borderLight }]}
            >
              <View
                style={[
                  styles.fieldIconWrap,
                  { backgroundColor: isDark ? colors.border : '#F0FDFA' },
                ]}
              >
                <MaterialIcons name="phone" size={18} color={colors.teal} />
              </View>
              <View style={styles.fieldContent}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  Phone Number
                </Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.text }]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="04XX XXX XXX"
                  placeholderTextColor={colors.icon}
                  keyboardType="phone-pad"
                  autoCorrect={false}
                  returnKeyType="done"
                  accessibilityLabel="Phone number"
                />
              </View>
            </View>

            {/* Email (read-only) */}
            <View
              style={[styles.fieldRow, { borderTopWidth: 1, borderTopColor: colors.borderLight }]}
            >
              <View
                style={[
                  styles.fieldIconWrap,
                  { backgroundColor: isDark ? colors.border : '#F0FDFA' },
                ]}
              >
                <MaterialIcons name="email" size={18} color={colors.teal} />
              </View>
              <View style={styles.fieldContent}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  Email Address
                </Text>
                <Text style={[styles.fieldReadOnly, { color: colors.textSecondary }]}>
                  {userEmail || 'Not signed in'}
                </Text>
              </View>
              <View
                style={[
                  styles.readOnlyBadge,
                  { backgroundColor: isDark ? colors.border : colors.tealBg },
                ]}
              >
                <Text style={[styles.readOnlyText, { color: colors.teal }]}>Read only</Text>
              </View>
            </View>
          </View>
          <Text style={[styles.emailNote, { color: colors.icon }]}>
            To change your email address, go to Settings.
          </Text>
        </View>

        {/* Save button */}
        <Pressable
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Save changes"
          style={({ pressed }) => [styles.saveButtonWrap, pressed && { opacity: 0.88 }]}
        >
          <LinearGradient
            colors={isDark ? ['#0f766e', '#0d9488'] : ['#0F6E56', '#0d9488']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButton}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="check" size={18} color="#fff" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['5xl'],
    gap: Spacing.xl,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.xs,
    marginTop: Spacing.xs,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadows.sm,
  },

  // Avatar row
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  avatarWrap: {
    position: 'relative',
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarMeta: {
    flex: 1,
    gap: 3,
  },
  avatarLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  avatarHint: {
    fontSize: 13,
  },
  avatarPending: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },

  // Field rows
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    minHeight: 62,
  },
  fieldIconWrap: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldContent: {
    flex: 1,
    gap: 2,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldInput: {
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
    minHeight: 24,
  },
  fieldReadOnly: {
    fontSize: 15,
    fontWeight: '500',
  },
  readOnlyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  readOnlyText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  emailNote: {
    fontSize: 12,
    paddingHorizontal: Spacing.xs,
  },

  // Save button
  saveButtonWrap: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.md,
    marginTop: Spacing.sm,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
    minHeight: 54,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },
});

const headerStyles = StyleSheet.create({
  container: { position: 'relative' },
  gradient: {
    paddingBottom: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  glowWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  glow: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: -40,
    marginRight: -40,
  },
  accentLines: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  accentLine: {
    position: 'absolute',
    top: -20,
    width: 1,
    height: '150%',
    backgroundColor: '#fff',
    transform: [{ rotate: '15deg' }],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
    zIndex: 1,
  },
  textCol: { flex: 1, gap: 4 },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 36,
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.1,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.75)',
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomEdge: { height: 3 },
});
