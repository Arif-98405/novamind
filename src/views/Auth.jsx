import { useState } from "react";
import { Brain, Mail, Lock, User, Sparkles, AlertCircle, Loader2, Sun, Moon } from "lucide-react";
import { useAuth } from "../hooks/useAuth.jsx";
import { useTheme } from "../hooks/useLocalStorage.js";

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function Auth() {
  const { signUp, signIn } = useAuth();
  const { theme, toggle } = useTheme();
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password;
    const cleanName = displayName.trim();

    if (!validateEmail(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (cleanPass.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (mode === "signup" && cleanName.length < 1) {
      setError("Please enter a display name.");
      return;
    }

    setBusy(true);
    try {
      const res =
        mode === "signin"
          ? await signIn(cleanEmail, cleanPass)
          : await signUp(cleanEmail, cleanPass, cleanName);

      if (res.error) {
        const msg = (res.error.message || "").toLowerCase();
        if (msg.includes("invalid login")) {
          setError("Incorrect email or password. Please try again.");
        } else if (msg.includes("already registered") || msg.includes("already been registered")) {
          setError("An account with this email already exists. Try signing in instead.");
        } else if (msg.includes("rate limit") || msg.includes("too many")) {
          setError("Too many attempts. Please wait a minute and try again.");
        } else if (msg.includes("network") || msg.includes("fetch")) {
          setError("Couldn't reach the server. Check your connection and try again.");
        } else {
          setError(res.error.message || "Something went wrong. Please try again.");
        }
      }
    } catch (err) {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (m) => {
    setMode(m);
    setError(null);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10 text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-brand-700/30 blur-[120px] animate-pulse-slow" />
        <div className="absolute top-1/3 -right-40 h-[520px] w-[520px] rounded-full bg-accent-600/20 blur-[140px] animate-pulse-slow" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-brand-500/15 blur-[120px]" />
        <div className="absolute inset-0 bg-grid opacity-60" />
      </div>

      <button
        onClick={toggle}
        className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition-all hover:bg-white/10 hover:text-white"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-600 shadow-glow">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-white">NovaMind</h1>
          <p className="mt-1 text-sm text-slate-400">Your AI study companion</p>
        </div>

        <div className="card p-6">
          <div className="mb-5 flex rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => switchMode("signin")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                mode === "signin"
                  ? "bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-glow"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => switchMode("signup")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                mode === "signup"
                  ? "bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-glow"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="label">Display name</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    className="input pl-10"
                    placeholder="Alex"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  className="input pl-10"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  className="input pl-10"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Please wait...
                </>
              ) : mode === "signin" ? (
                <>
                  <Sparkles className="h-4 w-4" /> Sign in
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Create account
                </>
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-[11px] text-slate-500">
            {mode === "signin" ? (
              <>
                Don't have an account?{" "}
                <button onClick={() => switchMode("signup")} className="font-semibold text-brand-300 hover:text-brand-200">
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button onClick={() => switchMode("signin")} className="font-semibold text-brand-300 hover:text-brand-200">
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-500">
          Your password is never stored in plain text. Accounts are secured by Supabase Auth.
        </p>
      </div>
    </div>
  );
}
