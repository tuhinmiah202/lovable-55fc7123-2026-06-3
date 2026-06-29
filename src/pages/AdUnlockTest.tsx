import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";

const SUPABASE_URL = "https://ypskvfbyauvwjiipotqt.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwc2t2ZmJ5YXV2d2ppaXBvdHF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTI2MjAsImV4cCI6MjA4Nzc2ODYyMH0.F_v998jGVda-n0HtLDR4XKWxQ3KhAv3yE1gYNqoe3C0";

// Separate anonymous client (no session) to simulate guest
const guestClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: false, autoRefreshToken: false, storage: undefined as any },
});

type CheckResult = { name: string; pass: boolean | null; detail: string };

const Row = ({ r }: { r: CheckResult }) => (
  <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
    <div className="mt-0.5">
      {r.pass === null ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> :
        r.pass ? <CheckCircle2 className="h-5 w-5 text-green-500" /> :
        <XCircle className="h-5 w-5 text-red-500" />}
    </div>
    <div className="flex-1 min-w-0">
      <div className="font-medium text-sm">{r.name}</div>
      <div className="text-xs text-muted-foreground mt-1 break-words">{r.detail}</div>
    </div>
    <div className={`text-xs font-bold px-2 py-1 rounded ${
      r.pass === null ? "bg-muted text-muted-foreground" :
      r.pass ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
    }`}>
      {r.pass === null ? "চলছে" : r.pass ? "PASS" : "FAIL"}
    </div>
  </div>
);

export default function AdUnlockTest() {
  const { user, isAdmin } = useAuth();
  const [paidBooks, setPaidBooks] = useState<any[]>([]);
  const [freeBooks, setFreeBooks] = useState<any[]>([]);
  const [selectedPaid, setSelectedPaid] = useState<string>("");
  const [selectedFree, setSelectedFree] = useState<string>("");
  const [results, setResults] = useState<CheckResult[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("books").select("id,title,price").order("created_at", { ascending: false }).limit(50);
      const paid = (data || []).filter((b: any) => (b.price || 0) > 0);
      const free = (data || []).filter((b: any) => (b.price || 0) === 0);
      setPaidBooks(paid);
      setFreeBooks(free);
      if (paid[0]) setSelectedPaid(paid[0].id);
      if (free[0]) setSelectedFree(free[0].id);
    })();
  }, []);

  const runTests = async () => {
    setRunning(true);
    const out: CheckResult[] = [];
    const push = (r: CheckResult) => { out.push(r); setResults([...out]); };

    // 1) Guest can list parts via book_parts_meta
    try {
      const { data, error } = await (guestClient.from as any)("book_parts_meta")
        .select("id,book_id,part_number,title,status")
        .limit(5);
      push({
        name: "Guest পার্ট তালিকা দেখতে পারে (book_parts_meta)",
        pass: !error && Array.isArray(data),
        detail: error ? error.message : `${data?.length || 0}টি সারি পাওয়া গেছে`,
      });
    } catch (e: any) {
      push({ name: "Guest পার্ট তালিকা দেখতে পারে", pass: false, detail: e.message });
    }

    // 2) Guest can read FREE book part 1 content via RPC
    if (selectedFree) {
      const { data, error } = await (guestClient.rpc as any)("get_book_part_content", {
        p_book_id: selectedFree, p_part_number: 1,
      });
      push({
        name: "Guest: ফ্রি বইয়ের পর্ব ১ পড়তে পারে",
        pass: !error && !!data,
        detail: error ? error.message : data ? `কন্টেন্ট পাওয়া গেছে (${String(data).length} অক্ষর)` : "NULL ফেরত",
      });

      // Free part 2 should also work
      const { data: d2 } = await (guestClient.rpc as any)("get_book_part_content", {
        p_book_id: selectedFree, p_part_number: 2,
      });
      push({
        name: "Guest: ফ্রি বইয়ের পর্ব ২ ও পড়তে পারে (যদি থাকে)",
        pass: d2 !== null ? true : null,
        detail: d2 ? `${String(d2).length} অক্ষর` : "পর্ব ২ নেই বা NULL",
      });
    } else {
      push({ name: "Free book test", pass: null, detail: "কোনো ফ্রি বই নেই" });
    }

    // 3) Guest CAN read paid book part 1 (free preview)
    if (selectedPaid) {
      const { data, error } = await (guestClient.rpc as any)("get_book_part_content", {
        p_book_id: selectedPaid, p_part_number: 1,
      });
      push({
        name: "Guest: পেইড বইয়ের পর্ব ১ ফ্রি প্রিভিউ পড়তে পারে",
        pass: !error && !!data,
        detail: error ? error.message : data ? `${String(data).length} অক্ষর` : "NULL — preview policy কাজ করছে না",
      });

      // 4) Guest CANNOT read paid book part 2
      const { data: d2 } = await (guestClient.rpc as any)("get_book_part_content", {
        p_book_id: selectedPaid, p_part_number: 2,
      });
      push({
        name: "Guest: পেইড বইয়ের পর্ব ২ লকড থাকে",
        pass: d2 === null,
        detail: d2 === null ? "যথাযথভাবে NULL" : "⚠ Guest পর্ব ২ পড়তে পারছে — নিরাপত্তা ঝুঁকি!",
      });

      // 5) Logged-in user (current) part 2 check
      if (user) {
        const { data: d3 } = await (supabase.rpc as any)("get_book_part_content", {
          p_book_id: selectedPaid, p_part_number: 2,
        });
        const { data: order } = await supabase.from("book_orders")
          .select("id").eq("book_id", selectedPaid).eq("user_id", user.id).eq("status", "confirmed").maybeSingle();
        const { data: unlock } = await supabase.from("ad_unlocks")
          .select("id").eq("book_id", selectedPaid).eq("part_number", 2).eq("user_id", user.id).maybeSingle();
        const shouldHave = !!order || !!unlock;
        push({
          name: "Logged-in: পর্ব ২ অ্যাক্সেস লজিক সঠিক",
          pass: shouldHave ? !!d3 : d3 === null,
          detail: `purchased=${!!order}, ad_unlocked=${!!unlock}, পেলো=${!!d3}`,
        });

        // 6) ad_unlocks insert permission
        const testPart = 9999;
        const { error: insErr } = await supabase.from("ad_unlocks").insert({
          book_id: selectedPaid, part_number: testPart, user_id: user.id,
        } as any);
        push({
          name: "Logged-in: ad_unlocks এ INSERT করতে পারে",
          pass: !insErr || (insErr.message || "").includes("duplicate"),
          detail: insErr ? insErr.message : "OK",
        });
        // cleanup
        await supabase.from("ad_unlocks").delete()
          .eq("book_id", selectedPaid).eq("part_number", testPart).eq("user_id", user.id);
      } else {
        push({ name: "Logged-in টেস্ট", pass: null, detail: "লগইন করুন" });
      }
    } else {
      push({ name: "Paid book test", pass: null, detail: "কোনো পেইড বই নেই" });
    }

    setRunning(false);
  };

  if (!isAdmin) {
    return <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">শুধুমাত্র অ্যাডমিন</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">Ad Unlock ডায়াগনস্টিক</h1>
      <p className="text-sm text-muted-foreground mb-6">
        সব ইউজার (guest সহ) সঠিকভাবে অ্যাড-আনলক ও প্রিভিউ অ্যাক্সেস পাচ্ছে কিনা যাচাই করে।
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs text-muted-foreground">পেইড বই</label>
          <select value={selectedPaid} onChange={(e) => setSelectedPaid(e.target.value)}
            className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">— নির্বাচন করুন —</option>
            {paidBooks.map((b) => <option key={b.id} value={b.id}>{b.title} (৳{b.price})</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">ফ্রি বই</label>
          <select value={selectedFree} onChange={(e) => setSelectedFree(e.target.value)}
            className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">— নির্বাচন করুন —</option>
            {freeBooks.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
        </div>
      </div>

      <button onClick={runTests} disabled={running}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60 mb-6">
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        টেস্ট চালান
      </button>

      <div className="space-y-2">
        {results.map((r, i) => <Row key={i} r={r} />)}
        {results.length === 0 && <p className="text-sm text-muted-foreground">এখনো টেস্ট চলেনি।</p>}
      </div>

      <div className="mt-8 p-4 rounded-lg border border-border bg-muted/30 text-xs text-muted-foreground space-y-1">
        <p><strong>ম্যানুয়াল চেক:</strong></p>
        <p>১. Incognito উইন্ডোতে যেকোনো পেইড বই খুলুন → পর্ব ১ ফ্রি পড়া যাবে, পর্ব ২ এ "Watch Ad / Buy" দেখাবে।</p>
        <p>২. নতুন ইউজার অ্যাকাউন্টে লগইন করে → পর্ব ২ এ অ্যাড দেখে আনলক হবে।</p>
        <p>৩. ক্রয়কৃত ইউজারে → সব পর্ব সরাসরি unlocked।</p>
      </div>
    </div>
  );
}
