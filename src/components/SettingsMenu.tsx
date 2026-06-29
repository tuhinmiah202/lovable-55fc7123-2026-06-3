import { useEffect, useRef, useState } from "react";
import { Settings, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

interface SettingsMenuProps {
  onLogout: () => void;
}

const SettingsMenu = ({ onLogout }: SettingsMenuProps) => {
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
        aria-label="সেটিংস"
      >
        <Settings className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card p-1.5 shadow-xl z-50">
          <button
            onClick={() => {
              toggle();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-muted transition-colors"
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-4 w-4" /> লাইট মোড চালু করুন
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" /> নাইট মোড চালু করুন
              </>
            )}
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" /> লগআউট
          </button>
        </div>
      )}
    </div>
  );
};

export default SettingsMenu;
