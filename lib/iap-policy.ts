import { Platform } from 'react-native';

/**
 * In-app purchase policy.
 *
 * Apple App Store Guideline 3.1.1 forbids selling digital goods/subscriptions
 * by any mechanism other than Apple's In-App Purchase, and forbids buttons or
 * links that send users to an external (web) purchase flow for digital goods.
 *
 * For v1 we do NOT implement Apple IAP, so the iOS app must sell nothing and
 * must not link to a web purchase. We therefore hide ALL purchase / pricing /
 * subscribe UI on iOS. Android and web keep the existing Stripe flow.
 *
 * Use this flag to gate any UI that displays prices, initiates a purchase, or
 * routes to a purchase/pricing screen.
 */
export const CAN_SELL_IN_APP = Platform.OS !== 'ios';
