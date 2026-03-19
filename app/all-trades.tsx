import { useState } from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/* ───────────────────────── All Trades Data ───────────────────────── */

type TradeEntry = {
  name: string;
  icon: string;
  iconSet: 'material' | 'ionicon';
  fg: string;
  bg: string;
};

type TradeCategory = {
  title: string;
  trades: TradeEntry[];
};

const TRADE_CATEGORIES: TradeCategory[] = [
  {
    title: 'Building & Construction',
    trades: [
      { name: 'Builder',        icon: 'construction',       iconSet: 'material', fg: '#0D7C66', bg: '#E8F5F3' },
      { name: 'Carpenter',      icon: 'hammer',             iconSet: 'ionicon',  fg: '#059669', bg: '#ECFDF5' },
      { name: 'Concreter',      icon: 'layers',             iconSet: 'ionicon',  fg: '#64748B', bg: '#F1F5F9' },
      { name: 'Bricklayer',     icon: 'view-module',        iconSet: 'material', fg: '#B45309', bg: '#FEF3C7' },
      { name: 'Demolition',     icon: 'hardware',           iconSet: 'material', fg: '#DC2626', bg: '#FEF2F2' },
      { name: 'Scaffolder',     icon: 'view-column',        iconSet: 'material', fg: '#7C3AED', bg: '#F5F3FF' },
      { name: 'Surveyor',       icon: 'straighten',         iconSet: 'material', fg: '#0369A1', bg: '#E0F2FE' },
      { name: 'Drafting / Design', icon: 'architecture',    iconSet: 'material', fg: '#4338CA', bg: '#EEF2FF' },
      { name: 'Handyman',       icon: 'build',              iconSet: 'material', fg: '#EA580C', bg: '#FFF7ED' },
      { name: 'Structural Engineer', icon: 'analytics',     iconSet: 'material', fg: '#1D4ED8', bg: '#DBEAFE' },
    ],
  },
  {
    title: 'Electrical & Solar',
    trades: [
      { name: 'Electrician',    icon: 'flash',              iconSet: 'ionicon',  fg: '#EA580C', bg: '#FFF7ED' },
      { name: 'Solar Installer', icon: 'sunny',             iconSet: 'ionicon',  fg: '#D97706', bg: '#FFFBEB' },
      { name: 'Air Conditioning / HVAC', icon: 'snow',      iconSet: 'ionicon',  fg: '#0284C7', bg: '#E0F2FE' },
      { name: 'Data & Communications', icon: 'wifi',        iconSet: 'ionicon',  fg: '#7C3AED', bg: '#F5F3FF' },
      { name: 'Security Systems', icon: 'shield-checkmark', iconSet: 'ionicon',  fg: '#059669', bg: '#ECFDF5' },
    ],
  },
  {
    title: 'Plumbing & Gas',
    trades: [
      { name: 'Plumber',        icon: 'water',              iconSet: 'ionicon',  fg: '#2563EB', bg: '#EFF6FF' },
      { name: 'Gas Fitter',     icon: 'flame',              iconSet: 'ionicon',  fg: '#DC2626', bg: '#FEF2F2' },
      { name: 'Drainage',       icon: 'water-outline',      iconSet: 'ionicon',  fg: '#0891B2', bg: '#ECFEFF' },
      { name: 'Hot Water Systems', icon: 'thermometer',     iconSet: 'ionicon',  fg: '#EA580C', bg: '#FFF7ED' },
    ],
  },
  {
    title: 'Outdoor & Landscaping',
    trades: [
      { name: 'Landscaper',     icon: 'leaf',               iconSet: 'ionicon',  fg: '#16A34A', bg: '#F0FDF4' },
      { name: 'Fencer',         icon: 'fence',              iconSet: 'material', fg: '#78716C', bg: '#F5F5F4' },
      { name: 'Pool Builder',   icon: 'pool',               iconSet: 'material', fg: '#0EA5E9', bg: '#E0F2FE' },
      { name: 'Paving',         icon: 'grid-view',          iconSet: 'material', fg: '#92400E', bg: '#FEF3C7' },
      { name: 'Irrigation',     icon: 'water-drop',         iconSet: 'material', fg: '#0284C7', bg: '#E0F2FE' },
      { name: 'Tree Services',  icon: 'park',               iconSet: 'material', fg: '#166534', bg: '#DCFCE7' },
      { name: 'Retaining Walls', icon: 'view-agenda',       iconSet: 'material', fg: '#78716C', bg: '#F5F5F4' },
    ],
  },
  {
    title: 'Interior & Finishing',
    trades: [
      { name: 'Painter',        icon: 'format-paint',       iconSet: 'material', fg: '#E11D48', bg: '#FFF1F2' },
      { name: 'Tiler',          icon: 'grid-outline',       iconSet: 'ionicon',  fg: '#57534E', bg: '#F5F5F4' },
      { name: 'Plasterer',      icon: 'layers',             iconSet: 'material', fg: '#A3A3A3', bg: '#F5F5F5' },
      { name: 'Cabinet Maker',  icon: 'kitchen',            iconSet: 'material', fg: '#92400E', bg: '#FEF3C7' },
      { name: 'Flooring',       icon: 'square',             iconSet: 'ionicon',  fg: '#78716C', bg: '#F5F5F4' },
      { name: 'Glazier',        icon: 'crop-square',        iconSet: 'material', fg: '#0EA5E9', bg: '#E0F2FE' },
      { name: 'Renderer',       icon: 'brush',              iconSet: 'material', fg: '#A3A3A3', bg: '#F5F5F5' },
      { name: 'Wallpapering',   icon: 'wallpaper',          iconSet: 'material', fg: '#DB2777', bg: '#FCE7F3' },
      { name: 'Curtains & Blinds', icon: 'blinds',          iconSet: 'material', fg: '#7C3AED', bg: '#F5F3FF' },
    ],
  },
  {
    title: 'Roofing & Exterior',
    trades: [
      { name: 'Roofer',         icon: 'home-outline',       iconSet: 'ionicon',  fg: '#D97706', bg: '#FFFBEB' },
      { name: 'Waterproofer',   icon: 'umbrella',           iconSet: 'ionicon',  fg: '#0891B2', bg: '#ECFEFF' },
      { name: 'Guttering',      icon: 'invert-colors',      iconSet: 'material', fg: '#64748B', bg: '#F1F5F9' },
      { name: 'Cladding',       icon: 'view-sidebar',       iconSet: 'material', fg: '#78716C', bg: '#F5F5F4' },
      { name: 'Insulation',     icon: 'thermostat',         iconSet: 'material', fg: '#059669', bg: '#ECFDF5' },
    ],
  },
  {
    title: 'Specialist',
    trades: [
      { name: 'Locksmith',      icon: 'key',                iconSet: 'ionicon',  fg: '#D97706', bg: '#FFFBEB' },
      { name: 'Pest Control',   icon: 'bug',                iconSet: 'ionicon',  fg: '#DC2626', bg: '#FEF2F2' },
      { name: 'Asbestos Removal', icon: 'warning',          iconSet: 'material', fg: '#DC2626', bg: '#FEF2F2' },
      { name: 'Cleaner',        icon: 'cleaning-services',  iconSet: 'material', fg: '#0EA5E9', bg: '#E0F2FE' },
      { name: 'Rubbish Removal', icon: 'delete',            iconSet: 'material', fg: '#78716C', bg: '#F5F5F4' },
      { name: 'Stonemasonry',   icon: 'diamond',            iconSet: 'ionicon',  fg: '#64748B', bg: '#F1F5F9' },
      { name: 'Welding',        icon: 'hardware',           iconSet: 'material', fg: '#EA580C', bg: '#FFF7ED' },
      { name: 'Antenna & TV',   icon: 'tv',                 iconSet: 'ionicon',  fg: '#4338CA', bg: '#EEF2FF' },
    ],
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* ───────────────────────── Component ───────────────────────── */

export default function AllTradesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [filterText, setFilterText] = useState('');

  const lowerFilter = filterText.toLowerCase();

  const filteredCategories = TRADE_CATEGORIES.map((cat) => ({
    ...cat,
    trades: cat.trades.filter((t) => t.name.toLowerCase().includes(lowerFilter)),
  })).filter((cat) => cat.trades.length > 0);

  function selectTrade(tradeName: string) {
    (global as any).__selectedTrade = tradeName;
    router.back();
  }

  function renderIcon(trade: TradeEntry) {
    if (trade.iconSet === 'ionicon') {
      return <Ionicons name={trade.icon as any} size={20} color={isDark ? colors.tint : trade.fg} />;
    }
    return <MaterialIcons name={trade.icon as any} size={20} color={isDark ? colors.tint : trade.fg} />;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: isDark ? colors.background : '#FFFFFF', borderBottomColor: isDark ? colors.border : '#E5E7EB' }]}>
        <View style={styles.headerRow}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color={isDark ? colors.text : '#1A1A2E'} />
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: isDark ? colors.text : '#1A1A2E' }]}>
            All Trades
          </ThemedText>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Search bar ── */}
        <View style={[
          styles.filterBar,
          { backgroundColor: isDark ? colors.surface : '#F5F5F0', borderColor: isDark ? colors.border : '#E5E7EB' },
        ]}>
          <MaterialIcons name="search" size={20} color={isDark ? colors.icon : '#9CA3AF'} />
          <TextInput
            style={[styles.filterInput, { color: isDark ? colors.text : '#1A1A2E' }]}
            placeholder="Search trades..."
            placeholderTextColor={isDark ? colors.icon : '#9CA3AF'}
            value={filterText}
            onChangeText={setFilterText}
            returnKeyType="done"
          />
          {filterText.length > 0 && (
            <Pressable onPress={() => setFilterText('')}>
              <MaterialIcons name="close" size={18} color={isDark ? colors.icon : '#9CA3AF'} />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Trades list ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {filteredCategories.map((category) => (
          <View key={category.title} style={styles.categorySection}>
            <ThemedText style={[styles.categoryTitle, { color: isDark ? colors.textSecondary : '#6B7280' }]}>
              {category.title.toUpperCase()}
            </ThemedText>
            <View style={[styles.categoryCard, { backgroundColor: isDark ? colors.surface : '#FFFFFF' }]}>
              {category.trades.map((trade, idx) => (
                <Pressable
                  key={trade.name}
                  style={({ pressed }) => [
                    styles.tradeRow,
                    idx < category.trades.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? colors.border : '#F3F4F6' },
                    pressed && { backgroundColor: isDark ? colors.borderLight : '#F9FAFB' },
                  ]}
                  onPress={() => selectTrade(trade.name)}
                >
                  <View style={[styles.tradeRowIcon, { backgroundColor: isDark ? colors.borderLight : trade.bg }]}>
                    {renderIcon(trade)}
                  </View>
                  <ThemedText style={[styles.tradeRowText, { color: isDark ? colors.text : '#374151' }]}>
                    {trade.name}
                  </ThemedText>
                  <MaterialIcons name="chevron-right" size={20} color={isDark ? colors.icon : '#D1D5DB'} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {filteredCategories.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="search-off" size={48} color={isDark ? colors.icon : '#D1D5DB'} />
            <ThemedText style={[styles.emptyText, { color: isDark ? colors.textSecondary : '#9CA3AF' }]}>
              No trades match "{filterText}"
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ───────────────────────── Styles ───────────────────────── */

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Header */
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  /* Filter bar */
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
    gap: 8,
  },
  filterInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },

  /* Scroll */
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },

  /* Category */
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
    paddingLeft: 4,
  },
  categoryCard: {
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 1 },
      default: {},
    }),
  },

  /* Trade row */
  tradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  tradeRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tradeRowText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },

  /* Empty state */
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
