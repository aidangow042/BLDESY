/**
 * Toast + ToastProvider — non-blocking transient notifications. Replaces
 * `Alert.alert(...)` calls used today for success/error feedback. Web has no
 * direct equivalent (it uses inline form errors + redirects), so this is
 * pragmatic-RN.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.show('Saved', { variant: 'success' });
 *
 * Wrap your tree once with <ToastProvider> in `app/_layout.tsx`.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutDown,
  Layout,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type ToastVariant = 'default' | 'success' | 'error' | 'warning';

export interface ToastOptions {
  variant?: ToastVariant;
  /** Auto-dismiss after this many ms (defaults to 3000). */
  duration?: number;
}

interface ToastEntry {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  show: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>.');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [items, setItems] = useState<ToastEntry[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, options?: ToastOptions) => {
      const id = ++idRef.current;
      const variant = options?.variant ?? 'default';
      const duration = options?.duration ?? 3000;
      setItems((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show }), [show]);

  function variantStyle(v: ToastVariant) {
    switch (v) {
      case 'success':  return { bg: c.success, fg: '#fff' };
      case 'error':    return { bg: c.error,   fg: '#fff' };
      case 'warning':  return { bg: c.warning, fg: '#fff' };
      default:         return { bg: c.textPrimary, fg: '#fff' };
    }
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View
        pointerEvents="box-none"
        style={[
          styles.stack,
          { bottom: insets.bottom + 80 }, // above bottom tab bar
        ]}
      >
        {items.map((t) => {
          const { bg, fg } = variantStyle(t.variant);
          return (
            <Animated.View
              key={t.id}
              entering={FadeInDown.duration(200)}
              exiting={FadeOutDown.duration(160)}
              layout={Layout.duration(180)}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={[styles.toast, Shadows.lg, { backgroundColor: bg }]}
            >
              <Text style={[styles.label, { color: fg }]}>{t.message}</Text>
            </Animated.View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  toast: {
    minWidth: 200,
    maxWidth: '100%',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
  },
  label: {
    fontSize: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    textAlign: 'center',
  },
});
