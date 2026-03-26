# BLDESY!

> Find your tradie. Fast.

A smart trade connection platform for the Australian market. Pure connector — no quote bidding, no pay-to-win rankings. Customers find tradies by trade, location, urgency, and verified credentials. Builders pay a flat subscription to be listed.

## Business model
- **Builders pay**: flat monthly subscription (tiered — visibility + features)
- **Customers free**: search, browse, post jobs, leave reviews — no cost
- **No commission, no per-lead fees** — this is our key differentiator vs Hipages
- **Phase 4**: Stripe integration for automated payments + subscription management
- **Phase 5**: TestFlight beta → App Store submission → initial marketing push

## Tech stack
- **Frontend**: React Native + Expo + TypeScript + Expo Router
- **Backend**: Supabase (Edge Functions, Row Level Security)
- **Database**: PostgreSQL (via Supabase, Sydney-region deployment)
- **AI**: Claude AI via server-side Edge Functions (chat, job classification, description generation, builder recommendations)
- **Maps**: React Native Maps with service radius visualisation
- **Animations**: Reanimated
- **Auth**: Supabase Auth with server-side verification
- **Suburbs**: Bundled database of 16,000+ AU suburbs for instant geocoding
- **Cross-platform**: Single codebase → iOS, Android, web

## Current status (March 2026)
MVP stage — all core features built and functional:
- Full customer flow (search, browse, save, post jobs, manage applications)
- Full builder flow (onboarding, profile editor, job feed, applications, dashboard)
- AI Assist with builder recommendations
- Interactive tradie map
- Security hardening (RLS, auth, rate limiting, input validation)
- Premium visual design with consistent typography and animations
- NO website yet (needs building)
- NO ABN registered yet
- NO business email yet
- NO Stripe payments yet

## How the app works
Customer searches → Browse profiles → Post a job → Builder applies → Customer accepts → Leave a review

### Customer features
- Search by trade, suburb/postcode, and urgency
- Browse verified builder profiles (photos, reviews, credentials)
- Post a job and receive applications from matched builders
- Save favourite tradies for future reference
- AI assistant to describe jobs and find the right trade
- Interactive map showing nearby tradies and service areas
- Guest browsing (account required only to post, contact, or save)

### Builder features
- Rich profiles: photos, projects, team, FAQs, credentials
- Browse and apply to matching jobs
- Dashboard with analytics and job management
- Verified badges (ABN, licence, insurance)
- AI-powered job suggestions and description writing

## Key features
- Smart Search: multi-trade search, 16,000+ AU suburb auto-suggest, urgency filters, keyword matching
- AI Assist: Claude AI for job descriptions, trade suggestions, builder recommendations
- Interactive Map: nearby tradies, service radius visualisation, trade filters
- Builder Profiles: project galleries, before/after photos, team, FAQs, credentials, reviews, availability
- Job Posting: step-by-step wizard, AI descriptions, photo/document attachments, trade auto-detection
- Builder Dashboard: metrics, job feed, application management, profile editor
- Saved Tradies: bookmarks with photo carousels and star ratings

## Competitors
| Platform | Their model | Our advantage |
|----------|------------|---------------|
| Hipages | Pay-per-lead, bidding wars | Flat subscription, no race to bottom |
| Airtasker | Odd jobs focus | Purpose-built for licensed trades, verified credentials |
| Google Search | Unstructured links | Structured profiles, verified reviews, AI matching |
| ServiceSeeking | Lead-based | Flat fee, better UX |
| Word of mouth | Limited reach | Searchable by trade + location + urgency, see credentials |

## Brand voice
- Aussie, straightforward, trustworthy
- No corporate jargon — talk like a mate who knows what they're doing
- Confident but not cocky
- Tagline: "Find your tradie. Fast."

## SEO priorities (for website when built)
- Target keywords: "find a builder", "hire a tradie", "[trade] near me", "[trade] [city]"
- Location + trade landing pages (e.g., "plumber in Taree", "electrician in Newcastle")
- Blog content: "how to find a reliable [trade]", "questions to ask before hiring a tradie"
- JSON-LD LocalBusiness schema on builder profiles
- App Store Optimisation for iOS and Android listings

## Market
- AU construction industry: ~$173B (2026)
- 380,000+ trade businesses in Australia
- 50+ trade categories supported
- Launch area: NSW (specific cities TBD)

## Security
- Row Level Security on all Supabase tables
- Server-side auth verification
- Rate limiting on all API endpoints
- Input validation
- Security score: 8/10

## Coding standards
- TypeScript for all code
- Follow existing project patterns and file structure
- Use Expo Router for navigation
- Use Supabase client for all database operations
- Edge Functions for server-side logic (especially AI calls)
- Keep components modular and reusable
- Aussie English in all user-facing copy (favour, colour, organised, etc.)

## Marketing strategy

### Launch phases
1. **Foundation (Week 1-2)**: Register ABN (abr.gov.au, free), register business name via ASIC ($42/yr), buy bldesy.com.au domain, set up business email (hello@bldesy.com.au), deploy landing page/website
2. **Technical SEO (Week 3-4)**: JSON-LD schema on all pages, dynamic meta tags for [trade]+[city] combos, XML sitemap automation, IndexNow for instant indexing, PageSpeed audit + fixes, GA4 + GSC setup
3. **Content + Local SEO (Week 5-6)**: Location+trade landing pages ("plumber in Taree"), blog posts targeting long-tail keywords, social media profiles (Facebook, Instagram), builder outreach to sign up first tradies, local directory submissions (Yellow Pages, True Local, StartLocal)
4. **Growth + Automation (Week 7-8)**: Rank tracking (SerpBear), Google Ads experiments ($5-10/day), App Store optimisation, email drip sequences for builder onboarding, competitor monitoring

### SEO keyword targets
- Primary: "find a builder", "hire a tradie", "find a [trade]", "[trade] near me"
- Location: "[trade] in [city]" for all target cities (Taree, Newcastle, Sydney, Port Macquarie, Coffs Harbour)
- Long-tail: "how to find a reliable builder", "questions to ask a tradie before hiring", "how much does a [trade] cost in [city]"
- App Store: "tradie app australia", "find tradies near me", "builder search app"

### Content plan
- 2-3 blog posts per week targeting "[trade] in [city]" and "how to" patterns
- Each post: 800-1500 words, unique meta title (<60 chars) + description (<155 chars), internal links to relevant service area pages, CTA to app download or builder signup
- Social: before/after project photos, featured builder spotlights, homeowner tips

### Builder acquisition strategy
- Direct outreach to local tradies (email, phone, in-person)
- Facebook groups for local tradies and builders
- Referral incentives (first month free for referring another builder)
- Free listing tier to reduce signup friction, upsell to paid tiers

### Competitors' weaknesses to exploit
- Hipages: expensive per-lead model, builders hate bidding wars, low-quality leads
- Airtasker: not built for licensed trades, no credential verification
- ServiceSeeking: dated UX, lead-based pricing
- All of them: no AI-powered matching, no flat subscription option

## Claude tools deployment

### Claude Code (terminal) — dev + technical SEO
- Technical SEO automation: schema markup, meta tags, sitemap generation, IndexNow hooks
- Bulk PageSpeed audit pipeline using free Google PSI API key
- Keyword rank tracking scripts via SerpBear API
- Custom commands: /seo-audit, /blog-brief, /meta-tags, /competitor-check

### Claude Cowork (desktop) — content + research
- Weekly SEO performance reports (scheduled, auto-generated)
- Content calendar creation from keyword data
- Blog post production from content briefs
- Competitor analysis deep-dives via Chrome browsing
- Builder outreach email sequence drafting
- App Store listing optimisation (3 A/B test variants)

### MCP servers to connect
- **Google Search Console**: live keyword/click/impression data (free, via mcp-gsc)
- **Google Analytics (GA4)**: traffic + conversion data (free, via Composio or Windsor)
- **GitHub**: PR reviews, issue management, @claude mentions
- **Google Drive**: marketing assets, content briefs, tracking sheets
- **Slack**: weekly report posting, rank drop alerts (if using Slack)

### Free API keys to set up
- **Google Search Console API**: free — keyword rankings, clicks, impressions, URL inspection
- **Google PageSpeed Insights API**: free — Lighthouse scores, Core Web Vitals per URL
- **Google Analytics Data API (GA4)**: free — sessions, conversions, traffic sources
- **Google Ads API (Keyword Planner)**: free with Ads account — search volumes, CPC data
- **IndexNow API**: free — instant URL submission to Bing/Yandex on deploy
- **SerpBear**: free (self-hosted) — daily keyword rank tracking with built-in SERP API
- All keys stored as environment variables, never hardcoded

### Scheduled automations
- Weekly: SEO performance report (Monday 6am via Claude Code /schedule)
- Weekly: rank tracking check + Slack alert on drops >5 positions
- On deploy: IndexNow ping for new/changed URLs
- On deploy: sitemap regeneration

## What NOT to do
- Never expose API keys or secrets in client-side code
- Never bypass Row Level Security
- Never use pay-per-lead or commission language — we are flat subscription only
- Never make the app feel corporate or generic — keep the Aussie character
- Don't over-engineer — we're MVP stage, ship fast and iterate
- Never write content that sounds like generic AI — keep the Aussie voice
- Never target keywords outside our trade categories or service areas
