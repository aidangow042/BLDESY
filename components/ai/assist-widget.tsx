/**
 * AI Assist launcher + floating panel — the MOBILE branch of the web's
 * `~/bldesy-web/components/ai/assist-widget.tsx`.
 *
 *   • Launcher: 56px primary → primary-dark gradient sparkle FAB, bottom-right,
 *     12px above the tab bar; lifted on the map tab and on profile screens so it
 *     clears their bottom controls; hidden on the /ai tab and while the panel is
 *     open.
 *   • Panel: the web's floating bubble card — inset 12px from both sides,
 *     bottom-anchored, `min(75% of the viewport, 600)` tall, rounded-3xl, slides
 *     up and fades in. Holds the panel-variant ChatHeader plus the shared thread
 *     when signed in, otherwise the SignInGate. Closes on any navigation.
 *
 * Mounted by AppShell so every screen using the shell gets it. The overlays are
 * absolutely positioned inside the screen (never a Modal) so the header and the
 * tab bar stay live underneath, exactly as on the web.
 */
import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter, useSegments } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TAB_BAR_HEIGHT, useGlobalTabBar } from '@/hooks/use-global-tab-bar';
import { useUser } from '@/lib/auth-context';
import { ROUTES } from '@/lib/routes';
import { ChatHeader } from './chat-header';
import { useChat } from './chat-provider';
import { ChatThread } from './chat-thread';
import { SignInGate } from './sign-in-gate';

const FAB_SIZE = 56;
/** Web: `bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)]` — 0.75rem above the bar. */
const EDGE_GAP = Spacing.md;
/** Web lifts: map `+7.5rem` (zoom stack / sheet), profiles `+5rem` (sticky Send Message bar). */
const MAP_LIFT = 120;
const PROFILE_LIFT = 80;
/** Web: `h-[min(75dvh,600px)]`. */
const PANEL_MAX_HEIGHT = 600;
const PANEL_MIN_HEIGHT = 240;

interface AiAssistWidgetProps {
  /** Suppress the launcher entirely (the /ai tab passes this through AppShell). */
  hidden?: boolean;
}

export function AiAssistWidget({ hidden = false }: AiAssistWidgetProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments() as string[];
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const isFocused = useIsFocused();
  const { visible: tabBarVisible, contentBottomInset } = useGlobalTabBar();
  const { authedUser, loading: authLoading } = useUser();
  const { messages, clear, panelOpen, openPanel, closePanel } = useChat();
  const [layerHeight, setLayerHeight] = useState(0);
  const keyboardHeight = useKeyboardHeight(panelOpen && isFocused);

  const onAiPage = segments.includes('ai');
  const onMapPage = segments.includes('map');
  const onProfilePage =
    pathname.startsWith('/builder-profile') ||
    pathname.startsWith('/builder/') ||
    pathname.startsWith('/company/');

  // Close on any navigation — covers expand, builder-card taps and drawer links.
  const lastPathname = useRef(pathname);
  useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    closePanel();
  }, [pathname, closePanel]);

  if (hidden || onAiPage) return null;

  const lift = onMapPage ? MAP_LIFT : onProfilePage ? PROFILE_LIFT : 0;
  const fabBottom = EDGE_GAP + contentBottomInset + lift;

  // iOS keyboards overlay the screen (Android resizes it instead): lift the card
  // by the part of the keyboard that intrudes past the tab bar into this screen.
  const keyboardOverlap = Math.max(
    0,
    keyboardHeight - (tabBarVisible ? TAB_BAR_HEIGHT + insets.bottom : 0),
  );
  const panelBottom = Math.max(EDGE_GAP + contentBottomInset, keyboardOverlap + EDGE_GAP);
  const preferredHeight = Math.min(windowHeight * 0.75, PANEL_MAX_HEIGHT);
  const roomAbove = layerHeight > 0 ? layerHeight - panelBottom - EDGE_GAP : preferredHeight;
  const panelHeight = Math.max(PANEL_MIN_HEIGHT, Math.min(preferredHeight, roomAbove));

  function handleClose() {
    Keyboard.dismiss();
    closePanel();
  }

  function handleExpand() {
    Keyboard.dismiss();
    router.navigate(ROUTES.ai);
  }

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
      onLayout={(e) => setLayerHeight(e.nativeEvent.layout.height)}
    >
      {!panelOpen ? (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(120)}
          style={[styles.fabWrap, Shadows.lg, { bottom: fabBottom, backgroundColor: c.primary }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ask AI Assist"
            onPress={openPanel}
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          >
            <LinearGradient
              colors={[c.primary, c.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name="sparkles" size={24} color="#ffffff" />
          </Pressable>
        </Animated.View>
      ) : null}

      {panelOpen && isFocused ? (
        <Animated.View
          entering={FadeInDown.duration(250)}
          exiting={FadeOutDown.duration(180)}
          accessibilityViewIsModal
          accessibilityLabel="AI Assist chat"
          style={[
            styles.panelShadow,
            Shadows['2xl'],
            { bottom: panelBottom, height: panelHeight, backgroundColor: c.canvas },
          ]}
        >
          <View style={[styles.panel, { backgroundColor: c.canvas, borderColor: c.border + '80' }]}>
            <ChatHeader
              variant="panel"
              hasMessages={messages.length > 0}
              onClear={clear}
              onExpand={handleExpand}
              onClose={handleClose}
            />
            {authedUser || authLoading ? (
              <ChatThread />
            ) : (
              <View style={styles.gate}>
                <SignInGate />
              </View>
            )}
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** iOS keyboard height while `active` (Android resizes the window instead). */
function useKeyboardHeight(active: boolean): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (!active || Platform.OS !== 'ios') return;
    const show = Keyboard.addListener('keyboardWillShow', (e) =>
      setHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener('keyboardWillHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
      setHeight(0);
    };
  }, [active]);
  return height;
}

const styles = StyleSheet.create({
  fabWrap: {
    position: 'absolute',
    right: Spacing.lg,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPressed: {
    transform: [{ scale: 0.96 }],
  },
  panelShadow: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    borderRadius: Radius['2xl'],
  },
  panel: {
    flex: 1,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    overflow: 'hidden',
  },
  gate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
});
