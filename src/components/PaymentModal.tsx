import { useState, useEffect, useMemo, useRef } from "react";
import { X, ShoppingCart, Loader2, CheckCircle, Copy, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PaymentModalProps {
  book: { id: string; title: string; price: number };
  userId: string | null;
  prefillMobile?: string;
  onClose: () => void;
  onSuccess: (autoUnlock: boolean) => void;
}

type Step = "provider" | "mobile" | "instructions" | "submitted";
type Provider = "bkash" | "nagad";

const PaymentModal = ({ book, userId, prefillMobile, onClose, onSuccess }: PaymentModalProps) => {
  const [step, setStep] = useState<Step>("provider");
  const [provider, setProvider] = useState<Provider>("bkash");
  const [buyerMobile, setBuyerMobile] = useState(prefillMobile || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [paymentSettings, setPaymentSettings] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase
      .from("payment_settings")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .then(({ data }) => setPaymentSettings(data || []));
  }, []);

  const adminNumber = useMemo(() => {
    const row =
      paymentSettings.find((s: any) => (s.provider || "bkash") === provider) ||
      paymentSettings[0];
    return row?.bkash_number || "01XXXXXXXXX";
  }, [paymentSettings, provider]);

  const isValidMobile = (m: string) => /^01[3-9]\d{8}$/.test(m.trim());

  const createPendingOrder = async () => {
    setError("");
    if (!isValidMobile(buyerMobile)) {
      setError("সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন 01XXXXXXXXX)");
      return;
    }
    setSubmitting(true);
    const orderData: any = {
      book_id: book.id,
      provider,
      payer_phone: buyerMobile.trim(),
      buyer_msisdn: buyerMobile.trim(),
      mobile_number: buyerMobile.trim(),
      amount: book.price,
      status: "pending",
      transaction_id: `PHONE-${buyerMobile.trim()}-${Date.now()}`,
    };
    if (userId) orderData.user_id = userId;
    const { error: insertErr } = await supabase.from("book_orders").insert(orderData);
    setSubmitting(false);
    if (insertErr) {
      setError(insertErr.message || "অর্ডার তৈরি ব্যর্থ");
      return;
    }
    setStep("instructions");
  };

  const finalizeSubmit = () => {
    // Notify parent that an order is pending. NO partial unlock happens —
    // the book only unlocks after the webhook matches the SMS payment.
    onSuccess(false);
    setStep("submitted");
  };

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(adminNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const handleClose = () => {
    // If a pending order was already created (user reached instructions/submitted step),
    // notify the parent so the "order recorded" message shows even if they didn't click "পেমেন্ট পাঠিয়েছি".
    if (step === "instructions" || step === "submitted") {
      onSuccess(false);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={handleClose}>
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">💳 পেমেন্ট</h3>
          <button onClick={handleClose} className="rounded-lg p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 mb-4 text-center">
          <p className="text-sm font-medium">{book.title}</p>
          <p className="text-2xl font-extrabold text-primary mt-1">৳{book.price}</p>
        </div>

        {error && <div className="mb-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        {step === "provider" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold">কোন পেমেন্ট মাধ্যম ব্যবহার করবেন?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setProvider("bkash"); setStep("mobile"); }}
                className="rounded-xl border-2 border-pink-500/40 bg-pink-500/5 p-4 text-center hover:bg-pink-500/10 transition-colors"
              >
                <div className="text-2xl mb-1">📱</div>
                <div className="font-bold">বিকাশ (bKash)</div>
              </button>
              <button
                onClick={() => { setProvider("nagad"); setStep("mobile"); }}
                className="rounded-xl border-2 border-orange-500/40 bg-orange-500/5 p-4 text-center hover:bg-orange-500/10 transition-colors"
              >
                <div className="text-2xl mb-1">📱</div>
                <div className="font-bold">নগদ (Nagad)</div>
              </button>
            </div>
          </div>
        )}

        {step === "mobile" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold">আপনার {provider === "bkash" ? "বিকাশ" : "নগদ"} নম্বর</p>
            <p className="text-xs text-muted-foreground -mt-1">যে নম্বর থেকে টাকা পাঠাবেন সেটি দিন।</p>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={11}
              value={buyerMobile}
              onChange={(e) => setBuyerMobile(e.target.value.replace(/\D/g, ""))}
              placeholder="01XXXXXXXXX"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            />
            <div className="flex gap-2">
              <button onClick={() => setStep("provider")} className="rounded-xl bg-muted px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">← পিছনে</button>
              <button onClick={createPendingOrder} disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                নিশ্চিত করুন →
              </button>
            </div>
          </div>
        )}

        {step === "instructions" && (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl bg-primary/5 border-2 border-primary/30 p-4">
              <p className="text-sm font-bold mb-3 text-center">
                📱 {provider === "bkash" ? "বিকাশ" : "নগদ"} অ্যাপ খুলে নিচের ৩টি ধাপ অনুসরণ করুন
              </p>

              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">১</span>
                  <p className="text-sm pt-0.5"><b>Send Money</b> অপশনে যান</p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">২</span>
                  <div className="flex-1">
                    <p className="text-sm mb-1.5">এই নম্বরে পাঠান:</p>
                    <div className="flex items-center justify-between rounded-lg bg-background border-2 border-dashed border-primary/40 px-3 py-2">
                      <span className="font-mono text-xl font-extrabold tracking-wider text-primary">{adminNumber}</span>
                      <button onClick={copyNumber} className="rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 flex items-center gap-1">
                        <Copy className="h-3.5 w-3.5" /> {copied ? "✓" : "কপি"}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">৩</span>
                  <p className="text-sm pt-0.5">
                    ঠিক <b className="text-primary">৳{book.price}</b> টাকা পাঠান —{" "}
                    অবশ্যই <b>{buyerMobile}</b> নম্বর থেকে
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-accent/10 border border-accent/30 p-3 text-xs leading-relaxed">
              ⚡ পেমেন্ট পাওয়ার <b>১-৩ মিনিটের</b> মধ্যে বইটি স্বয়ংক্রিয়ভাবে আনলক হবে। কোনো রেফারেন্স বা মেসেজ লিখতে হবে না।
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep("mobile")} className="rounded-xl bg-muted px-4 py-3 text-sm font-medium text-muted-foreground">← পিছনে</button>
              <button onClick={finalizeSubmit}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90">
                <ShoppingCart className="h-4 w-4" /> পেমেন্ট পাঠিয়েছি
              </button>
            </div>
          </div>
        )}

        {step === "submitted" && (
          <SubmittedView
            book={book}
            buyerMobile={buyerMobile}
            onUnlocked={() => { onSuccess(true); onClose(); }}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
};

export default PaymentModal;

const CHECK_INTERVAL = 15; // seconds between auto re-checks

function SubmittedView({
  book,
  buyerMobile,
  onUnlocked,
  onClose,
}: {
  book: { id: string; title: string; price: number };
  buyerMobile: string;
  onUnlocked: () => void;
  onClose: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(CHECK_INTERVAL);
  const [checking, setChecking] = useState(false);
  const [lastStatus, setLastStatus] = useState<string>("pending");
  const [attempts, setAttempts] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const checkNow = async () => {
    if (checking) return;
    setChecking(true);
    setAttempts((a) => a + 1);
    const { data } = await supabase
      .from("book_orders")
      .select("status")
      .eq("book_id", book.id)
      .eq("payer_phone", buyerMobile)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!mountedRef.current) return;
    const status = (data as any)?.status || "pending";
    setLastStatus(status);
    setChecking(false);
    setSecondsLeft(CHECK_INTERVAL);
    if (status === "confirmed" || status === "approved" || status === "paid") {
      onUnlocked();
    }
  };

  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { checkNow(); return CHECK_INTERVAL; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="text-center py-4">
      <CheckCircle className="h-12 w-12 text-primary mx-auto mb-3" />
      <p className="text-lg font-bold mb-1">পেমেন্ট যাচাই হচ্ছে</p>
      <p className="text-sm text-muted-foreground mb-4">
        আপনার <b>{buyerMobile}</b> নম্বর থেকে ৳{book.price} পেলে স্বয়ংক্রিয়ভাবে বই আনলক হয়ে যাবে।
      </p>

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 mb-3">
        <p className="text-xs text-muted-foreground mb-1">পরবর্তী যাচাই</p>
        <p className="text-3xl font-extrabold text-primary tabular-nums">
          {checking ? "…" : `${secondsLeft}s`}
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          প্রতি {CHECK_INTERVAL} সেকেন্ডে অটো-চেক হবে
        </p>
        {attempts > 0 && (
          <p className="text-[11px] text-muted-foreground mt-1">
            চেক সংখ্যা: {attempts} • স্ট্যাটাস:{" "}
            <b className={lastStatus === "rejected" ? "text-destructive" : "text-foreground"}>
              {lastStatus === "pending" ? "অপেক্ষমাণ" : lastStatus === "rejected" ? "বাতিল" : lastStatus}
            </b>
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={checkNow}
          disabled={checking}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          এখনই যাচাই করুন
        </button>
        <button onClick={onClose} className="rounded-xl bg-muted px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          বন্ধ করুন
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground mt-3">
        সাধারণত ১-৩ মিনিট লাগে। মডাল বন্ধ করলেও পেমেন্ট পেলে বই নিজে থেকেই আনলক হবে।
      </p>
    </div>
  );
}
