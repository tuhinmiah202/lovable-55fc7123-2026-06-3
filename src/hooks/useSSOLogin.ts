import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * SSO auto-login from app deep-links.
 * Reads ?access_token=...&refresh_token=... (or ?session_token=<access>:<refresh>)
 * Calls supabase.auth.setSession() so the website signs in as the same app user.
 * On success: strips tokens from URL.
 * On failure (token present but invalid): opens login modal, blocks guest.
 */
export function useSSOLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { setShowAuthModal, setAuthMessage, user, loading } = useAuth();
  const [ssoState, setSsoState] = useState<"idle" | "processing" | "done" | "failed">("idle");

  useEffect(() => {
    const access = searchParams.get("access_token");
    const refresh = searchParams.get("refresh_token");
    const combined = searchParams.get("session_token");

    let accessToken = access;
    let refreshToken = refresh;
    if (!accessToken && combined && combined.includes(":")) {
      const [a, r] = combined.split(":");
      accessToken = a;
      refreshToken = r;
    }

    if (!accessToken || !refreshToken) {
      setSsoState("done");
      return;
    }

    setSsoState("processing");
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ data, error }) => {
        // Clean tokens from URL regardless
        const params = new URLSearchParams(searchParams);
        params.delete("access_token");
        params.delete("refresh_token");
        params.delete("session_token");
        const cleaned = params.toString();
        navigate(`${location.pathname}${cleaned ? `?${cleaned}` : ""}`, { replace: true });

        if (error || !data.session) {
          setSsoState("failed");
          setAuthMessage("সেশন invalid — আপনার অ্যাকাউন্ট দিয়ে আবার লগইন করুন");
          setShowAuthModal(true);
        } else {
          setSsoState("done");
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFromApp =
    searchParams.get("source") === "boighor_app" ||
    searchParams.get("guest") === "1" ||
    !!searchParams.get("access_token") ||
    !!searchParams.get("session_token");

  return { ssoState, isFromApp, isAuthLoading: loading || ssoState === "processing", user };
}
