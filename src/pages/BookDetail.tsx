import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Star, BookOpen, ShoppingCart, FileText, CheckCircle, User, ChevronDown, Loader2, Eye, PlayCircle, Lock } from "lucide-react";
import { useBook } from "@/hooks/useBooks";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PaymentModal from "@/components/PaymentModal";
import BookRatingSection from "@/components/BookRatingSection";
import BookDetailSkeleton from "@/components/BookDetailSkeleton";
import { resizedImage, resizedSrcSet, withImageFallback } from "@/lib/imageUrl";
import BlurImage from "@/components/BlurImage";
import { useBookRating } from "@/hooks/useBookRatings";
import { useSSOLogin } from "@/hooks/useSSOLogin";
import { sortBookParts } from "@/lib/partFiles";
import { cacheRemove, cacheSet } from "@/lib/cache";

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: book, isLoading } = useBook(id);
  const { avg: realAvg, count: realCount } = useBookRating(id);
  const { isLoggedIn, user, setShowAuthModal, setAuthMessage } = useAuth();
  const { ssoState, isFromApp, isAuthLoading } = useSSOLogin();

  // App-passed identity (preferred over guest)
  const uidParam = searchParams.get("uid");
  const mobileParam = searchParams.get("mobile") || "";
  const readParam = searchParams.get("read") === "1";
  const partParam = searchParams.get("part");
  // SECURITY: only a real Supabase session unlocks paid content.
  // uid in URL is used ONLY to map a guest checkout insert to the app account.
  const authedUserId = user?.id || null;
  const isAuthenticated = !!authedUserId;
  // For PaymentModal insert mapping: prefer session, fall back to app-passed uid.
  const paymentUserId = authedUserId || uidParam || null;
  // Guest checkout only when no session and app explicitly opted-in
  const isGuestCheckout = searchParams.get("guest") === "1" && ssoState !== "failed" && !isAuthenticated;
  const payParam = searchParams.get("pay") === "1";
  const preserveSessionQuery = (extra: Record<string, string> = {}) => {
    const keep = new URLSearchParams();
    ["uid", "mobile", "access_token", "refresh_token", "session_token", "source", "guest"].forEach((key) => {
      const value = searchParams.get(key);
      if (value) keep.set(key, value);
    });
    Object.entries(extra).forEach(([key, value]) => keep.set(key, value));
    const qs = keep.toString();
    return qs ? `?${qs}` : "";
  };
  const [showPayment, setShowPayment] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [hasPendingOrder, setHasPendingOrder] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(true);
  const [parts, setParts] = useState<any[]>([]);
  const [showParts, setShowParts] = useState(false);
  const [showAllPartsList, setShowAllPartsList] = useState(false);
  const [uploaderProfile, setUploaderProfile] = useState<any>(null);
  const [adUnlockedParts, setAdUnlockedParts] = useState<number[]>([]);
  const [adWatching, setAdWatching] = useState(false);

  const AD_URL = "https://smelthrsfranz.com/i4hrt5hp?key=065c6090f5bb4d6214a72ae676661792";

  useEffect(() => {
    if (id) {
      const check = async () => {
        setCheckingPurchase(true);
        const checkUid = authedUserId;
        if (checkUid) {
          const { data } = await supabase
            .from("book_orders")
            .select("id, status")
            .eq("user_id", checkUid)
            .eq("book_id", id);
          const confirmed = (data || []).some((o: any) => o.status === "confirmed");
          const pending = (data || []).some((o: any) => o.status === "pending");
          setHasPurchased(confirmed);
          setHasPendingOrder(pending);
        } else {
          setHasPurchased(false);
          setHasPendingOrder(false);
        }
        setCheckingPurchase(false);
      };
      check();
    }
  }, [authedUserId, id]);

  // Poll while pending so the banner disappears after admin verification
  useEffect(() => {
    if (!id || !authedUserId || !hasPendingOrder || hasPurchased) return;
    const t = setInterval(async () => {
      const { data } = await supabase
        .from("book_orders")
        .select("status")
        .eq("user_id", authedUserId)
        .eq("book_id", id);
      const confirmed = (data || []).some((o: any) => o.status === "confirmed");
      const pending = (data || []).some((o: any) => o.status === "pending");
      if (confirmed) setHasPurchased(true);
      setHasPendingOrder(pending && !confirmed);
    }, 10000);
    return () => clearInterval(t);
  }, [id, authedUserId, hasPendingOrder, hasPurchased]);

  // Auto-redirect to reader for read=1 deep link (pending no longer unlocks)
  useEffect(() => {
    if (!checkingPurchase && book && readParam) {
      const isFree = book.price === 0;
      if (isFree || hasPurchased) {
        navigate(`/reader/${book.id}${preserveSessionQuery(partParam ? { part: partParam } : {})}`, { replace: true });
      }
    }
  }, [checkingPurchase, book, readParam, hasPurchased, partParam, navigate]);

  // Auto-open payment modal for deep-link or pay param
  useEffect(() => {
    if (!checkingPurchase && book && payParam && !hasPurchased && !hasPendingOrder && book.price > 0) {
      setShowPayment(true);
    }
  }, [checkingPurchase, book, payParam, hasPurchased, hasPendingOrder]);

  const fetchBookParts = useCallback(() => {
    if (!id) return;
    (supabase.from as any)("book_parts_meta")
      .select("id, part_number, title, views")
      .eq("book_id", id)
      .order("part_number", { ascending: true })
      .then(({ data }: any) => {
        const sorted = sortBookParts(data || []);
        setParts(sorted);
        cacheRemove(`parts_meta:${id}`);
        cacheSet(`parts_meta:${id}`, sorted.map((p: any) => ({
          id: p.id,
          part_number: p.part_number,
          title: p.title,
        })));
      });
  }, [id]);

  useEffect(() => {
    fetchBookParts();
  }, [fetchBookParts]);

  useEffect(() => {
    const refresh = () => fetchBookParts();
    window.addEventListener("focus", refresh);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchBookParts]);

  // Fetch ad unlocks for this user/book
  useEffect(() => {
    if (id && authedUserId) {
      supabase
        .from("ad_unlocks")
        .select("part_number")
        .eq("user_id", authedUserId)
        .eq("book_id", id)
        .then(({ data }) => setAdUnlockedParts((data || []).map((r: any) => r.part_number)));
    } else {
      setAdUnlockedParts([]);
    }
  }, [id, authedUserId]);

  // Fetch uploader profile
  useEffect(() => {
    if (book && (book as any).uploader_id) {
      supabase
        .from("profiles")
        .select("id, name, avatar_url, is_writer")
        .eq("id", (book as any).uploader_id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setUploaderProfile(data);
        });
    }
  }, [book]);

  if (isLoading || isAuthLoading) return <BookDetailSkeleton />;
  if (!book) return (
    <div className="container mx-auto px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">বইটি পাওয়া যায়নি</h1>
      <Link to="/books" className="mt-4 inline-block text-primary hover:underline">বইসমূহে ফিরে যান</Link>
    </div>
  );
  if ((book as any).blocked) return (
    <div className="container mx-auto px-4 py-20 text-center">
      <h1 className="text-xl font-bold mb-2">এই বইটি বর্তমানে উপলব্ধ নয়</h1>
      <p className="text-sm text-muted-foreground mb-4">এডমিন এই বইটি সাময়িকভাবে বন্ধ রেখেছে।</p>
      <Link to="/books" className="text-primary hover:underline">বইসমূহে ফিরে যান</Link>
    </div>
  );

  const isFreeBook = book.price === 0;

  const handlePaymentSuccess = (_autoUnlock: boolean) => {
    setHasPendingOrder(true);
    setOrderSuccess(true);
    setShowPayment(false);
  };

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      <Link to="/" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors md:mb-6 md:text-sm">
        <ArrowLeft className="h-4 w-4" /> হোমে ফিরে যান
      </Link>

      {/* Mobile: cover + info side-by-side; Desktop: 2-col layout */}
      <div className="grid gap-4 grid-cols-[110px_1fr] sm:grid-cols-[140px_1fr] md:grid-cols-[300px_1fr] md:gap-8 lg:grid-cols-[350px_1fr]">
        <div className="animate-fade-up">
          <div className="overflow-hidden rounded-lg shadow-card-hover bg-muted aspect-[3/4] md:rounded-2xl">
            {book.cover_url ? (
              <BlurImage
                src={resizedImage(book.cover_url, 600)}
                srcSet={resizedSrcSet(book.cover_url, [240, 400, 600, 800])}
                sizes="(max-width: 640px) 110px, (max-width: 768px) 140px, (max-width: 1024px) 300px, 350px"
                alt={book.title}
                originalSrc={book.cover_url}
                width={600}
                height={800}
                fetchPriority="high"
                decoding="async"
                onError={withImageFallback(book.cover_url)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center"><BookOpen className="h-10 w-10 text-muted-foreground" /></div>
            )}
          </div>
        </div>

        <div className="animate-fade-up min-w-0" style={{ animationDelay: "0.1s" }}>
          {/* Writer profile link */}
          {(book as any).uploader_id && (
            <Link to={`/writer/${(book as any).uploader_id}`}
              className="mb-2 flex items-center gap-3 rounded-xl bg-muted/50 p-2 md:p-3 hover:bg-muted transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
                {uploaderProfile?.avatar_url ? (
                  <img src={uploaderProfile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">{uploaderProfile?.name || book.author}</p>
                <p className="text-xs text-muted-foreground">লেখকের প্রোফাইল দেখুন →</p>
              </div>
            </Link>
          )}

          <div className="flex flex-wrap gap-1.5 mb-1.5">
            <span className="rounded bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground md:text-xs md:px-3 md:py-1">{book.category}</span>
            {book.is_new && <span className="rounded bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground md:text-xs md:px-3 md:py-1">নতুন</span>}
          </div>

          <h1 className="text-base font-extrabold leading-tight md:text-3xl lg:text-4xl">{book.title}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground md:mt-2 md:text-lg">{book.author}</p>

          <div className="mt-2 flex items-center gap-2 text-xs md:mt-4 md:gap-4 md:text-base">
            <div className="flex items-center gap-1">
              <Star className={`h-3.5 w-3.5 md:h-5 md:w-5 ${realCount > 0 ? "fill-accent text-accent" : "text-muted-foreground"}`} />
              <span className="font-bold">{realCount > 0 ? realAvg.toFixed(1) : "0"}</span>
              <span className="text-[10px] text-muted-foreground md:text-xs">({realCount})</span>
            </div>
            {book.pages > 0 && (
              <>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <FileText className="h-3 w-3 md:h-4 md:w-4" />
                  <span>{book.pages} পৃষ্ঠা</span>
                </div>
              </>
            )}
            {parts.length > 0 && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{parts.length} পর্ব</span>
              </>
            )}
          </div>

          <div className="mt-2 md:mt-6">
            <p className="text-lg font-extrabold text-primary md:text-3xl">{isFreeBook ? "ফ্রি" : `৳${book.price}`}</p>
          </div>

          {orderSuccess && hasPurchased && (
            <div className="mt-4 rounded-xl bg-primary/10 p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
              <p className="text-sm font-semibold text-primary">বই সফলভাবে আনলক হয়েছে!</p>
            </div>
          )}
          {hasPendingOrder && !hasPurchased && (
            <div className="mt-4 rounded-xl bg-primary/10 p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
              <p className="text-sm font-semibold text-primary">
                অর্ডার রেকর্ড হয়েছে। আপনি যে নম্বর দিয়েছেন সেখান থেকে টাকা পেলে স্বয়ংক্রিয়ভাবে বইটি আনলক হয়ে যাবে।
              </p>
            </div>
          )}

          {id && (
            <BookRatingSection bookId={id} userId={authedUserId} canRate={hasPurchased} />
          )}


          <div className="mt-3 flex flex-wrap gap-2 md:mt-6 md:gap-3">
            {checkingPurchase ? (
              <div className="text-sm text-muted-foreground">চেক করা হচ্ছে...</div>
            ) : isLoggedIn ? (
              <>
                {(isFreeBook || hasPurchased) && (
                  <Link to={`/reader/${book.id}${preserveSessionQuery()}`} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-bold md:px-6 md:py-3 md:text-sm text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]">
                    <BookOpen className="h-4 w-4" /> বই পড়ুন
                  </Link>
                )}
                {!isFreeBook && !hasPurchased && (
                  <>
                    <Link to={`/reader/${book.id}${preserveSessionQuery({ part: "1" })}`} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-bold md:px-6 md:py-3 md:text-sm text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]">
                      <BookOpen className="h-4 w-4" /> ফ্রিতে পড়ুন
                    </Link>
                    <button onClick={() => setShowPayment(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-xs font-bold md:px-6 md:py-3 md:text-sm text-accent-foreground transition-all hover:opacity-90 active:scale-[0.98]">
                      <ShoppingCart className="h-4 w-4" /> বই কিনুন (৳{book.price})
                    </button>
                    {!book.ads_disabled && (() => {
                      const nextLocked = parts.find(p => p.part_number > 1 && !adUnlockedParts.includes(p.part_number));
                      if (!nextLocked) return null;
                      return (
                        <button
                          disabled={adWatching}
                          onClick={async () => {
                            setAdWatching(true);
                            const w = window.open(AD_URL, "_blank", "noopener,noreferrer");
                            // Require minimum 6 seconds before unlocking
                            await new Promise(r => setTimeout(r, 6000));
                            const { error } = await supabase.from("ad_unlocks").insert({
                              user_id: authedUserId!,
                              book_id: book.id,
                              part_number: nextLocked.part_number,
                            });
                            if (!error) {
                              setAdUnlockedParts(prev => [...prev, nextLocked.part_number]);
                              alert(`পর্ব ${nextLocked.part_number} আনলক হয়েছে! এখন পড়তে পারবেন।`);
                            } else {
                              alert("আনলক ব্যর্থ হয়েছে: " + error.message);
                            }
                            setAdWatching(false);
                            if (w && !w.closed) { /* leave it */ }
                          }}
                          className="inline-flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs font-bold md:px-6 md:py-3 md:text-sm text-secondary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50">
                          {adWatching ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                          {adWatching ? "অপেক্ষা করুন..." : `এড দেখে পর্ব ${nextLocked.part_number} আনলক করুন`}
                        </button>
                      );
                    })()}
                  </>
                )}
                {hasPurchased && (
                  <span className="inline-flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-xs font-bold md:px-6 md:py-3 md:text-sm text-primary">
                    <CheckCircle className="h-4 w-4" /> ক্রয়কৃত
                  </span>
                )}
                {hasPendingOrder && !hasPurchased && (
                  <span className="inline-flex items-center gap-2 rounded-xl bg-accent/20 px-3 py-2 text-xs font-bold md:px-6 md:py-3 md:text-sm text-accent-foreground">
                    ⏳ অপেক্ষমান
                  </span>
                )}
              </>
            ) : (
              // Guests: part 1 of any book is free to read.
              <>
                <Link to={`/reader/${book.id}${preserveSessionQuery({ part: "1" })}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-bold md:px-6 md:py-3 md:text-sm text-primary-foreground hover:opacity-90">
                  <BookOpen className="h-4 w-4" /> {isFreeBook ? "বই পড়ুন" : "ফ্রিতে পড়ুন"}
                </Link>
                {!isFreeBook && (
                  <button onClick={() => { setAuthMessage("বই কিনতে লগইন করুন"); setShowAuthModal(true); }}
                    className="inline-flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-xs font-bold md:px-6 md:py-3 md:text-sm text-accent-foreground hover:opacity-90">
                    <ShoppingCart className="h-4 w-4" /> কিনুন (৳{book.price})
                  </button>
                )}
                {!isFreeBook && !book.ads_disabled && parts.some((p) => p.part_number > 1) && (
                  <button onClick={() => { setAuthMessage("এড দেখে পর্ব আনলক করতে লগইন করুন"); setShowAuthModal(true); }}
                    className="inline-flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground hover:opacity-90 md:px-6 md:py-3 md:text-sm">
                    <PlayCircle className="h-4 w-4" /> এড দেখে আনলক
                  </button>
                )}
              </>
            )}
          </div>

          {/* Parts list — always visible, first 3 shown by default */}
          {parts.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-semibold text-muted-foreground">
                সব পর্ব ({parts.length}টি)
              </p>
              <div className="mt-3 flex flex-col gap-1">
                {(showAllPartsList ? parts : parts.slice(0, 3)).map((part) => {
                  const unlocked = isFreeBook || hasPurchased || part.part_number === 1
                    || adUnlockedParts.includes(part.part_number);
                  return (
                    <Link key={part.id} to={`/reader/${book.id}${preserveSessionQuery({ part: String(part.part_number) })}`}
                      className="rounded-lg px-3 py-2.5 text-sm hover:bg-muted transition-colors flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        {!unlocked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                        {part.title || `পর্ব ${part.part_number}`}
                      </span>
                      <span className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{part.views ?? 0}</span>
                        <span>পর্ব {part.part_number}</span>
                      </span>
                    </Link>
                  );
                })}
                {parts.length > 3 && (
                  <button
                    onClick={() => setShowAllPartsList(!showAllPartsList)}
                    className="mt-1 self-start rounded-lg px-3 py-2 text-xs font-semibold text-primary hover:bg-muted transition-colors"
                  >
                    {showAllPartsList ? "কম দেখুন" : `আরও দেখুন (${parts.length - 3}টি)`}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 md:mt-8">
            <h3 className="text-sm font-bold mb-2 md:text-lg md:mb-3">বিবরণ</h3>
            <p className="text-xs leading-relaxed text-muted-foreground md:text-base">{book.description || "কোনো বিবরণ নেই।"}</p>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && book && (
        <PaymentModal
          book={{ id: book.id, title: book.title, price: book.price }}
          userId={paymentUserId}
          prefillMobile={mobileParam}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default BookDetail;
