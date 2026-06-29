## Boi Ghor — App ↔ Website deep-link contract

**Website base URL:** `https://project-6f351393-56ca-4e63-bad5-96b.vercel.app`

### Deep link format (use BOTH SSO tokens AND uid for max reliability)

```
/book/<BOOK_UUID>
  ?pay=1                     // open payment modal
  &read=1                    // OR open reader (auto-redirects to /reader/:id)
  &part=<n>                  // optional: jump to part N
  &uid=<supabase_user_id>    // primary identity (fallback if SSO fails)
  &mobile=<phone>            // prefill payment mobile field
  &access_token=<jwt>        // Supabase access_token (for true SSO login)
  &refresh_token=<jwt>       // Supabase refresh_token
  &source=boighor_app
```

### How identity resolution works on the website

1. If `access_token` + `refresh_token` are valid → user is signed in via `supabase.auth.setSession()`. All inserts/reads use the real session uid. **Best path.**
2. Else if `uid` is present → website treats that uid as the "effective user" for **read-only purchase checks** (lookup `book_orders.user_id = uid`). Reader unlocks correctly.
3. Else → falls back to guest checkout (only if `guest=1`).

### IMPORTANT — RLS rule for inserts

`book_orders` RLS requires `auth.uid() = user_id` for authenticated inserts. **Passing `uid` alone is NOT enough to save a paid order against that user** — the app **must** pass valid `access_token` + `refresh_token` so the website signs in as that user before insert.

If only `uid` is passed (no tokens), the order saves as guest (`user_id=null`); admin must link it manually.

### Android Java sample

```java
String url = "https://project-6f351393-56ca-4e63-bad5-96b.vercel.app/book/" + bookId
    + "?pay=1"
    + "&uid=" + Uri.encode(supabaseUserId)
    + "&mobile=" + Uri.encode(userMobile)
    + "&access_token=" + Uri.encode(accessToken)
    + "&refresh_token=" + Uri.encode(refreshToken)
    + "&source=boighor_app";
startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
```

For "Read Now" on an owned book:
```
/book/<BOOK_UUID>?read=1&part=<n>&uid=<uid>&access_token=...&refresh_token=...&source=boighor_app
```
Website auto-redirects to `/reader/<BOOK_UUID>?part=<n>` when access is verified.

### Verifying purchases from app (direct Supabase REST)

```
GET https://ypskvfbyauvwjiipotqt.supabase.co/rest/v1/book_orders
    ?select=status&book_id=eq.<BOOK_UUID>&user_id=eq.<uid>
Headers: apikey: <ANON_KEY>, Authorization: Bearer <user_access_token>
```
`is_paid = response.some(o => o.status === "confirmed")`
