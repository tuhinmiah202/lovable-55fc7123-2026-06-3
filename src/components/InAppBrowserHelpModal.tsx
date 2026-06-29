import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Copy, Chrome, Check } from "lucide-react";
import {
  copyCurrentUrl,
  openInChrome,
  type InAppBrowserInfo,
} from "@/lib/pwa";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  info: InAppBrowserInfo | null;
};

const InAppBrowserHelpModal = ({ open, onOpenChange, info }: Props) => {
  const [copied, setCopied] = useState(false);
  const [autoTried, setAutoTried] = useState(false);

  // Auto-trigger Chrome jump once on Android when modal opens.
  useEffect(() => {
    if (!open || !info) {
      setAutoTried(false);
      return;
    }
    if (!autoTried && info.platform === "android") {
      setAutoTried(true);
      const t = setTimeout(() => openInChrome(), 250);
      return () => clearTimeout(t);
    }
  }, [open, info, autoTried]);

  if (!info) return null;
  const { browserLabel, platform, steps } = info;

  const handleCopy = async () => {
    const ok = await copyCurrentUrl();
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const platformLabel =
    platform === "android" ? "Android (Chrome-এ খুলুন)" :
    platform === "ios" ? "iPhone (Safari/Chrome-এ খুলুন)" :
    "ব্রাউজারে খুলুন";

  const canJump = platform === "android" || platform === "ios";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{platformLabel}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {browserLabel}-এর ভেতরের ব্রাউজার থেকে অ্যাপ ইনস্টল করা যায় না।
          </DialogDescription>
        </DialogHeader>

        {canJump && (
          <div className="mt-2 flex flex-col gap-2">
            <button
              onClick={() => openInChrome()}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-base font-bold text-primary-foreground transition-colors hover:opacity-90"
            >
              <Chrome className="h-5 w-5" />
              Open in Chrome
            </button>
            {platform === "ios" && (
              <p className="text-center text-xs text-muted-foreground">
                Chrome ইনস্টল না থাকলে নিচের ধাপগুলো অনুসরণ করুন।
              </p>
            )}
          </div>
        )}

        <p className="mt-3 text-sm font-semibold text-foreground">
          যদি Chrome না খোলে, এই ধাপগুলো অনুসরণ করুন:
        </p>

        <ol className="mt-1 space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span className="pt-0.5 leading-relaxed">{s}</span>
            </li>
          ))}
        </ol>

        <div className="mt-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          💡 লিংক স্বয়ংক্রিয়ভাবে কপি হয়েছে — নতুন ব্রাউজারে পেস্ট করতে পারবেন।
        </div>

        <button
          onClick={handleCopy}
          className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          {copied ? "কপি হয়েছে" : "লিংক আবার কপি করুন"}
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default InAppBrowserHelpModal;
