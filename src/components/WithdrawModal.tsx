import { useState } from "react";
import { X, Loader2, CheckCircle, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WithdrawModalProps {
  userId: string;
  availableAmount: number;
  onClose: () => void;
  onSubmitted: () => void;
}

const MIN_WITHDRAW = 500;

const WithdrawModal = ({ userId, availableAmount, onClose, onSubmitted }: WithdrawModalProps) => {
  const [amount, setAmount] = useState<string>(String(Math.max(MIN_WITHDRAW, Math.min(availableAmount, MIN_WITHDRAW))));
  const [method, setMethod] = useState<"bkash" | "nagad">("bkash");
  const [payoutNumber, setPayoutNumber] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError("");
    const amt = parseInt(amount);
    if (!amt || amt < MIN_WITHDRAW) {
      setError(`সর্বনিম্ন উইথড্র পরিমাণ ৳${MIN_WITHDRAW}`);
      return;
    }
    if (amt > availableAmount) {
      setError(`আপনার ব্যালেন্স: ৳${availableAmount}`);
      return;
    }
    if (!/^01[3-9]\d{8}$/.test(payoutNumber.trim())) {
      setError("সঠিক ১১ ডিজিটের নম্বর দিন");
      return;
    }
    setSubmitting(true);
    const { error: insertErr } = await supabase.from("withdrawal_requests").insert({
      user_id: userId,
      amount: amt,
      method,
      payout_number: payoutNumber.trim(),
      note: note.trim() || null,
    });
    setSubmitting(false);
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    setDone(true);
    onSubmitted();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> টাকা উইথড্র করুন
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        {done ? (
          <div className="text-center py-6">
            <CheckCircle className="h-12 w-12 text-primary mx-auto mb-3" />
            <p className="text-lg font-bold mb-1">অনুরোধ জমা হয়েছে</p>
            <p className="text-sm text-muted-foreground">অ্যাডমিন যাচাই করে পেমেন্ট পাঠাবেন।</p>
            <button onClick={onClose} className="mt-4 rounded-xl bg-primary px-6 py-2 text-sm font-bold text-primary-foreground hover:opacity-90">বন্ধ করুন</button>
          </div>
        ) : (
          <>
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 mb-4 text-center">
              <p className="text-xs text-muted-foreground">উইথড্র যোগ্য ব্যালেন্স</p>
              <p className="text-2xl font-extrabold text-primary">৳{availableAmount}</p>
            </div>

            {error && <div className="mb-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">পরিমাণ (৳)</label>
                <input
                  type="number"
                  min={MIN_WITHDRAW}
                  max={availableAmount}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">সর্বনিম্ন ৳{MIN_WITHDRAW}</p>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">পেমেন্ট মাধ্যম</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMethod("bkash")}
                    className={`rounded-xl border-2 py-3 text-sm font-bold transition-colors ${method === "bkash" ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
                  >📱 বিকাশ</button>
                  <button
                    type="button"
                    onClick={() => setMethod("nagad")}
                    className={`rounded-xl border-2 py-3 text-sm font-bold transition-colors ${method === "nagad" ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
                  >📱 নগদ</button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">{method === "bkash" ? "বিকাশ" : "নগদ"} নম্বর</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  value={payoutNumber}
                  onChange={(e) => setPayoutNumber(e.target.value.replace(/\D/g, ""))}
                  placeholder="01XXXXXXXXX"
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">নোট (ঐচ্ছিক)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary resize-none"
                />
              </div>

              <button
                onClick={submit}
                disabled={submitting || availableAmount < MIN_WITHDRAW}
                className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                উইথড্র অনুরোধ জমা দিন
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WithdrawModal;
