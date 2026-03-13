# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Start Expo dev server
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
npm run web        # Run web version
npm run lint       # Run ESLint
```

No test runner is configured yet.

## Architecture

This is a **React Native / Expo** app (managed workflow) called "BLDESY!" — a builder/marketplace platform. It uses the **new architecture** and **React Compiler**.

### Routing

Uses **Expo Router** (file-based routing). All screens live in [app/](app/):
- `app/_layout.tsx` — Root Stack navigator + theme provider
- `app/(tabs)/_layout.tsx` — Bottom tab navigator (Home, AI Assist, Saved, Portal)
- Tabs use `href: null` to hide screens from the tab bar (see Explore tab)

Path alias `@/*` maps to the project root (configured in [tsconfig.json](tsconfig.json)).

### Theming

- Light/dark mode via `useColorScheme()` (system preference)
- Colors defined in [constants/theme.ts](constants/theme.ts)
- `useThemeColor` hook ([hooks/use-theme-color.ts](hooks/use-theme-color.ts)) resolves the right color per mode
- `ThemedText` and `ThemedView` are the standard themed wrappers

### Component Conventions

- Platform-specific files use `.ios.ts` or `.web.ts` suffixes (e.g., `icon-symbol.ios.tsx`)
- Animations use `react-native-reanimated`
- Icons use Expo's `IconSymbol` component (SF Symbols on iOS)
- Haptic feedback on tab presses via `HapticTab` component
- Styling uses `StyleSheet.create()` — no CSS framework

### Key Files

| File | Purpose |
|---|---|
| [app/(tabs)/index.tsx](app/(tabs)/index.tsx) | Home screen |
| [app/(tabs)/ai.tsx](app/(tabs)/ai.tsx) | AI Assist tab |
| [app/(tabs)/portal.tsx](app/(tabs)/portal.tsx) | Builder Portal |
| [app/(tabs)/saved.tsx](app/(tabs)/saved.tsx) | Saved tab |
| [constants/theme.ts](constants/theme.ts) | Color palette (light/dark) |
| [app.json](app.json) | Expo config (bundle ID, permissions, plugins) |
