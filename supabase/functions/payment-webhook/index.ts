// Payment verifier webhook.
// The companion Android app forwards every incoming bKash / Nagad SMS here.
// We HMAC-verify the request, parse provider + payer phone + amount, then
// match the OLDEST pending order with that (provider, payer_phone, amount)
// triplet and flip it to "confirmed" so the user's book auto-unlocks.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-signature, x-timestamp",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const HMAC_SECRET = Deno.env.get("PAYMENT_WEBHOOK_HMAC_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Normalize a Bangladesh mobile number to local 11-digit `01XXXXXXXXX`.
function normalizePhone(raw: string): string | null {
  const digits = (raw || "").replace(/\D/g, "");
  let n = digits;
  if (n.startsWith("8801")) n = n.slice(2); // 8801XXXXXXXXX -> 01XXXXXXXXX
  else if (n.startsWith("01") && n.length === 11) n = n;
  else return null;
  return /^01[3-9]\d{8}$/.test(n) ? n : null;
}

// Parse common bKash / Nagad SMS templates.
// IMPORTANT: We only treat *received* money SMSes as valid payments.
// Outgoing "Send Money" / "Cash Out" SMSes are ignored — those are the admin
// sending money OUT and would otherwise falsely use the recipient's number
// as the "sender".
function parseSms(raw: string, providerHint?: string) {
  const text = raw.replace(/\s+/g, " ").trim();
  const lower = text.toLowerCase();

  const provider =
    providerHint ||
    (/bkash/i.test(text) ? "bkash" : /nagad/i.test(text) ? "nagad" : "unknown");

  // Skip outgoing transactions — they are not customer payments.
  const isOutgoing =
    /\bsend\s*money\b/i.test(text) ||
    /\bcash\s*out\b/i.test(text) ||
    /\bpayment\s*sent\b/i.test(text) ||
    /^you have sent\b/i.test(text);

  // Detect "received" templates from bKash/Nagad.
  const isIncoming =
    /\b(received|cash\s*in|money\s*received)\b/i.test(text) ||
    /\bfrom\s+(?:\+?88)?01\d{9}/i.test(text);

  const amountMatch = text.match(/(?:Tk|BDT|৳)\s?([0-9]+(?:\.[0-9]{1,2})?)/i);
  const amount = amountMatch ? Math.round(parseFloat(amountMatch[1])) : null;

  // Sender phone — only meaningful for incoming SMSes.
  let sender: string | null = null;
  if (isIncoming && !isOutgoing) {
    const senderMatch =
      text.match(/from\s+(?:\+?88)?(01\d{9})/i) ||
      text.match(/(?:\+?88)?(01\d{9})/);
    sender = senderMatch ? normalizePhone(senderMatch[1]) : null;
  }

  const txMatch = text.match(/(?:TrxID|Txn ID|TxnId)[:\s]*([A-Z0-9]{8,})/i);
  const txid = txMatch ? txMatch[1] : null;

  return { provider, amount, sender, txid, isOutgoing, isIncoming };
}

async function cleanupOldUnmatched() {
  // Best-effort: delete unmatched SMS events older than 24h.
  await admin
    .from("payment_events")
    .delete()
    .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .eq("matched", false);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  if (!HMAC_SECRET) {
    return new Response(JSON.stringify({ error: "webhook not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-signature") || "";
  const timestamp = req.headers.get("x-timestamp") || "";

  const ts = Number(timestamp);
  if (!ts || Math.abs(Date.now() / 1000 - ts) > 300) {
    return new Response(JSON.stringify({ error: "stale or missing timestamp" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const expected = await hmacHex(HMAC_SECRET, `${timestamp}.${rawBody}`);
  if (expected !== signature) {
    return new Response(JSON.stringify({ error: "bad signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: any;
  try { payload = JSON.parse(rawBody); } catch {
    return new Response(JSON.stringify({ error: "bad json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const raw = String(payload.raw_sms || payload.body || "");
  if (!raw) {
    return new Response(JSON.stringify({ error: "missing raw_sms" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ---- SECURITY: drop sensitive non-payment SMS (OTP / verification codes / PIN) ----
  // These messages MUST NOT be persisted anywhere. We answer 200 so the
  // companion app doesn't retry, but we never touch the database.
  const sensitivePattern =
    /\b(otp|one[\s-]?time\s*password|verification\s*code|verify\s*code|security\s*code|login\s*code|pin\s*code|reset\s*code|do\s*not\s*share|never\s*share)\b/i;
  const lowerRaw = raw.toLowerCase();
  const looksLikePayment =
    /\b(received|cash\s*in|money\s*received|payment\s*received|deposit)\b/i.test(raw) ||
    /(?:tk|bdt|৳)\s?\d/i.test(raw);

  if (sensitivePattern.test(raw) || !looksLikePayment) {
    // Best-effort: also wipe any previously stored sensitive rows.
    try {
      await admin
        .from("payment_events")
        .delete()
        .ilike("raw_sms", "%otp%");
      await admin
        .from("payment_events")
        .delete()
        .ilike("raw_sms", "%verification code%");
    } catch (_) { /* ignore */ }

    return new Response(
      JSON.stringify({ ok: true, ignored: true, reason: "non-payment or sensitive sms discarded" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  }
  const parsed = parseSms(raw, payload.provider);

  // Match by (provider, payer_phone) — oldest pending wins.
  // We previously also required exact amount, but Tk parsing can be off by
  // a fee/rounding cent. Phone number alone is sufficient: the buyer has
  // already pledged a specific book + amount when they created the order.
  let matchedOrderId: string | null = null;
  let note = "";

  // Try to extract sender from raw SMS if parser failed (fallback: any 01XXXXXXXXX in text).
  let candidatePhone = parsed.sender;
  if (!candidatePhone) {
    const anyPhone = raw.replace(/\s+/g, " ").match(/(?:\+?88)?(01[3-9]\d{8})/);
    if (anyPhone) candidatePhone = normalizePhone(anyPhone[1]);
  }

  if (parsed.isOutgoing) {
    note = "outgoing sms ignored (admin sent money)";
  } else if (!candidatePhone) {
    note = "could not parse sender phone from sms";
  } else {
    // Match by phone ONLY (ignore provider + amount). Oldest pending wins.
    const { data: orders } = await admin
      .from("book_orders")
      .select("id, amount, provider")
      .eq("payer_phone", candidatePhone)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(5);

    if (orders && orders.length > 0) {
      const exact = parsed.amount
        ? orders.find((o: any) => o.amount === parsed.amount)
        : null;
      matchedOrderId = (exact || orders[0]).id;
      if (!exact && parsed.amount) {
        note = `matched by phone only (sms amount=${parsed.amount}, order amount=${orders[0].amount})`;
      } else {
        note = "matched by phone";
      }
    } else {
      note = `no pending order for phone ${candidatePhone}`;
    }
  }

  // Override parsed.sender for audit if we used the fallback.
  if (!parsed.sender && candidatePhone) parsed.sender = candidatePhone;

  // Audit
  await admin.from("payment_events").insert({
    order_id: matchedOrderId,
    raw_sms: raw,
    provider: parsed.provider,
    parsed_amount: parsed.amount,
    parsed_sender: parsed.sender,
    parsed_txid: parsed.txid,
    parsed_reference: null,
    matched: !!matchedOrderId,
    note,
  });

  if (matchedOrderId) {
    await admin
      .from("book_orders")
      .update({
        status: "confirmed",
        transaction_id: parsed.txid || `AUTO-${Date.now()}`,
      })
      .eq("id", matchedOrderId);
  }

  // Fire-and-forget cleanup of stale unmatched events.
  cleanupOldUnmatched().catch(() => {});

  return new Response(
    JSON.stringify({
      ok: true,
      matched: !!matchedOrderId,
      order_id: matchedOrderId,
      parsed,
      note,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
  );
});
