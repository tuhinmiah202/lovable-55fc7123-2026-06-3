# Cursor AI Prompt — Boi Ghor (বই ঘর) Android App (Full Rebuild)

Paste everything below into Cursor as the project's primary spec. The app must be a thin, fast Android client that consumes the existing Supabase backend used by the website. **No admin features** — everything is managed from the website's admin panel.

---

## 1. Goal

Build a native **Android app (Kotlin, Jetpack Compose, min SDK 24, target SDK 34)** named **"বই ঘর" (Boi Ghor)** that mirrors the website at `https://<WEBSITE_DOMAIN>` and shares the same Supabase database. Users on the app and on the website are the same accounts. Every paid order, purchase, reading-history row, and writer application belongs to one `auth.users.id`.

**Hard requirement:** the app must contain ZERO admin functionality. Admins manage books, parts, orders, payments, writer approvals only from the website (`/admin`).

## 2. Backend (do NOT change schema)

- Supabase URL: `https://ypskvfbyauvwjiipotqt.supabase.co`
- Supabase anon key: **request a fresh anon key from the project owner** (the old key is being rotated; do not hardcode the previous one).
- Auth: Supabase Auth (email + password). Sessions via `gotrue-kt`.
- Tables already exist — use them as-is via PostgREST:
  - `books` (id, title, author, cover_url, price, category_id, description, content, featured, is_new, pages, rating, uploader_id, created_at)
  - `categories` (id, name)
  - `book_parts` (id, book_id, part_number, title, content, status, created_at)
  - `book_orders` (id, user_id, book_id, mobile_number, transaction_id, amount, status, created_at)
  - `book_uploads` (writer submissions — read-only in app: list user's own only)
  - `writer_applications` (writer signup — app can submit, admin approves on website)
  - `profiles` (id, name, email, avatar_url, is_writer, …)
  - `reading_history` (user_id, book_id, part_number, updated_at)
  - `payment_settings` (bkash_number, payment_instructions) — read-only
  - `user_roles` — never write from app
- All access goes through PostgREST + RLS. **The app uses only the anon key + the user's access_token.** Never embed the service role key.

## 3. Tech stack

- Kotlin 2.x, Jetpack Compose, Material 3
- Supabase Kotlin SDK: `gotrue-kt`, `postgrest-kt`, `storage-kt`, `realtime-kt` (optional)
- Coil for images, with disk + memory cache (covers must be cached aggressively)
- DataStore for session + local cache metadata
- Room for offline book cache (cover URL, title, last-read part)
- Navigation Compose
- Bengali typography: bundle **Noto Sans Bengali** font (regular + bold) in `res/font/`

## 4. Visual / UX rules (must match website)

- App name everywhere: **বই ঘর**. All UI strings 100% in Bengali. No English text in user-visible labels.
- Color tokens (match website index.css):
  - background cream `#FAF7F0`
  - primary deep teal `#0F4C5C`
  - accent gold `#E8A33D`
  - foreground `#1F1B16`
- Book grid: **3 columns on phones**, small compact cards (cover aspect 3:4, title 1 line, author 1 line, price + rating row).
- Home screen layout (top → bottom):
  1. Compact search bar + "বইসমূহ" CTA (small banner, max 80dp tall).
  2. Horizontal category chips.
  3. "নির্বাচিত বই" row (LazyRow, first 12).
  4. "নতুন আসা বই" row.
  5. "ফ্রি বই" row.
- Bottom navigation (5 tabs in Bengali): হোম, বইসমূহ, ক্রয়কৃত, হেল্প, প্রোফাইল.
- Book detail screen: cover thumbnail (max 110dp wide) on the LEFT, title/author/price/buttons on the RIGHT, description and parts list below. Everything visible without scroll on a 360×640 screen.
- Reader screen: top bar (back, part selector) auto-hides; tap the screen to toggle it. Show only "পর্ব ১", "পর্ব ২" etc — no part titles. Disable text selection, copy, and screenshots (`WindowManager.LayoutParams.FLAG_SECURE`).
- Lazy loading: load first 6 covers per row, then load 6 more as the user scrolls. Cache every cover locally — never re-download.

## 5. Auth flow

- Email + password sign up / sign in via Supabase Auth.
- On sign-up, Supabase trigger `handle_new_user` creates the `profiles` and `user_roles` rows — the app does nothing extra.
- Browsing books, categories, and book detail page must work **without login** (anon key only).
- Login is required only for: reading any part, buying a book, uploading a book, viewing profile/purchases, applying as writer.
- Persist session with `gotrue-kt` (DataStore-backed `SessionManager`).

## 6. Read-access rules (must match website exactly)

For each part the user opens:

| Book type | Logged out | Logged in, no order | Logged in, `pending` order | Logged in, `confirmed` order |
| --- | --- | --- | --- | --- |
| Free (`price = 0`) | ✅ all parts | ✅ all parts | ✅ all parts | ✅ all parts |
| Paid | ❌ blocked | ✅ part 1 only (preview) | ✅ parts 1–3 | ✅ all parts |

- Check via `book_orders.select(status).eq(user_id, auth.uid()).eq(book_id, X)`.
- If a part is locked, render a locked card with a "কিনুন" button — never fetch its `content`.

## 7. Payments (bKash manual flow)

- Read `payment_settings` (single row) for the bKash number + instructions.
- User taps "কিনুন (৳X)" → modal asks for mobile number and bKash transaction ID.
- Insert into `book_orders`:
  ```kotlin
  {
    user_id = auth.uid(),
    book_id = book.id,
    mobile_number = …,
    transaction_id = …,
    amount = book.price,
    status = "pending"
  }
  ```
- Show "অর্ডার জমা হয়েছে — প্রথম ৩টি পর্ব আনলক হয়েছে" and unlock parts 1–3 immediately.
- Admin confirms on website → `status = confirmed` → app sees full unlock on next refresh.
- Use Supabase realtime on `book_orders` filtered by `user_id = auth.uid()` to auto-refresh unlocks without manual reload (optional but recommended).

## 8. Local caching for low bandwidth

- Cache book list, category list, and per-book metadata in Room with a 10-minute TTL.
- Cache covers via Coil (disk cache size ≥ 200 MB).
- Cache part content per `(book_id, part_number)` keyed by part `updated_at`; once read, never refetch unless updated_at changes.
- Store last-read part per book in `reading_history`. Show "পড়া চালিয়ে যান" on home for logged-in users.

## 9. Writer features (optional, mirror website)

- Logged-in user with `profiles.is_writer = true` can submit a new book via `book_uploads` and add parts via `book_parts` (`status = 'pending'`).
- Non-writers can apply via `writer_applications` insert.
- Approval happens ONLY on website admin panel.

## 10. Things the app MUST NOT do

- No admin UI, no edit/delete book screens, no order management, no payment-settings editor, no writer-approval UI, no category management.
- Never call any RPC or table the user doesn't have RLS access to.
- Never store the service-role key.
- Never bypass `book_orders` checks for unlocking paid content client-side.
- Never request "all books" with `limit > 100`; paginate or rely on row-level filters.

## 11. Deep linking with the website

Support `https://<WEBSITE_DOMAIN>/book/:id?...` intent filter so the website can hand off to the app when installed:

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW"/>
  <category android:name="android.intent.category.DEFAULT"/>
  <category android:name="android.intent.category.BROWSABLE"/>
  <data android:scheme="https" android:host="<WEBSITE_DOMAIN>" android:pathPrefix="/book/"/>
</intent-filter>
```

When opened from a deep link, parse `?part=N&pay=0|1&read=0|1` and route accordingly.

## 12. Deliverables

1. Working APK + Android Studio project.
2. README with: how to set anon key, how to rotate it later, build instructions.
3. Smoke-test checklist covering: anon browse, sign-up, login, buy, pending unlock, admin-confirmed unlock, locked-part attempt, screenshot-block verification.

---

**End of prompt.** Treat this document as the source of truth. If anything in the existing Supabase schema looks inconsistent with the rules above, STOP and ask the project owner — do not run migrations.
