# Cursor AI prompt — Nexboi Payment Verifier (Android)

Paste this entire prompt into Cursor (or any AI IDE) inside a new empty Android
Studio project. The result should be an installable APK that watches incoming
bKash / Nagad SMS, forwards each one to the Nexboi webhook, and shows the admin
analytics + transactions on screen.

---

## Goal

Build an Android (Kotlin, minSdk 26, targetSdk 34) app called **Nexboi
Verifier** that:

1. Reads every incoming SMS from sender IDs `bKash` and `Nagad` (and any number
   that contains those words in the body).
2. Forwards the raw SMS to the Nexboi `payment-webhook` edge function with an
   HMAC-SHA256 signature so the server can match the payment to a pending
   `book_orders` row and auto-confirm it.
3. Stores every forwarded SMS locally in Room (SQLite) with the server response
   (matched? order id? amount? sender?).
4. Has a single-screen admin dashboard with:
   - Today's revenue, this week, this month, all-time totals (in BDT).
   - Count of matched vs unmatched transactions.
   - A scrollable list of transactions (newest first) with filters: All /
     Matched / Unmatched / bKash / Nagad / Date range.
   - A Settings sheet to paste the webhook URL and HMAC secret, toggle the
     listener on/off, and re-send any failed transaction.

## Webhook contract

`POST https://ypskvfbyauvwjiipotqt.functions.supabase.co/payment-webhook`

Headers:
- `Content-Type: application/json`
- `x-timestamp: <unix seconds, current time>`
- `x-signature: <lowercase hex HMAC-SHA256 of `${x-timestamp}.${body}` using the shared secret>`

Body:
```json
{
  "raw_sms": "<verbatim SMS text>",
  "provider": "bkash" | "nagad",
  "sender_id": "bKash",
  "received_at": "2026-06-22T12:34:56Z"
}
```

Successful response:
```json
{
  "ok": true,
  "matched": true,
  "order_id": "uuid-or-null",
  "parsed": { "amount": 50, "sender": "01XXXXXXXXX", "txid": "8K7DFT6Y3P", "reference": "AB12CD" },
  "note": ""
}
```

The HMAC secret is the `PAYMENT_WEBHOOK_HMAC_SECRET` value stored in Supabase.
Never hardcode it; the user pastes it in Settings on first run.

## Required permissions (AndroidManifest)

- `android.permission.RECEIVE_SMS`
- `android.permission.READ_SMS`
- `android.permission.INTERNET`
- `android.permission.POST_NOTIFICATIONS` (Android 13+)
- A foreground service of type `dataSync` to keep the listener alive.

Show a runtime-permission flow on first launch. If permissions are denied,
explain that this app must be sideloaded (Play Store policy forbids SMS
permissions for non-default-SMS apps) and install on the admin device only.

## Architecture

- `SmsReceiver : BroadcastReceiver` → handles `SMS_RECEIVED_ACTION`, filters by
  sender (`bKash`, `Nagad`, or body containing those words), inserts a Room row
  with `status = QUEUED`, enqueues a `OneTimeWorkRequest` (WorkManager) with
  exponential backoff.
- `ForwardSmsWorker : CoroutineWorker` → picks the oldest queued row, signs and
  POSTs to the webhook with OkHttp, updates the row with the server response,
  sets status to `MATCHED` / `UNMATCHED` / `FAILED`.
- `ForegroundListenerService` → low-priority sticky notification "Nexboi
  Verifier is running" so the OS does not kill the receiver.
- Room entities:
  - `TxEntity(id, receivedAt, provider, sender, body, parsedAmount,
    parsedReference, parsedTxid, serverMatched, serverOrderId, status,
    attempts, lastError)`
- `Repository` with Kotlin Flow queries for the dashboard.

## UI (Jetpack Compose, Material 3)

Single activity with three tabs in a `Scaffold`:

1. **Dashboard** — top metric cards (Today, Week, Month, All-time), donut
   showing matched vs unmatched, list of last 50 transactions.
2. **Transactions** — full list with filters and per-row actions: "Retry",
   "Copy raw SMS", "View parsed fields".
3. **Settings** — webhook URL field, HMAC secret field (masked), test-ping
   button that sends a synthetic SMS, on/off switch for the listener.

Use the Nexboi brand colors: primary `#0F766E` (deep teal), accent `#D4A24C`
(warm gold), background `#FBF6EC`.

## Local parsing (mirror the server)

Before sending, also parse locally so the dashboard can show amount + reference
even when the server is offline. Regexes:

- Amount: `(?:Tk|BDT|৳)\s?(\d+(?:\.\d{1,2})?)` → integer BDT
- Sender mobile: `01[3-9]\d{8}`
- TxID: `(?:TrxID|Txn ID|TxnId)[:\s]*([A-Z0-9]{8,})`
- Reference: `Ref(?:erence)?[:\s]+([A-Z0-9]{6})` (fallback to the first
  standalone 6-char `[A-Z][A-Z0-9]{5}` token that is not the TxID)

## Build & deploy

- Use Gradle Kotlin DSL.
- Single signed-release APK in `app/build/outputs/apk/release/`.
- README must say: sideload only, grant SMS + notifications, paste webhook URL +
  HMAC secret in Settings, leave the phone plugged in, disable battery
  optimization for this app.

Produce all files end-to-end. After scaffolding, run `./gradlew assembleRelease`
and report any build errors.
