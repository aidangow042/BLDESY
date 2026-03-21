import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { Colors, Radius, Spacing, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { legalDocuments } from '@/lib/legal-documents';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

type DocKey = keyof typeof legalDocuments;

const LEGAL_SECTIONS: {
  key: DocKey;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
}[] = [
  { key: 'termsOfService', icon: 'description' },
  { key: 'privacyPolicy', icon: 'privacy-tip' },
  { key: 'disclaimer', icon: 'info-outline' },
  { key: 'cookiePolicy', icon: 'cookie' },
];

export default function LegalScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [expandedKey, setExpandedKey] = useState<DocKey | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState<DocKey | null>(null);

  const toggleSection = (key: DocKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedKey(expandedKey === key ? null : key);
  };

  const downloadPdf = async (key: DocKey) => {
    const doc = legalDocuments[key];
    setGeneratingPdf(key);
    try {
      const { uri } = await Print.printToFileAsync({
        html: doc.html,
        base64: false,
      });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: doc.title,
        UTI: 'com.adobe.pdf',
      });
    } catch (e: any) {
      if (e?.message?.includes('cancelled') || e?.message?.includes('dismiss')) return;
      Alert.alert('Error', 'Could not generate PDF. Please try again.');
    } finally {
      setGeneratingPdf(null);
    }
  };

  const downloadAll = async () => {
    setGeneratingPdf('termsOfService');
    try {
      const allHtml = Object.values(legalDocuments)
        .map((doc) => doc.html)
        .join('<div style="page-break-after: always;"></div>');
      const { uri } = await Print.printToFileAsync({
        html: allHtml,
        base64: false,
      });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'BLDESY! Legal Documents',
        UTI: 'com.adobe.pdf',
      });
    } catch (e: any) {
      if (e?.message?.includes('cancelled') || e?.message?.includes('dismiss')) return;
      Alert.alert('Error', 'Could not generate PDF. Please try again.');
    } finally {
      setGeneratingPdf(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
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
              <Text style={headerStyles.title}>Legal</Text>
              <Text style={headerStyles.subtitle}>Terms, privacy, and policies</Text>
            </View>
            <View style={headerStyles.iconCircle}>
              <MaterialIcons name="gavel" size={22} color="#fff" />
            </View>
          </View>
        </LinearGradient>
        <LinearGradient
          colors={['rgba(13,148,136,0.12)', 'transparent']}
          style={headerStyles.bottomEdge}
        />
      </View>
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
      >
        {/* Intro + Download All */}
        <View
          style={[
            styles.introCard,
            {
              backgroundColor: colors.tealBg,
              borderColor: colors.teal + '30',
            },
          ]}
        >
          <MaterialIcons name="info-outline" size={20} color={colors.teal} />
          <View style={styles.introContent}>
            <Text style={[styles.introText, { color: colors.textSecondary }]}>
              By using BLDESY! you agree to our Terms of Service and Privacy Policy. Tap any section to read, or download everything as a PDF.
            </Text>
            <Pressable
              onPress={downloadAll}
              disabled={!!generatingPdf}
              style={[styles.downloadAllBtn, { backgroundColor: colors.teal }]}
              accessibilityRole="button"
              accessibilityLabel="Download all legal documents as PDF"
            >
              {generatingPdf && expandedKey === null ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="picture-as-pdf" size={16} color="#fff" />
                  <Text style={styles.downloadAllText}>Download All as PDF</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* Expandable legal sections */}
        {LEGAL_SECTIONS.map((section) => {
          const doc = legalDocuments[section.key];
          const isExpanded = expandedKey === section.key;
          const isGenerating = generatingPdf === section.key;
          return (
            <View
              key={section.key}
              style={[
                styles.sectionCard,
                {
                  backgroundColor: isDark ? colors.surface : '#ffffff',
                  borderColor: isExpanded ? colors.teal + '40' : colors.border,
                },
              ]}
            >
              <Pressable
                onPress={() => toggleSection(section.key)}
                style={({ pressed }) => [
                  styles.sectionHeader,
                  {
                    backgroundColor: pressed
                      ? isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'
                      : 'transparent',
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ expanded: isExpanded }}
              >
                <View
                  style={[
                    styles.sectionIconWrap,
                    {
                      backgroundColor: isExpanded
                        ? colors.teal + '15'
                        : isDark ? colors.border : '#F0FDFA',
                    },
                  ]}
                >
                  <MaterialIcons
                    name={section.icon}
                    size={18}
                    color={isExpanded ? colors.teal : colors.icon}
                  />
                </View>
                <View style={styles.sectionText}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {doc.title}
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                    Last updated 1 March 2026
                  </Text>
                </View>
                <MaterialIcons
                  name={isExpanded ? 'expand-less' : 'expand-more'}
                  size={22}
                  color={colors.icon}
                />
              </Pressable>

              {isExpanded && (
                <View style={[styles.sectionBody, { borderTopColor: colors.borderLight }]}>
                  {doc.sections.map((item, i) => (
                    <View
                      key={i}
                      style={[
                        styles.clause,
                        {
                          borderTopWidth: i > 0 ? 1 : 0,
                          borderTopColor: colors.borderLight,
                        },
                      ]}
                    >
                      <Text style={[styles.clauseHeading, { color: colors.text }]}>
                        {item.heading}
                      </Text>
                      <Text style={[styles.clauseBody, { color: colors.textSecondary }]}>
                        {item.body}
                      </Text>
                    </View>
                  ))}

                  {/* Download individual PDF */}
                  <Pressable
                    onPress={() => downloadPdf(section.key)}
                    disabled={!!generatingPdf}
                    style={[
                      styles.downloadBtn,
                      {
                        borderTopWidth: 1,
                        borderTopColor: colors.borderLight,
                        backgroundColor: isDark ? 'rgba(45,212,191,0.06)' : 'rgba(13,148,136,0.03)',
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Download ${doc.title} as PDF`}
                  >
                    {isGenerating ? (
                      <ActivityIndicator size="small" color={colors.teal} />
                    ) : (
                      <>
                        <MaterialIcons name="picture-as-pdf" size={16} color={colors.teal} />
                        <Text style={[styles.downloadBtnText, { color: colors.teal }]}>
                          Download as PDF
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}

        {/* Contact for legal */}
        <View
          style={[
            styles.contactCard,
            {
              backgroundColor: isDark ? colors.surface : '#ffffff',
              borderColor: colors.border,
            },
          ]}
        >
          <MaterialIcons name="email" size={20} color={colors.teal} />
          <View style={styles.contactText}>
            <Text style={[styles.contactTitle, { color: colors.text }]}>
              Questions about our policies?
            </Text>
            <Text style={[styles.contactSubtitle, { color: colors.textSecondary }]}>
              Email us at hello@bldesy.com.au
            </Text>
          </View>
          <Pressable
            onPress={() => Linking.openURL('mailto:hello@bldesy.com.au?subject=Legal%20Inquiry')}
            style={[styles.contactBtn, { backgroundColor: colors.teal }]}
            accessibilityRole="button"
          >
            <Text style={styles.contactBtnText}>Contact</Text>
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.icon }]}>
            BLDESY! v1.0.0 · ABN 00 000 000 000
          </Text>
          <Text style={[styles.footerText, { color: colors.icon }]}>
            © {new Date().getFullYear()} BLDESY Pty Ltd. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    gap: Spacing.lg,
  },

  // Intro
  introCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  introContent: {
    flex: 1,
    gap: Spacing.md,
  },
  introText: {
    fontSize: 14,
    lineHeight: 21,
  },
  downloadAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    alignSelf: 'flex-start',
  },
  downloadAllText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Expandable sections
  sectionCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionText: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
  },
  sectionBody: {
    borderTopWidth: 1,
  },
  clause: {
    padding: Spacing.lg,
    gap: 6,
  },
  clauseHeading: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  clauseBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  downloadBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Contact
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    ...Shadows.sm,
  },
  contactText: {
    flex: 1,
    gap: 2,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  contactSubtitle: {
    fontSize: 12,
  },
  contactBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
  },
  contactBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Footer
  footer: {
    alignItems: 'center',
    gap: 4,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
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
