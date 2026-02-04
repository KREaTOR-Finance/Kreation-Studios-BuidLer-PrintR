# Website Foundation Review (v20)

## What the website is today
- Gateway to PrintR (premier game)
- Credible “studio” shell: catalog, about, support, developers
- Leads capture for developer slots (no email dependency)
- Ops: admin review page (token-protected) so you don’t need Supabase UI

## What this enables later
- Multiple games with consistent landing pages (data-driven catalog)
- Studio partnerships, press kit, waitlist, and merch storefront
- Community hub + creator profiles
- Onboarding funnel from X → site → Telegram → PrintR

## Foundation upgrades included
1) Content-driven catalog (`src/content/gamesCatalog.ts`) so adding games doesn’t require reworking page layouts.
2) SEO component (`components/site/Seo.tsx`) for page titles + descriptions + canonical links.
3) ErrorBoundary wrapper so site doesn’t white-screen on runtime errors.
4) 404 route (`/404`) and cleaner routing.
5) Admin ops page (`/admin/leads`) — view incoming developer leads using backend ADMIN_TOKEN.
6) Accessibility: skip-to-content link, semantic <main>, consistent container.

## Next “polish” upgrades (optional)
- Real icons + favicons + OpenGraph image
- Animations: subtle hover/press micro interactions
- Newsletter / waitlist capture (Supabase table)
- Content CMS: MDX or lightweight JSON + assets
- Press kit route: /press (logos, screenshots, copy blocks)
