# BLDESY — App Review Notes

> Paste the relevant parts into **App Store Connect → your version → App Review Information → Notes**, and fill in the demo-account credentials in the "Sign-In Information" fields. Replace every `<<…>>` placeholder before submitting.

## What BLDESY is
BLDESY is an Australian trade marketplace — a pure *connector* between homeowners/businesses ("customers") and licensed tradies ("builders"). Customers search by trade, suburb and urgency, browse verified builder profiles, post jobs, message, and leave reviews — all **free**. Builders pay a flat subscription (handled on our website — see *Payments* below). There is no quote bidding and no pay-to-win ranking.

## Demo accounts
Please use these to review the full experience.

**Customer (default experience)**
- Email: `<<demo-customer@bldesy.com.au>>`
- Password: `<<password>>`
- Can: search, browse builder profiles, post a job, message, save tradies, use AI Assist, report/block.

**Builder (approved + subscribed)**
- Email: `<<demo-builder@bldesy.com.au>>`
- Password: `<<password>>`
- This account is **already approved and has an active subscription**, so you can see the full Builder Portal and apply to jobs without needing to purchase anything in the app (see *Payments*).
- Open the **Builder Portal** from the **hamburger menu (top-left) → "Builder Portal"**.

> Setup reminder for us before submitting: both accounts must have **confirmed emails**; the builder account must be **approved** (set in our backend) and have an **active subscription** (set up on the website), because subscriptions are not sold in the app.

## Key flows to try
1. **Customer:** Home → search a trade + suburb → open a builder profile → Post a Job → (as the builder) apply → (as the customer, My Jobs) accept → leave a review after the job.
2. **AI Assist** (bottom tab): ask "find a plumber near me" or "help me describe my renovation".
3. **Map** (bottom tab): interactive map of nearby tradies with service-radius circles.
4. **Builder Portal** (hamburger → Builder Portal, builder account): dashboard, job feed, applications, profile editor.

## Feature explanations
- **AI Assist & "write it for me":** Powered by Anthropic's Claude API (server-side). On first use we show a disclosure and ask the user to **consent** to their text being sent to a third-party AI provider. AI responses are labelled **"✦ AI-generated"** and each has a **Report** option.
- **Verification badges:** ABN/licence/insurance indicators reflect checks against Australian registers; they are informational, not guarantees.
- **Customer ⇄ Builder:** One account can be a customer and/or a builder. The customer app is the default; the **Builder Portal** is opened from the hamburger menu. There is **no password re-entry** to switch.
- **Moderation (Guideline 1.2):** Every builder profile, review, job post, chat message and AI response has a **Report** control (flag icon / long-press on a chat message). Users can **Block** another user from a profile, a chat, or **Settings → Blocked users** — blocking hides their content and prevents them messaging you. Submitted text is filtered server-side before it goes live. Reported content is reviewed by our team; objectionable users can be banned.
- **Account deletion (Guideline 5.1.1(v)):** **Settings → Delete account** — self-service, in-app, permanent (requires password + typing DELETE). Available to both customer and builder accounts.

## Payments (Guideline 3.1.1)
**No subscriptions, unlocks, or paid features are sold inside the iOS app.** Builder subscriptions are handled entirely on our website. The app contains no in-app purchase, no Stripe checkout, and no buttons/links directing users to an external purchase page. Where a feature requires an active subscription (e.g. a builder applying to a job), the app shows a plain "subscription required" message with **no** purchase button or link. The demo builder account is pre-subscribed so you can review those features.

## Permissions (requested at point of use)
- **Location** — when opening the Map tab or using location in search/job posting.
- **Photo library** — when adding a profile/cover/job photo.
- **Notifications** — only when the user turns on "Push notifications" in **Settings** (not on launch).

## Sign in with Apple
Offered on the Login and Sign-up screens (alongside email/password) on iOS.

## Support
hello@bldesy.com.au (also in-app: Help & Support, and the Legal screen).
