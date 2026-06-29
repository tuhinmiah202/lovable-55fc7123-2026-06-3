import { useEffect, useRef, useState } from "react";
import { Chrome } from "lucide-react";
import {
  copyCurrentUrl,
  getInAppBrowserInfo,
  openInChrome,
  type InAppBrowserInfo,
} from "@/lib/pwa";

/**
 * Full-page blurred gate that appears when the site is opened inside a
 * social in-app browser (Facebook, Messenger, Instagram, etc.).
 * No dismiss / close — user MUST tap "Open in Chrome" to proceed.
 */
const InAppBrowserGate = () => {
  const [info, setInfo] = useState<InAppBrowserInfo | null>(null);
  const primaryBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setInfo(getInAppBrowserInfo());
  }, []);

  useEffect(() => {
    if (!info) return;
    const t = setTimeout(() => primaryBtnRef.current?.focus(), 0);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const blockKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") e.preventDefault();
    };
    document.addEventListener("keydown", blockKey);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", blockKey);
    };
  }, [info]);

  if (!info) return null;

  const handleOpen = async () => {
    await copyCurrentUrl();
    openInChrome();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-xl bg-background/80"
      aria-hidden={false}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="inapp-gate-title"
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl text-center"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
          <Chrome className="h-8 w-8 text-primary" />
        </div>

        <h2 id="inapp-gate-title" className="text-lg font-bold text-foreground">
          Open in Chrome
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          To continue, please open this page in Chrome.
        </p>

        <button
          ref={primaryBtnRef}
          type="button"
          onClick={handleOpen}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.99]"
        >
          <Chrome className="h-5 w-5" aria-hidden="true" />
          Open in Chrome
        </button>
      </div>
    </div>
  );
};

export default InAppBrowserGate;
