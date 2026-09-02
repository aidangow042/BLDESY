/**
 * Pagination — ~/bldesy-web/components/search/pagination.tsx: Previous / a
 * current ± 2 window / Next. Hidden with a single page.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { pageNumbers } from '@/components/search/search-params';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPage: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPage }: PaginationProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  if (totalPages <= 1) return null;

  const pages = pageNumbers(currentPage, totalPages);

  return (
    <View accessibilityRole="toolbar" accessibilityLabel="Pagination" style={styles.nav}>
      <Pressable
        accessibilityRole="button"
        disabled={currentPage <= 1}
        onPress={() => onPage(currentPage - 1)}
        style={[styles.btn, styles.edge, { borderColor: c.border }, currentPage <= 1 && styles.disabled]}
      >
        <Text style={[styles.btnText, { color: c.textSecondary }]}>Previous</Text>
      </Pressable>

      {pages.map((page) => {
        const active = page === currentPage;
        return (
          <Pressable
            key={page}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onPage(page)}
            style={[
              styles.btn,
              active ? { backgroundColor: c.primary } : { borderWidth: 1, borderColor: c.border },
            ]}
          >
            <Text style={[styles.btnText, { color: active ? '#fff' : c.textSecondary }]}>{page}</Text>
          </Pressable>
        );
      })}

      <Pressable
        accessibilityRole="button"
        disabled={currentPage >= totalPages}
        onPress={() => onPage(currentPage + 1)}
        style={[styles.btn, styles.edge, { borderColor: c.border }, currentPage >= totalPages && styles.disabled]}
      >
        <Text style={[styles.btnText, { color: c.textSecondary }]}>Next</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: Spacing['3xl'],
  },
  btn: {
    height: 44,
    minWidth: 44,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  edge: {
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.4,
  },
  btnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
  },
});
