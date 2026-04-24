# RootRecord Website — PRD

## Original problem statement
> "I've provided a copy of our website. I would like to completely modernize it."
> User follow-up: "Just do what you think is best. I just want a professional website."

## Product
RootRecord — maker of local-first Windows desktop software (Business Manager, Weather Manager). The site sells the software, hosts account sign-in for the rootrecord.info license worker, and publishes Terms/Privacy for compliance.

## Architecture (unchanged from original repo — required for Cloudflare Pages deploy)
- **Static HTML + CSS** deployed via Cloudflare Pages (`wrangler.toml`, `package.json`, `functions/api/site-config.ts`)
- **Account portal (`account.html` + `account.js`)** calls the separate `rootrecord-license` Cloudflare Worker via `apiBase` returned from `/api/site-config`
- **Preview environment** here: minimal FastAPI stub at `/app/backend`, `serve` static server at `/app/frontend` serving files from `/app/` on port 3000

## What was done (2026-04-24 — modernization sprint)
- Complete visual redesign using a new design system in `styles.css`:
  - **Typography**: Fraunces (variable serif display with italic accents) + Geist (sans body) + JetBrains Mono (metadata/kickers)
  - **Palette**: warm cream paper `#F5EFE4`, deep forest green `#1F3B2E`, ink `#0E1A14`, sand + moss-glow accents, subtle grain texture overlay
  - **Components**: pill buttons, glass-blur sticky header, mocked app-window hero illustration with animated KPI bars, feature cards with radial-glow hover, pricing cards (featured plan in dark), dark `cta-band`, 4-column dark footer, FAQ accordion-style items, editorial long-form prose for legal pages
- All 11 pages rewritten with new structure & shared header/footer: `index.html`, `products.html`, `pricing.html`, `about.html`, `faq.html`, `contact.html`, `privacy.html`, `terms.html`, `account.html`, `rootrecord-business-manager.html`, `rootrecord-weather-manager.html`
- **Preserved all `account.js` selectors** (status, panel-loading, panel-forms, panel-account, form-login, login-email, login-password, form-signup, signup-email, signup-password, account-details, billing-intro, billing-unavailable, billing-actions, billing-email, btn-billing, btn-logout) so production license-worker integration is untouched
- Preserved all external URLs (GitHub releases, Discord invite, X, rootrecord.info/billing, /auth/signup, etc.)
- Mobile nav toggle + responsive breakpoints at 880/760/640
- `prefers-reduced-motion` respected

## What's intentionally unchanged
- `account.js`, `functions/api/site-config.ts`, `wrangler.toml`, `tsconfig.json`, root `package.json` — so `wrangler pages deploy .` still works identically

## P0 / P1 / P2 backlog
- **P1**: Add Open Graph images and favicon set (site currently has no favicon)
- **P1**: Add real screenshots of the two apps to replace the hero illustration on product pages
- **P2**: Dark mode toggle (palette is ready)
- **P2**: Blog / changelog section tied to GitHub releases
- **P2**: Schema.org SoftwareApplication markup for SEO
- **P2**: Lifetime-plan "what's included" comparison table

## Next action items
1. Deploy to Cloudflare Pages (`npx wrangler pages deploy .`) and verify `/api/site-config` returns the production `ROOTRECORD_API_BASE`
2. Add a 32px/180px favicon + apple-touch-icon in `/public`
3. Plug in real app screenshots when available

## Personas
- **Independent operator (primary)** — runs a small shop, wants real books, distrusts SaaS lock-in
- **Hazard-aware homeowner / site operator (secondary)** — wants weather/alert clarity without tab overload
- **Returning RootRecord user** — comes to the site to sign in, see plan status, manage billing
