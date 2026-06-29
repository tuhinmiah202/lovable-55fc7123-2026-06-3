import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }>; };

const INSTALL_LOG_KEY = "nexboi_install_logged";

function getAnonId(): string {
  try {
    let v = localStorage.getItem("anon_view_id");
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem("anon_view_id", v);
    }
    return v;
  } catch {
    return "";
  }
}

async function logInstall() {
  try {
    if (localStorage.getItem(INSTALL_LOG_KEY) === "1") return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("app_installs").insert({
      anon_id: getAnonId(),
      user_agent: navigator.userAgent.slice(0, 500),
      user_id: user?.id || null,
    });
    localStorage.setItem(INSTALL_LOG_KEY, "1");
  } catch {
    // Best-effort; ignore failures.
  }
}

export type InAppBrowser = "facebook" | "messenger" | "instagram" | "other";
export type Platform = "android" | "ios" | "other";

export type InAppBrowserInfo = {
  browser: InAppBrowser;
  platform: Platform;
  browserLabel: string;
  steps: string[];
};

export function detectInAppBrowser(): InAppBrowser | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent || "";
  if (/Messenger/i.test(ua)) return "messenger";
  if (/Instagram/i.test(ua)) return "instagram";
  if (/(FBAN|FBAV|FB_IAB|FB4A)/i.test(ua)) return "facebook";
  if (/(Twitter|Line|MicroMessenger|TikTok|LinkedIn|Snapchat|Pinterest)/i.test(ua)) return "other";
  return null;
}

export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  return "other";
}

export function getInAppBrowserInfo(): InAppBrowserInfo | null {
  const browser = detectInAppBrowser();
  if (!browser) return null;
  const platform = detectPlatform();
  const browserLabel =
    browser === "facebook" ? "Facebook" :
    browser === "messenger" ? "Messenger" :
    browser === "instagram" ? "Instagram" : "এই অ্যাপ";

  const steps: string[] = [];
  if (platform === "android") {
    steps.push("উপরের ডানদিকের কোণায় ⋮ (তিন ডট) মেনুতে ট্যাপ করুন।");
    if (browser === "instagram") {
      steps.push("'Open in External Browser' / 'Open in Chrome' সিলেক্ট করুন।");
    } else {
      steps.push("'Open in external browser' / 'Open in Chrome' সিলেক্ট করুন।");
    }
    steps.push("Chrome-এ পেজটি খোলার পর, নিচের 'অ্যাপ ইনস্টল' বাটনে আবার ক্লিক করুন।");
  } else if (platform === "ios") {
    if (browser === "messenger") {
      steps.push("উপরের ডানদিকে ••• মেনুতে ট্যাপ করুন।");
      steps.push("'Open in Safari' / 'Open in Browser' সিলেক্ট করুন।");
    } else if (browser === "instagram") {
      steps.push("উপরের ডানদিকে ••• মেনুতে ট্যাপ করুন।");
      steps.push("'Open in External Browser' সিলেক্ট করুন।");
    } else {
      steps.push("নিচের ডানদিকে ••• বা শেয়ার আইকনে ট্যাপ করুন।");
      steps.push("'Open in Safari' সিলেক্ট করুন।");
    }
    steps.push("Safari-তে নিচের Share বাটন (⬆️) চাপুন।");
    steps.push("'Add to Home Screen' সিলেক্ট করে Add চাপুন।");
  } else {
    steps.push("লিংকটি কপি করে Chrome বা Safari ব্রাউজারে পেস্ট করুন।");
    steps.push("তারপর 'অ্যাপ ইনস্টল' বাটনে আবার ক্লিক করুন।");
  }
  return { browser, platform, browserLabel, steps };
}

export async function copyCurrentUrl(): Promise<boolean> {
  try {
    await navigator.clipboard?.writeText(window.location.href);
    return true;
  } catch {
    return false;
  }
}

export function tryOpenInChromeAndroid(): void {
  openInChrome();
}

export function openInChrome(): void {
  const platform = detectPlatform();
  const url = window.location.href;
  if (platform === "android") {
    const noProto = url.replace(/^https?:\/\//, "");
    window.location.href = `intent://${noProto}#Intent;scheme=https;package=com.android.chrome;end`;
  } else if (platform === "ios") {
    const scheme = url.startsWith("https://") ? "googlechromes://" : "googlechrome://";
    const noProto = url.replace(/^https?:\/\//, "");
    window.location.href = `${scheme}${noProto}`;
  }
}

export type PromptInstallResult =
  | { kind: "inapp"; info: InAppBrowserInfo }
  | { kind: "ios-hint" }
  | { kind: "manual-hint" }
  | { kind: "prompted"; accepted: boolean }
  | { kind: "noop" };

// Module-level singleton: `beforeinstallprompt` fires once per page load.
// Without this, navigating between routes (which remounts the hook) loses
// the deferred event and the install button only shows a generic instruction.
let cachedDeferred: BIPEvent | null = null;
let cachedInstalled: boolean | null = null;
const subscribers = new Set<() => void>();
let listenersAttached = false;

function notify() { subscribers.forEach((fn) => fn()); }

function attachGlobalListeners() {
  if (listenersAttached || typeof window === "undefined") return;
  listenersAttached = true;
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    cachedDeferred = e as BIPEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    cachedInstalled = true;
    cachedDeferred = null;
    logInstall();
    notify();
  });
}

function computeInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-ignore - iOS Safari
    window.navigator.standalone === true
  );
}

export function useInstallPrompt() {
  attachGlobalListeners();
  if (cachedInstalled === null) cachedInstalled = computeInstalled();

  const [, force] = useState(0);
  const installed = cachedInstalled;

  useEffect(() => {
    if (installed) logInstall();
    const cb = () => force((n) => n + 1);
    subscribers.add(cb);
    return () => { subscribers.delete(cb); };
  }, [installed]);

  const promptInstall = useCallback(async (): Promise<PromptInstallResult> => {
    const info = getInAppBrowserInfo();
    if (info) {
      await copyCurrentUrl();
      return { kind: "inapp", info };
    }

    const platform = detectPlatform();
    if (!cachedDeferred) {
      logInstall();
      if (platform === "ios") return { kind: "ios-hint" };
      return { kind: "manual-hint" };
    }
    const ev = cachedDeferred;
    await ev.prompt();
    const choice = await ev.userChoice.catch(() => null);
    const accepted = choice?.outcome === "accepted";
    if (accepted) logInstall();
    cachedDeferred = null;
    notify();
    return { kind: "prompted", accepted };
  }, []);

  return { canInstall: !!cachedDeferred, installed, promptInstall };
}
