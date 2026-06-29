import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { signInWithGoogleFirebase } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isBlocked: boolean;
  userName: string;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  register: (name: string, email: string, password: string) => Promise<{ error: string | null }>;
  loginWithGoogle: () => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  authMessage: string;
  setAuthMessage: (msg: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  };

  const fetchProfile = async (userId: string) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const { data: dataRaw } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    const data: any = dataRaw;

    setIsBlocked(!!(data as any)?.is_blocked);

    // If the profile name is empty/missing, backfill from Google metadata so
    // OAuth signups show the user's actual name instead of "ব্যবহারকারী".
    if (!data?.name && authUser) {
      const meta: any = authUser.user_metadata || {};
      const oauthName =
        (meta.full_name as string) ||
        (meta.name as string) ||
        (meta.user_name as string) ||
        "";
      if (oauthName) {
        await supabase.from("profiles").update({ name: oauthName }).eq("id", userId);
        setUserName(oauthName);
        return;
      }
    }

    setUserName(data?.name || "");
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Use setTimeout to avoid Supabase auth deadlock
          setTimeout(() => {
            fetchProfile(session.user.id);
            checkAdminRole(session.user.id);
          }, 0);
        } else {
          setUserName("");
          setIsAdmin(false);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        checkAdminRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    setShowAuthModal(false);
    return { error: null };
  };

  const register = async (name: string, email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) return { error: error.message };
    setShowAuthModal(false);
    return { error: null };
  };

  const loginWithGoogle = async () => {
    const { idToken, error, errorCode } = await signInWithGoogleFirebase();
    // Fallback: if Firebase fails (e.g. unauthorized domain, popup blocked),
    // use Supabase's native Google OAuth redirect flow.
    const shouldFallback =
      !idToken &&
      (errorCode === "auth/unauthorized-domain" ||
        errorCode === "auth/popup-blocked" ||
        errorCode === "auth/popup-closed-by-user" ||
        errorCode === "auth/operation-not-supported-in-this-environment" ||
        errorCode === "auth/internal-error");
    if (shouldFallback) {
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (oauthErr) return { error: oauthErr.message };
      return { error: null };
    }
    if (error || !idToken) return { error: error || "Google সাইন-ইন ব্যর্থ" };
    const { error: sbError } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });
    if (sbError) return { error: sbError.message };
    setShowAuthModal(false);
    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setIsBlocked(false);
    setUserName("");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoggedIn: !!user,
        isAdmin,
        isBlocked,
        userName,
        loading,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshProfile: async () => { if (user) await fetchProfile(user.id); },
        showAuthModal,
        setShowAuthModal,
        authMessage,
        setAuthMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
