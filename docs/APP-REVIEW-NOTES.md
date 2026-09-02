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
- This account is **already approved and has an active subscription**, so you can see the full Tradie Portal and apply to jobs without needing to purchase anything in the app (see *Payments*).
- Open the **Tradie Portal** from the **hamburger menu (☰, top-left) → the pinned "Tradie Portal" button** at the top of the drawer.

> Setup reminder for us before submitting: both accounts must have **confirmed emails**; the builder account must be **approved** (set in our backend) and have an **active subscription** (set up on the website), because subscriptions are not sold in the app.

## Key flows to try
1. **Customer:** Home → search a trade + suburb → open a builder profile → Post a Job → (as the builder) apply → (as the customer, My Jobs) accept → leave a review after the job.
2. **AI Assist** (bottom tab): ask "find a plumber near me" or "help me describe my renovation".
3. **Map** (bottom tab): interactive map of nearby tradies with service-radius circles.
4. **Tradie Portal** (☰ → Tradie Portal, builder account): dashboard with profile status, Home Jobs feed, applications, edit profile, availability, profile visibility, Refer & Earn, analytics, billing (read-only on iOS), settings, messages.

## Feature explanations
- **AI Assist & "write it for me":** Powered by Anthropic's Claude API (server-side). On first use we show a disclosure and ask the user to **consent** to their text being sent to a third-party AI provider. AI responses are labelled **"✦ AI-generated"** and each has a **Report** option.
- **Verification badges:** ABN/licence/insurance indicators reflect checks against Australian registers; they are informational, not guarantees.
- **Customer ⇄ Builder:** One account can be a customer and/or a builder. The customer app is the default; the **Tradie Portal** is opened from the hamburger menu. There is **no password re-entry** to switch.
- **Moderation (Guideline 1.2):** Every builder profile, review, job post, chat message and AI response has a **Report** control (flag icon / long-press on a chat message). Users can **Block** another user from a profile, a chat, or **Settings → Blocked users** — blocking hides their content and prevents them messaging you. Submitted text is filtered server-side before it goes live. Reported content is reviewed by our team; objectionable users can be banned.
- **Account deletion (Guideline 5.1.1(v)):** **Settings → Delete account** — self-service, in-app, permanent (requires password + typing DELETE). Available to both customer and builder accounts.

## Payments (Guideline 3.1.1)
**No subscriptions, unlocks, or paid features are sold inside the iOS app.** Tradie billing is handled entirely on our website (tradies are free until three homeowners contact them; a card is added on the website after verification). The iOS app contains no in-app purchase, no Stripe checkout, no prices for our plans, and no buttons or links directing users to an external purchase page. The Billing screen in the Tradie Portal is read-only on iOS: it shows the current plan state, enquiry meter, invoices and lets a tradie cancel or resume, with the text "Manage your card on the web at bldesy.com.au" (plain text, not a link). The demo builder account is already verified and live so you can review every tradie feature without paying anything.

## Permissions (requested at point of use)
- **Location** — when opening the Map tab or using location in search/job posting.
- **Photo library** — when adding a profile/cover/job photo.
- **Notifications** — only when the user turns on "Push notifications" in **Settings** (not on launch).

## Sign in
Email **or Australian mobile** + password, or a one-time SMS code (phone tab). Sign in with Apple and Google are offered on the Login and Sign-up screens. Tradie onboarding (licence, ABN, White Card, photo-ID and insurance verification) is completed on our website, opened inside the app in a secure browser sheet already signed in; the app itself never collects identity documents.

## Support
hello@bldesy.com.au (also in-app: Help & Support, and the Legal screen).
