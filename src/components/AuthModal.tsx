import { useState } from "react";
import { X, Mail, Lock, UserIcon, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const AuthModal = () => {
  const { showAuthModal, setShowAuthModal, authMessage, login, register, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState("");

  if (!showAuthModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    if (mode === "register") {
      if (!name.trim()) { setError("নাম লিখুন"); setSubmitting(false); return; }
      const { error } = await register(name.trim(), email, password);
      if (error) {
        setError(error);
      } else {
        setSuccess("রেজিস্ট্রেশন সফল! ইমেইল যাচাই করুন।");
      }
    } else {
      const { error } = await login(email, password);
      if (error) setError(error);
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 backdrop-blur-sm animate-fade-in">
      <div className="relative mx-4 w-full max-w-md rounded-2xl bg-background p-8 shadow-card-hover animate-fade-up">
        <button
          onClick={() => { setShowAuthModal(false); setError(""); setSuccess(""); }}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-foreground">
            {mode === "login" ? "লগইন করুন" : "রেজিস্ট্রেশন করুন"}
          </h2>
          {authMessage && (
            <p className="mt-2 text-sm text-muted-foreground">{authMessage}</p>
          )}
        </div>

        {error && <p className="mb-4 text-sm text-destructive text-center">{error}</p>}
        {success && <p className="mb-4 text-sm text-primary text-center">{success}</p>}

        <button
          type="button"
          disabled={googleLoading || submitting}
          onClick={async () => {
            setError(""); setSuccess(""); setGoogleLoading(true);
            const { error } = await loginWithGoogle();
            if (error) setError(error);
            setGoogleLoading(false);
          }}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-input bg-background py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98] disabled:opacity-50"
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          Continue with Google
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">অথবা</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "register" && (
            <div className="relative">
              <UserIcon className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="আপনার নাম"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-input bg-background py-3 pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
                required
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <input
              type="email"
              placeholder="ইমেইল"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-input bg-background py-3 pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <input
              type="password"
              placeholder="পাসওয়ার্ড (৬+ অক্ষর)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              className="w-full rounded-xl border border-input bg-background py-3 pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" ? "প্রবেশ করুন" : "রেজিস্ট্রেশন সম্পন্ন করুন"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            {mode === "login" ? "অ্যাকাউন্ট নেই?" : "ইতিমধ্যে অ্যাকাউন্ট আছে?"}{" "}
            <button
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setSuccess(""); }}
              className="font-semibold text-primary hover:underline"
            >
              {mode === "login" ? "রেজিস্ট্রেশন করুন" : "লগইন করুন"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
