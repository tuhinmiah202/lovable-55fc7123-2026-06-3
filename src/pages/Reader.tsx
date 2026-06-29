import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Sun, Moon, Plus, Minus, List, Lock, ShoppingCart, PlayCircle, Loader2, Download } from "lucide-react";
import { useBook } from "@/hooks/useBooks";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSSOLogin } from "@/hooks/useSSOLogin";
import { useInstallPrompt, type InAppBrowserInfo } from "@/lib/pwa";
import { cacheGet, cacheSet } from "@/lib/cache";
import { isPartFileMarker, partFileUrl } from "@/lib/partFiles";
import ReaderBannerAd from "@/components/ReaderBannerAd";
import InAppBrowserHelpModal from "@/components/InAppBrowserHelpModal";
import { toast } from "sonner";

interface PartMeta {
  id: string;
  part_number: number;
  title: string | null;
  content: string | null;
}

const Reader = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { data: book, isLoading } = useBook(id);
  const { user, setShowAuthModal, setAuthMessage } = useAuth();
  const { isAuthLoading } = useSSOLogin();
  const { installed, promptInstall } = useInstallPrompt();
  const [installHelpInfo, setInstallHelpInfo] = useState<InAppBrowserInfo | null>(null);
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const handleInstallClick = async () => {
    const result = await promptInstall();
    if (result.kind === "inapp") { setInstallHelpInfo(result.info); setInstallHelpOpen(true); }
    else if (result.kind === "ios-hint") toast.info("Safari-তে Share (⬆️) → 'Add to Home Screen'");
    else if (result.kind === "manual-hint") toast.info("ব্রাউজার মেনু (⋮) → 'Install app' / 'Add to Home screen'");
  };
  const authedUserId = user?.id || null;
  const isAuthenticated = !!authedUserId;
  const isEmbed = searchParams.get("embed") === "1";
  const preserveSessionQuery = useCallback((extra: Record<string, string> = {}) => {
    const keep = new URLSearchParams();
    ["uid", "mobile", "access_token", "refresh_token", "session_token", "source", "guest"].forEach((key) => {
      const value = searchParams.get(key);
      if (value) keep.set(key, value);
    });
    Object.entries(extra).forEach(([key, value]) => keep.set(key, value));
    const qs = keep.toString();
    return qs ? `?${qs}` : "";
  }, [searchParams]);
  const [fontSize, setFontSize] = useState<number>(() => {
    const v = Number(localStorage.getItem("reader_font_size"));
    return v >= 14 && v <= 28 ? v : 18;
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem("reader_dark");
    if (stored === "1") return true;
    if (stored === "0") return false;
    // Default: follow site theme
    return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  });
  const [parts, setParts] = useState<PartMeta[]>([]);
  const [selectedPart, setSelectedPart] = useState<number | null>(null);
  const [showPartList, setShowPartList] = useState(false);
  const [partsLoading, setPartsLoading] = useState(true);
  const [purchaseStatus, setPurchaseStatus] = useState<"none" | "pending" | "confirmed">("none");
  const [purchaseChecked, setPurchaseChecked] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [adUnlockedParts, setAdUnlockedParts] = useState<number[]>([]);
  const [adWatching, setAdWatching] = useState(false);
  const AD_URL = "https://smelthrsfranz.com/i4hrt5hp?key=065c6090f5bb4d6214a72ae676661792";

  const goToPart = useCallback((partNumber: number) => {
    if (!id) return;
    setSelectedPart(partNumber);
    window.history.replaceState(null, "", `/reader/${id}${preserveSessionQuery({ part: String(partNumber) })}`);
    window.scrollTo(0, 0);
  }, [id, preserveSessionQuery]);

  const handleAdUnlock = async (partNumber: number) => {
    if (!authedUserId || !id) return;
    setAdWatching(true);
    window.open(AD_URL, "_blank", "noopener,noreferrer");
    await new Promise((r) => setTimeout(r, 6000));
    const { error } = await supabase.from("ad_unlocks").insert({
      user_id: authedUserId,
      book_id: id,
      part_number: partNumber,
    });
    if (!error) {
      setAdUnlockedParts((prev) => [...prev, partNumber]);
      // Invalidate cached content so the unlocked part fetches fresh.
      try { localStorage.removeItem(`boighor_cache_v1:part_content:${id}:${partNumber}`); } catch {}
      goToPart(partNumber);
    } else {
      alert("আনলক ব্যর্থ হয়েছে: " + error.message);
    }
    setAdWatching(false);
  };

  // Persist preferences
  useEffect(() => { localStorage.setItem("reader_font_size", String(fontSize)); }, [fontSize]);
  useEffect(() => { localStorage.setItem("reader_dark", darkMode ? "1" : "0"); }, [darkMode]);

  // Auto-hide chrome after 3s when revealed
  useEffect(() => {
    if (!chromeVisible) return;
    const t = window.setTimeout(() => setChromeVisible(false), 3500);
    return () => window.clearTimeout(t);
  }, [chromeVisible, selectedPart]);

  // Copy / screenshot protection
  useEffect(() => {
    const prevent = (e: Event) => { e.preventDefault(); };
    const blockKeys = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      // Block copy / cut / select-all / save / print / screenshot shortcuts
      if ((e.ctrlKey || e.metaKey) && ["c", "x", "a", "s", "p", "u"].includes(k)) {
        e.preventDefault();
      }
      if (k === "printscreen") {
        e.preventDefault();
        navigator.clipboard?.writeText("").catch(() => {});
      }
    };
    document.addEventListener("contextmenu", prevent);
    document.addEventListener("copy", prevent);
    document.addEventListener("cut", prevent);
    document.addEventListener("selectstart", prevent);
    document.addEventListener("dragstart", prevent);
    document.addEventListener("keydown", blockKeys);
    return () => {
      document.removeEventListener("contextmenu", prevent);
      document.removeEventListener("copy", prevent);
      document.removeEventListener("cut", prevent);
      document.removeEventListener("selectstart", prevent);
      document.removeEventListener("dragstart", prevent);
      document.removeEventListener("keydown", blockKeys);
    };
  }, []);

  // Fetch parts metadata (cache-first)
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const cacheKey = `parts_meta:${id}`;
    const cached = cacheGet<PartMeta[]>(cacheKey);
    const partParam = searchParams.get("part");
    const pickInitial = (list: PartMeta[]) => {
      if (partParam && list.find((p) => p.part_number === parseInt(partParam))) {
        setSelectedPart(parseInt(partParam));
      } else if (list.length > 0) {
        setSelectedPart(list[0].part_number);
      }
    };

    if (cached && cached.length > 0) {
      setParts(cached.map((p) => ({ ...p, content: null })));
      pickInitial(cached);
      setPartsLoading(false);
    } else {
      setPartsLoading(true);
    }

    (async () => {
      const { data } = await (supabase.from as any)("book_parts_meta")
        .select("id, part_number, title")
        .eq("book_id", id)
        .order("part_number", { ascending: true });
      if (cancelled) return;
      const meta: PartMeta[] = (data || []).map((p: any) => ({
        id: p.id,
        part_number: p.part_number,
        title: p.title,
        content: null,
      }));
      cacheSet(cacheKey, meta);
      setParts(meta);
      if (selectedPart === null) pickInitial(meta);
      setPartsLoading(false);
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Load content for selected part on demand — cache-first
  const loadPartContent = useCallback(async (partNumber: number) => {
    if (!id) return;
    const existing = parts.find((p) => p.part_number === partNumber);
    if (existing && existing.content !== null) return;
    const cacheKey = `part_content:${id}:${partNumber}`;
    const cached = cacheGet<string>(cacheKey);
    if (cached !== null) {
      setParts((prev) => prev.map((p) => p.part_number === partNumber ? { ...p, content: cached } : p));
      return;
    }
    const { data } = await (supabase.rpc as any)("get_book_part_content", {
      p_book_id: id,
      p_part_number: partNumber,
    });
    const content = ((data as unknown) as string | null) ?? "";
    cacheSet(cacheKey, content);
    setParts((prev) => prev.map((p) => p.part_number === partNumber ? { ...p, content } : p));
  }, [id, parts]);

  // Note: content fetch for the selected part is gated below in a separate
  // effect that checks access AFTER purchase status is known.

  // Compute access for a part-index (mirrors canReadPart below).
  // Rules:
  //   - Free book: all parts open to anyone.
  //   - Paid book part 1: ALWAYS free (anyone, even guests).
  //   - Paid book part 2+: must be confirmed purchase OR ad-unlocked for that part.
  //   - Pending purchase no longer auto-unlocks any parts.
  const computeCanRead = useCallback((partIndex: number) => {
    const isFree = book?.price === 0;
    if (isFree) return true;
    const part = parts[partIndex];
    if (!part) return false;
    if (part.part_number === 1) return true;
    if (!isAuthenticated) return false;
    if (purchaseStatus === "confirmed") return true;
    if (adUnlockedParts.includes(part.part_number)) return true;
    return false;
  }, [book?.price, isAuthenticated, purchaseStatus, parts, adUnlockedParts]);

  // (Removed: forced reset to part 1. Users can navigate to locked parts to
  // see the unlock options.)

  // Load content for the selected part — only if user has access.
  useEffect(() => {
    if (!purchaseChecked || selectedPart === null || parts.length === 0) return;
    const idx = parts.findIndex((p) => p.part_number === selectedPart);
    if (idx >= 0 && computeCanRead(idx)) loadPartContent(selectedPart);
  }, [selectedPart, parts, purchaseChecked, computeCanRead, loadPartContent]);

  // Prefetch next part for snappy navigation — only if accessible.
  useEffect(() => {
    if (!purchaseChecked || selectedPart === null || parts.length === 0) return;
    const idx = parts.findIndex((p) => p.part_number === selectedPart);
    if (idx >= 0 && idx + 1 < parts.length && computeCanRead(idx + 1)) {
      const nextNum = parts[idx + 1].part_number;
      const t = window.setTimeout(() => loadPartContent(nextNum), 1200);
      return () => window.clearTimeout(t);
    }
  }, [selectedPart, parts, purchaseChecked, computeCanRead, loadPartContent]);


  // Check purchase status + ad unlocks
  useEffect(() => {
    if (!id) return;
    (async () => {
      if (authedUserId) {
        const [{ data: orders }, { data: unlocks }] = await Promise.all([
          supabase.from("book_orders").select("id, status").eq("user_id", authedUserId).eq("book_id", id),
          supabase.from("ad_unlocks").select("part_number").eq("user_id", authedUserId).eq("book_id", id),
        ]);
        const confirmed = (orders || []).some((o: any) => o.status === "confirmed");
        const pending = (orders || []).some((o: any) => o.status === "pending");
        setPurchaseStatus(confirmed ? "confirmed" : pending ? "pending" : "none");
        setAdUnlockedParts((unlocks || []).map((r: any) => r.part_number));
      } else {
        setPurchaseStatus("none");
        setAdUnlockedParts([]);
      }
      setPurchaseChecked(true);
    })();
  }, [authedUserId, id]);

  // Record a unique-per-day view when a part is opened with access
  useEffect(() => {
    if (!purchaseChecked || selectedPart === null || parts.length === 0) return;
    const part = parts.find(p => p.part_number === selectedPart);
    if (!part) return;
    const idx = parts.findIndex(p => p.part_number === selectedPart);
    if (idx < 0 || !computeCanRead(idx)) return;
    const viewerKey = authedUserId || `anon:${localStorage.getItem("anon_view_id") || (() => { const v = crypto.randomUUID(); localStorage.setItem("anon_view_id", v); return v; })()}`;
    supabase.rpc("record_part_view", { p_part_id: part.id, p_viewer_key: viewerKey }).then(() => {});
  }, [selectedPart, parts, purchaseChecked, authedUserId, computeCanRead]);

  // Track reading history (only for logged-in users)
  useEffect(() => {
    if (user && id) {
      supabase.from("reading_history").upsert(
        { user_id: user.id, book_id: id, last_read_at: new Date().toISOString() },
        { onConflict: "user_id,book_id" }
      ).then();
    }
  }, [user, id]);

  if (isAuthLoading || isLoading || partsLoading || !purchaseChecked) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  }

  if (!book) {
    return <div className="flex h-screen items-center justify-center"><p className="text-muted-foreground">বইটি পাওয়া যায়নি</p></div>;
  }

  const isFreeBook = book.price === 0;
  // Confirmed purchase = full access. Pending no longer unlocks anything.
  const canReadAll = isFreeBook || (isAuthenticated && purchaseStatus === "confirmed");
  const currentPart = parts.find((p) => p.part_number === selectedPart);
  const hasParts = parts.length > 0;

  const canReadPart = (partNumber: number) => {
    if (canReadAll) return true;
    // Part 1 of any book is always free.
    if (partNumber === 1) return true;
    if (!isAuthenticated) return false;
    if (adUnlockedParts.includes(partNumber)) return true;
    return false;
  };

  const canReadCurrentPart = selectedPart !== null && canReadPart(selectedPart);
  const displayContent = hasParts ? currentPart?.content : book.content;
  const topIconButtonClass = darkMode
    ? "rounded-lg border border-primary/30 bg-primary/15 p-2 text-primary hover:bg-primary/25 transition-colors"
    : "rounded-lg p-2 hover:bg-muted transition-colors text-foreground";
  const mutedTopIconButtonClass = darkMode
    ? "rounded-lg border border-border bg-card p-2 text-foreground hover:bg-muted transition-colors"
    : "rounded-lg p-2 hover:bg-muted transition-colors text-foreground";


  return (
    <div
      className={`min-h-screen transition-colors select-none ${darkMode ? "bg-[hsl(220,18%,5%)] text-[hsl(0,0%,98%)] font-medium" : "bg-[hsl(38,40%,97%)] text-[hsl(0,0%,8%)] font-medium"}`}
      style={{ WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" }}
    >
      {/* Floating top bar — visible only when chromeVisible */}
      <div
        className={`fixed top-0 left-0 right-0 z-20 border-b px-4 py-3 transition-transform duration-300 ${
          chromeVisible ? "translate-y-0" : "-translate-y-full"
        } ${darkMode ? "border-[hsl(220,14%,16%)] bg-[hsl(220,18%,8%)]" : "border-border bg-background/95 backdrop-blur"}`}
      >
        <div className="container mx-auto flex items-center justify-between">
          {isEmbed ? (
            <span className="text-sm text-muted-foreground">পর্ব {selectedPart ?? ""}</span>
          ) : (
            <Link to={`/book/${book.id}${preserveSessionQuery()}`} className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold transition-colors ${darkMode ? "text-foreground hover:bg-muted" : "text-muted-foreground hover:text-foreground"}`}>
              <ArrowLeft className="h-4 w-4" /> ফিরে যান
            </Link>
          )}
          <div className="flex items-center gap-1.5">
            {!installed && (
              <button
                onClick={(e) => { e.stopPropagation(); setChromeVisible(true); handleInstallClick(); }}
                title="অ্যাপ ইনস্টল করুন"
                className={topIconButtonClass}
              >
                <Download className="h-4 w-4" />
              </button>
            )}
            {hasParts && (
              <button onClick={(e) => { e.stopPropagation(); setShowPartList(!showPartList); setChromeVisible(true); }}
                className={showPartList ? topIconButtonClass : mutedTopIconButtonClass}>
                <List className="h-4 w-4" />
                <span className="sr-only">সব পর্ব</span>
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); setFontSize(Math.max(14, fontSize - 2)); setChromeVisible(true); }} className={mutedTopIconButtonClass}>
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[2rem] text-center text-xs font-bold text-foreground">{fontSize}</span>
            <button onClick={(e) => { e.stopPropagation(); setFontSize(Math.min(28, fontSize + 2)); setChromeVisible(true); }} className={mutedTopIconButtonClass}>
              <Plus className="h-4 w-4" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setDarkMode(!darkMode); setChromeVisible(true); }} className={`${mutedTopIconButtonClass} ml-1`}>
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>


      {/* Banner ad: visible only when chrome (navbar) is hidden, and only for ad-unlocked parts */}
      {selectedPart !== null && adUnlockedParts.includes(selectedPart) && (
        <ReaderBannerAd hidden={chromeVisible} />
      )}


      {/* Tap area to toggle chrome */}
      <div
        onClick={() => setChromeVisible((v) => !v)}
        className="container mx-auto max-w-3xl px-5 pt-10 pb-10"
      >
        {/* Minimal part header — ONLY "পর্ব N" */}
        {hasParts && currentPart && (
          <div className="pt-4 pb-6 text-center">
            <h1 className="text-2xl font-extrabold tracking-tight">পর্ব {currentPart.part_number}</h1>
          </div>
        )}

        {/* Part list popover */}
        {showPartList && hasParts && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`mb-6 rounded-xl border p-4 ${darkMode ? "border-[hsl(220,14%,16%)] bg-[hsl(220,18%,8%)]" : "border-border bg-card"}`}
          >
            <h3 className="text-sm font-bold mb-3">সব পর্ব</h3>
            <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
              {parts.map((part) => {
                const isLocked = !canReadPart(part.part_number);
                return (
                  <button key={part.id}
                    onClick={() => { goToPart(part.part_number); setShowPartList(false); }}
                    className={`text-left rounded-lg px-3 py-2.5 text-sm transition-colors flex items-center justify-between ${
                      selectedPart === part.part_number ? "bg-primary/10 text-primary font-semibold"
                      : isLocked ? "opacity-70 hover:bg-muted"
                      : darkMode ? "hover:bg-[hsl(220,14%,16%)]" : "hover:bg-muted"
                    }`}>
                    <span>পর্ব {part.part_number}</span>
                    {isLocked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                );
              })}
            </div>
            {!canReadAll && (
              <div className="mt-3 rounded-lg bg-accent/10 p-3 text-center">
                <p className="text-xs text-muted-foreground">🔒 সম্পূর্ণ বই পড়তে বইটি কিনুন</p>
                <Link to={`/book/${book.id}?pay=1`} className="text-xs font-semibold text-primary hover:underline">বই কিনুন →</Link>
              </div>
            )}
          </div>
        )}

        {/* Reading content */}
        <div className="py-2">
          {canReadCurrentPart ? (
            isPartFileMarker(displayContent) ? (
              <PartFileView url={partFileUrl(displayContent as string)} fontSize={fontSize} />
            ) : displayContent ? (
              <div
                className="whitespace-pre-wrap leading-[1.95] reader-content"
                style={{ fontSize: `${fontSize}px` }}
              >
                {displayContent}
              </div>
            ) : displayContent === null || displayContent === undefined ? (
              <div className="py-10 text-center text-muted-foreground">লোড হচ্ছে...</div>
            ) : (
              <div className="py-20 text-center text-muted-foreground">
                <p className="text-lg">এই পর্বে কোনো বিষয়বস্তু নেই।</p>
              </div>
            )
          ) : (
            <div className="py-20 text-center">
              <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">এই পর্ব লক করা আছে</h3>
              <p className="text-muted-foreground mb-4">
                বই কিনুন অথবা এড দেখে এই পর্ব আনলক করুন।
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {!isFreeBook && (
                  isAuthenticated ? (
                    <Link to={`/book/${book.id}${preserveSessionQuery({ pay: "1" })}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90">
                      <ShoppingCart className="h-4 w-4" /> বই কিনুন (৳{book.price})
                    </Link>
                  ) : (
                    <button
                      onClick={() => { setAuthMessage("বই কিনতে লগইন করুন"); setShowAuthModal(true); }}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90"
                    >
                      <ShoppingCart className="h-4 w-4" /> বই কিনুন (লগইন প্রয়োজন)
                    </button>
                  )
                )}
                {selectedPart !== null && !isFreeBook && !book.ads_disabled && (
                  isAuthenticated ? (
                    <button
                      disabled={adWatching}
                      onClick={() => handleAdUnlock(selectedPart)}
                      className="inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-3 text-sm font-bold text-secondary-foreground hover:opacity-90 disabled:opacity-50"
                    >
                      {adWatching ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                      {adWatching ? "অপেক্ষা করুন..." : `এড দেখে পর্ব ${selectedPart} আনলক করুন`}
                    </button>
                  ) : (
                    <button
                      onClick={() => { setAuthMessage("এড দেখে পর্ব আনলক করতে লগইন করুন"); setShowAuthModal(true); }}
                      className="inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-3 text-sm font-bold text-secondary-foreground hover:opacity-90"
                    >
                      <PlayCircle className="h-4 w-4" /> এড দেখে আনলক (লগইন প্রয়োজন)
                    </button>
                  )
                )}
                {(() => {
                  const idx = parts.findIndex((p) => p.part_number === selectedPart);
                  if (idx < 0 || idx >= parts.length - 1) return null;
                  const nextNum = parts[idx + 1].part_number;
                  return (
                    <button
                      onClick={() => goToPart(nextNum)}
                      className="inline-flex items-center gap-2 rounded-xl bg-muted px-5 py-3 text-sm font-bold text-foreground hover:bg-muted/80"
                    >
                      পরবর্তী পর্ব →
                    </button>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Part navigation */}
        {hasParts && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`py-6 mt-6 border-t flex items-center justify-between ${darkMode ? "border-[hsl(220,14%,16%)]" : "border-border"}`}
          >
            {selectedPart && parts.findIndex((p) => p.part_number === selectedPart) > 0 ? (
              <button onClick={() => {
                const idx = parts.findIndex((p) => p.part_number === selectedPart);
                if (idx > 0) {
                  goToPart(parts[idx - 1].part_number);
                }
              }}
                className="rounded-xl bg-muted px-4 py-2.5 text-sm font-medium hover:bg-muted/80 transition-colors">
                ← পূর্ববর্তী
              </button>
            ) : <div />}
            {selectedPart && parts.findIndex((p) => p.part_number === selectedPart) < parts.length - 1 ? (
              <button
                onClick={() => {
                  const nextIdx = parts.findIndex((p) => p.part_number === selectedPart) + 1;
                  const nextPart = parts[nextIdx].part_number;
                  goToPart(nextPart);
                }}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition-colors"
              >
                পরবর্তী →
              </button>
            ) : <div />}
          </div>
        )}

        <div className="h-10" />
      </div>
      <InAppBrowserHelpModal open={installHelpOpen} onOpenChange={setInstallHelpOpen} info={installHelpInfo} />
    </div>
  );
};

// Renders a part whose content is a Supabase Storage file URL.
// .pdf → embedded iframe viewer. Other (.txt) → fetched and shown as text.
const PartFileView = ({ url, fontSize }: { url: string; fontSize: number }) => {
  const isPdf = url.toLowerCase().split("?")[0].endsWith(".pdf");
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (isPdf) return;
    let cancelled = false;
    setText(null); setErr(null);
    const cacheKey = `part_file_text:${url}`;
    const cached = cacheGet(cacheKey);
    if (typeof cached === "string") { setText(cached); return; }
    fetch(url).then(async (r) => {
      if (!r.ok) throw new Error("ফাইল লোড করা যায়নি");
      const t = await r.text();
      if (cancelled) return;
      cacheSet(cacheKey, t);
      setText(t);
    }).catch((e) => { if (!cancelled) setErr(e.message || String(e)); });
    return () => { cancelled = true; };
  }, [url, isPdf]);

  if (isPdf) {
    return (
      <iframe
        src={url}
        title="বইয়ের পর্ব"
        className="w-full rounded-xl border border-border bg-white"
        style={{ height: "80vh" }}
      />
    );
  }
  if (err) return <div className="py-10 text-center text-destructive">{err}</div>;
  if (text === null) return <div className="py-10 text-center text-muted-foreground">লোড হচ্ছে...</div>;
  return (
    <div className="whitespace-pre-wrap leading-[1.95] reader-content" style={{ fontSize: `${fontSize}px` }}>
      {text}
    </div>
  );
};

export default Reader;
