import { Home, ShoppingBag, HelpCircle, User, BookOpen } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, setShowAuthModal, setAuthMessage } = useAuth();
  const [showComingSoon, setShowComingSoon] = useState<string | null>(null);

  const handleComingSoon = (label: string) => {
    setShowComingSoon(label);
    setTimeout(() => setShowComingSoon(null), 2000);
  };

  const handleProfileClick = () => {
    if (!isLoggedIn) {
      setAuthMessage("প্রোফাইল দেখতে লগইন করুন");
      setShowAuthModal(true);
    }
  };

  const navItems = [
    { label: "হোম", icon: Home, path: "/", type: "link" as const },
    { label: "বইসমূহ", icon: BookOpen, path: "/books", type: "link" as const },
    { label: "ক্রয়কৃত", icon: ShoppingBag, path: "/profile?tab=purchased", type: "auth" as const },
    { label: "হেল্প", icon: HelpCircle, path: "/help", type: "link" as const },
    { label: "প্রোফাইল", icon: User, path: "/profile", type: "link" as const },
  ];

  return (
    <>
      {showComingSoon && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-lg animate-fade-in">
          {showComingSoon} — শীঘ্রই আসছে!
        </div>
      )}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md md:hidden">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = item.type === "link" && location.pathname === item.path;

            if (item.type === "auth") {
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    if (isLoggedIn) {
                      navigate(item.path);
                    } else {
                      setAuthMessage("ক্রয়কৃত বই দেখতে লগইন করুন");
                      setShowAuthModal(true);
                    }
                  }}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1 ${
                    location.pathname + location.search === item.path ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              );
            }

            if (item.path === "/profile" && !isLoggedIn) {
              return (
                <button
                  key={item.label}
                  onClick={handleProfileClick}
                  className="flex flex-col items-center gap-0.5 px-2 py-1 text-muted-foreground"
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default BottomNav;
