## Release Readiness Review — বই ঘর (Nexboi)

I went through the project end-to-end. Overall it builds clean and the major user flows (auth, book detail, reader, payments, admin, ads, ratings, file uploads, blocking, in-app-browser gate) are in place. Below is what's solid, what should be fixed before market release, and what's optional polish.

### What's already good
- Build passes with no errors, dark theme + Bengali UI consistent.
- PWA manifest, theme-color, OG/Twitter tags, robots.txt, sitemap.xml present.
- Auth (email + Google via Firebase with Supabase OAuth fallback), RLS-backed tables, role table for admin, blocked-user gate.
- Route code-splitting + stale-chunk auto-reload, idle pre-warm of hot routes.
- Payments: phone+amount matching webhook, 24h auto-purge of rejected orders, sensitive-SMS filter, bKash admin password gate.
- Reader: ad-unlock + banner ad with navbar-aware show/hide, per-book ad block toggle.
- Ratings: one-per-buyer, replaces demo rating on cards.

### Must-fix before release
1. **Sitemap hostname is wrong.** `public/sitemap.xml` and `robots.txt` point to `nexboi.lovable.app`, but your live site is the Vercel domain (`project-6f351393-...vercel.app` per deep-link doc). Update both to the real production domain (or whatever final domain you'll use) so Google indexes correctly.
2. **Supabase linter warnings (4).** Tighten so signed-in/anon users can't call SECURITY DEFINER functions directly, and replace `USING (true)` / `WITH CHECK (true)` on the flagged write policy with a scoped expression. (Functions affected: `record_part_view`, `has_role`, `handle_new_user`, `update_updated_at_column` — revoke EXECUTE from `anon`/`authenticated` where they shouldn't call it directly.)
3. **Run the security scanner once** (`security--run_security_scan`) and clear any critical findings before publishing — there are no current results stored.
4. **Hardcoded admin password in client (`tuhin@123`) in `src/App.tsx`.** Anyone reading the JS bundle can see it. Replace with: rely solely on the `user_roles` admin check (server-side via RLS) and remove the client password gate, OR move the gate to an edge function.
5. **`.env` shows a DIFFERENT Supabase project** (`ksroyogpuixihauqtdoi`) than `src/integrations/supabase/client.ts` (`ypskvfbyauvwjiipotqt`). The hardcoded one wins, but this mismatch is dangerous after a remix. Confirm which project is canonical and align.

### Should-fix (quality / scale)
6. **Main JS bundle is 689 KB (205 KB gzip).** Acceptable but heavy on 3G. Quick wins: lazy-load `firebase/auth` only when user clicks Google sign-in; split `Admin.tsx` (62 KB) into tab-based lazy sections; drop `date-fns` in favor of `Intl.DateTimeFormat` if only formatting is used.
3. **React Router v7 future-flag warnings** in console — add `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}` to `<BrowserRouter>` to silence and future-proof.
7. **404 / NotFound** — confirm it has proper `<h1>` + helpful links (currently 0.5 KB chunk, likely minimal).
8. **Service worker (`sw.js`)** — verify it's registered and has a cache-busting strategy that won't serve stale `index.html` after deploys (otherwise the stale-chunk reload band-aid keeps firing).
9. **Error boundary** — wrap routes in a React error boundary so a single component crash doesn't blank the page.

### Nice-to-have polish
- Expand `sitemap.xml` to include category pages, top books and writers dynamically (regenerate at build).
- Add `<link rel="canonical">` per route (currently only one global meta tag).
- Add structured data (JSON-LD `Book` / `Product`) on book detail pages for richer Google results.
- Lighthouse/PageSpeed run on the live URL after fixes for a baseline score.

### Plan of action (in build mode)
1. Fix sitemap + robots domain.
2. Add React Router future flags.
3. Remove hardcoded admin password; keep only `isAdmin` check.
4. Resolve the 4 Supabase linter warnings via migration (revoke EXECUTE on definer funcs, tighten the permissive RLS policy).
5. Lazy-load Firebase; split Admin into tabs.
6. Add a top-level ErrorBoundary.
7. Run the security scan, address criticals.
8. Confirm canonical Supabase project, align `.env` ↔ client.

Approve and I'll implement these in order (security + correctness first, performance second, polish last).