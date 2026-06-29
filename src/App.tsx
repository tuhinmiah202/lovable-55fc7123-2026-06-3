import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import ErrorBoundary from "@/components/ErrorBoundary";
import BottomNav from "@/components/BottomNav";
import InAppBrowserGate from "@/components/InAppBrowserGate";
import Index from "./pages/Index";
import { applyTheme } from "@/lib/theme";

// Lazy import with auto-reload on stale chunks (after a redeploy old hashed
// chunk URLs return 404 / fail to fetch — reload once to grab the new manifest).
const lazyWithReload = <T extends { default: React.ComponentType<any> }>(
  factory: () => Promise<T>
) =>
  lazy(async () => {
    try {
      return await factory();
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (/dynamically imported module|Importing a module script failed|Failed to fetch/i.test(msg)) {
        const key = "__chunk_reload_at";
        const last = Number(sessionStorage.getItem(key) || 0);
        if (Date.now() - last > 10_000) {
          sessionStorage.setItem(key, String(Date.now()));
          window.location.reload();
          return new Promise<T>(() => {});
        }
      }
      throw err;
    }
  });

const Books = lazyWithReload(() => import("./pages/Books"));
const BookDetail = lazyWithReload(() => import("./pages/BookDetail"));
const Reader = lazyWithReload(() => import("./pages/Reader"));
const Categories = lazyWithReload(() => import("./pages/Categories"));
const Authors = lazyWithReload(() => import("./pages/Authors"));
const Profile = lazyWithReload(() => import("./pages/Profile"));
const Admin = lazyWithReload(() => import("./pages/Admin"));
const AdUnlockTest = lazyWithReload(() => import("./pages/AdUnlockTest"));
const WriterProfile = lazyWithReload(() => import("./pages/WriterProfile"));
const Help = lazyWithReload(() => import("./pages/Help"));
const Blocked = lazyWithReload(() => import("./pages/Blocked"));
const NotFound = lazyWithReload(() => import("./pages/NotFound"));


// Tuned for high-traffic browsing: cache responses, avoid duplicate fetches,
// retry transient failures, and don't refetch on every focus.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

import LoadingScreen from "@/components/LoadingScreen";
const RouteFallback = () => <LoadingScreen />;

const ThemeBoot = () => {
  useEffect(() => {
    const stored = localStorage.getItem("nexboi_theme");
    applyTheme(stored === "light" ? "light" : "dark");

    // Warm up the most-visited routes during idle time so navigation feels instant
    // without blocking the first paint. Skip on Save-Data / 2g connections.
    const conn = (navigator as any).connection;
    const slow = conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ""));
    if (!slow) {
      const idle = (cb: () => void) =>
        "requestIdleCallback" in window
          ? (window as any).requestIdleCallback(cb, { timeout: 2500 })
          : setTimeout(cb, 1500);
      idle(() => {
        import("./pages/Books");
        import("./pages/BookDetail");
        import("./pages/Reader");
      });
    }
  }, []);
  return null;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn, loading, setShowAuthModal, setAuthMessage } = useAuth();
  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!isLoggedIn) {
    setAuthMessage("এই সুবিধা ব্যবহার করতে লগইন / রেজিস্ট্রেশন প্রয়োজন");
    setShowAuthModal(true);
    return <Index />;
  }
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, isLoggedIn, loading } = useAuth();
  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!isLoggedIn) return <div className="container mx-auto px-4 py-20 text-center"><p className="text-muted-foreground">অ্যাডমিন প্যানেলে প্রবেশ করতে লগইন করুন।</p></div>;
  if (!isAdmin) return <div className="container mx-auto px-4 py-20 text-center"><p className="text-muted-foreground">এই পেজে প্রবেশের অনুমতি নেই।</p></div>;
  return <>{children}</>;
};

const AppLayout = () => {
  const location = useLocation();
  const isReaderPage = location.pathname.startsWith("/reader/");
  const isEmbed = new URLSearchParams(location.search).get("embed") === "1";
  const { isBlocked, isLoggedIn } = useAuth();

  // Block gate: signed-in but blocked users may only see /help and /blocked.
  if (
    isLoggedIn &&
    isBlocked &&
    location.pathname !== "/help" &&
    location.pathname !== "/blocked"
  ) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Blocked />
      </Suspense>
    );
  }

  if (isReaderPage) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes><Route path="/reader/:id" element={<Reader />} /></Routes>
      </Suspense>
    );
  }

  return (
    <>
      {!isEmbed && <Navbar />}
      <main className="min-h-[60vh]">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/books" element={<Books />} />
            <Route path="/book/:id" element={<BookDetail />} />
            <Route path="/reader/:id" element={<Reader />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/authors" element={<Authors />} />
            <Route path="/writer/:id" element={<WriterProfile />} />
            <Route path="/help" element={<Help />} />
            <Route path="/blocked" element={<Blocked />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
            <Route path="/admin/ad-unlock-test" element={<AdminRoute><AdUnlockTest /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      {!isEmbed && <Footer />}
      {!isEmbed && <BottomNav />}
      {!isEmbed && <div className="h-16 md:hidden" />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ThemeBoot />
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <ErrorBoundary>
            <AuthModal />
            <AppLayout />
            <InAppBrowserGate />
          </ErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
