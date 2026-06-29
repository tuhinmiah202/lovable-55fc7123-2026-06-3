import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Home, Library, Grid3X3, Users, User, Shield, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useInstallPrompt, type InAppBrowserInfo } from "@/lib/pwa";
import InAppBrowserHelpModal from "@/components/InAppBrowserHelpModal";
import { toast } from "sonner";
import nexboiIcon from "/nexboi-icon-192.png";

const navItems = [
  { label: "হোম", path: "/", icon: Home },
  { label: "বইসমূহ", path: "/books", icon: Library },
  { label: "ক্যাটাগরি", path: "/categories", icon: Grid3X3 },
  { label: "লেখক", path: "/authors", icon: Users },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { isLoggedIn, isAdmin, userName, logout, setShowAuthModal, setAuthMessage } = useAuth();
  const { installed, promptInstall } = useInstallPrompt();
  const [helpInfo, setHelpInfo] = useState<InAppBrowserInfo | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const handleInstallClick = async () => {
    const result = await promptInstall();
    if (result.kind === "inapp") {
      setHelpInfo(result.info);
      setHelpOpen(true);
    } else if (result.kind === "ios-hint") {
      toast.info("Safari-তে Share বাটন (⬆️) চাপুন → 'Add to Home Screen'");
    } else if (result.kind === "manual-hint") {
      toast.info("ব্রাউজার মেনু (⋮) থেকে 'Install app' / 'Add to Home screen' সিলেক্ট করুন");
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between py-3 px-4">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <img src={nexboiIcon} alt="Nexboi" className="h-9 w-9 rounded-lg" width={192} height={192} />
            <span className="text-xl font-bold text-foreground">বই ঘর</span>
          </Link>
          {!installed && (
            <button
              onClick={handleInstallClick}
              title="অ্যাপ হিসেবে ইনস্টল করুন"
              className="ml-2 inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground shadow-card transition-colors hover:opacity-90 md:text-sm"
            >
              <Download className="h-4 w-4" /> অ্যাপ ইনস্টল
            </button>
          )}
        </div>

        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${location.pathname === item.path ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <item.icon className="h-4 w-4" />{item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {isAdmin && (
            <Link to="/admin" className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90">
              <Shield className="h-4 w-4" />অ্যাডমিন
            </Link>
          )}
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <Link to="/profile" className="flex items-center gap-1.5 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:opacity-90">
                <User className="h-4 w-4" />{userName || "প্রোফাইল"}
              </Link>
              <button onClick={() => logout()} className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">লগআউট</button>
            </div>
          ) : (
            <button onClick={() => { setAuthMessage("আপনার অ্যাকাউন্টে প্রবেশ করুন"); setShowAuthModal(true); }}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90">লগইন</button>
          )}
        </div>

        <button onClick={() => setMobileOpen(!mobileOpen)} className="rounded-lg p-2 text-foreground md:hidden">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="animate-fade-in border-t border-border bg-background p-4 md:hidden">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${location.pathname === item.path ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                <item.icon className="h-4 w-4" />{item.label}
              </Link>
            ))}
            {isLoggedIn ? (
              <>
                <Link to="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted">
                  <User className="h-4 w-4" />প্রোফাইল
                </Link>
                {isAdmin && (
                  <Link to="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-lg bg-accent/20 px-4 py-3 text-sm font-semibold text-accent-foreground">
                    <Shield className="h-4 w-4" />অ্যাডমিন প্যানেল
                  </Link>
                )}
                <button onClick={() => { logout(); setMobileOpen(false); }} className="mt-2 rounded-lg bg-muted px-4 py-3 text-left text-sm font-medium text-muted-foreground">লগআউট</button>
              </>
            ) : (
              <button onClick={() => { setAuthMessage("আপনার অ্যাকাউন্টে প্রবেশ করুন"); setShowAuthModal(true); setMobileOpen(false); }}
                className="mt-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground">লগইন / রেজিস্ট্রেশন</button>
            )}
          </div>
        </div>
      )}
      <InAppBrowserHelpModal open={helpOpen} onOpenChange={setHelpOpen} info={helpInfo} />
    </nav>
  );
};

export default Navbar;
