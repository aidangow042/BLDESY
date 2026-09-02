# BLDESY mobile app

The native twin of the BLDESY website (`~/bldesy-web`) for iOS and Android — Expo SDK 54, expo-router 6, React Native 0.81, TypeScript.

- **Conventions and rules:** `CLAUDE.md` (read first). The website is the source of truth; pure logic is mirrored into `lib/web/` by `npm run sync:web`.
- **Run:** `npx expo start` (dev build required for Apple auth, Stripe and maps — Expo Go is not enough). Env in `.env` (see `.env.example`).
- **Check:** `npm run typecheck` · `npm test` · `npm run lint` · `npm run sync:web:check`.
- **Build:** `eas build -p ios --profile preview` (TestFlight: `--profile production`).
- **App Store:** `docs/APP-REVIEW-NOTES.md`, `docs/APP-STORE-SUBMISSION-CHECKLIST.md`.
