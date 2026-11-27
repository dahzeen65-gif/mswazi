# MSWAZI (`mswazi1`)

A neighbourhood-based multi-vendor marketplace connecting independent vendor stalls, shoppers, invite-only trusted riders, and live map tracking.

## Project Layout
- `index.html` — Pre-login public landing page
- `pages/` — Auth, stalls discovery, vendor mini-storefront, product details, cart, checkout, orders, profile, and vendor/rider/admin dashboards
- `css/` — Base tokens, components, responsive rules, and role stylesheets
- `js/` — Supabase client, auth/mode switcher, area activation, stalls, products, cart, checkout, payments, orders, delivery, admin, and live Leaflet + Realtime map
- `supabase/` — PostgreSQL schema (`schema.sql`), Row Level Security (`policies.sql`), and starter seed data (`seed.sql`)

## Quick Setup
1. Create a project in Supabase and run `supabase/schema.sql`, `supabase/policies.sql`, and `supabase/seed.sql` in the SQL Editor.
2. Enable Realtime on `vendors`, `deliveries`, and `rider_locations` under **Database -> Publications -> supabase_realtime**.
3. Update `supabaseUrl` and `supabaseAnonKey` in `js/config.js`.
4. Serve `mswazi1` with a local static server (for example `npx serve mswazi1` or VS Code Live Server).