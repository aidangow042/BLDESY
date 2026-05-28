/**
 * Sheet — bottom-anchored modal panel. Use for confirm dialogs, picker lists,
 * filter sheets. For a top-right anchored dropdown (hamburger menu), use
 * `components/layout/hamburger-menu.tsx` instead.
 *
 * Uses React Native's `Modal` API + Reanimated entering/exiting for animation.
 */

import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Tap-outside dismisses. Default true. */
  dismissable?: boolean;
}

export function Sheet({ visible, onClose, children, dismissable = true }: SheetProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(140)}
          style={styles.backdrop}
        >
          {dismissable ? (
            <Pressable
              accessibilityLabel="Close"
              onPress={onClose}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
        </Animated.View>
        <Animated.View
          entering={SlideInDown.duration(220)}
          exiting={SlideOutDown.duration(180)}
          style={[
            styles.panel,
            Shadows['2xl'],
            {
              backgroundColor: c.surface,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: c.border }]} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  panel: {
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.md,
  },
});
