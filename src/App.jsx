import { useState } from "react";
import {
  LayoutDashboard,
  CalendarRange,
  FileText,
  CheckSquare,
  TrendingUp,
  Sparkles,
  Menu,
  X,
  Sun,
  Moon,
  Brain,
  LogOut,
} from "lucide-react";
import { useTheme } from "./hooks/useLocalStorage.js";
import { useAuth, AuthProvider } from "./hooks/useAuth.jsx";
import { useAppData } from "./data/AppData.js";
import Dashboard from "./views/Dashboard.jsx";
import Planner from "./views/Planner.jsx";
import Summarizer from "./views/Summarizer.jsx";
import Tasks from "./views/Tasks.jsx";
import Progress from "./views/Progress.jsx";
import Assistant from "./views/Assistant.jsx";
import Auth from "./views/Auth.jsx";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "planner", label: "AI Study Planner", icon: CalendarRange },
  { id: "summarizer", label: "Notes Summarizer", icon: FileText },
  { id: "tasks", label: "Task Manager", icon: CheckSquare },
  { id: "progress", label: "Progress Tracker", icon: TrendingUp },
  { id: "assistant", label: "AI Assistant", icon: Sparkles },
];

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

function AppShell() {
  const { user, profile, loading, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const [active, setActive] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const data = useAppData();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-600 shadow-glow animate-pulse">
          <Brain className="h-8 w-8 text-white" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const displayName =
    profile?.display_name || profile?.email?.split("@")[0] || "there";

  let view;

  switch (active) {
    case "dashboard":
      view = <Dashboard data={data} go={setActive} />;
      break;
    case "planner":
      view = <Planner data={data} />;
      break;
    case "summarizer":
      view = <Summarizer data={data} />;
      break;
    case "tasks":
      view = <Tasks data={data} />;
      break;
    case "progress":
      view = <Progress data={data} />;
      break;
    case "assistant":
      view = <Assistant />;
      break;
    default:
      view = <Dashboard data={data} go={setActive} />;
  }

  const current = NAV.find((n) => n.id === active);

  return (
    <div className="relative min-h-screen text-slate-100">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-brand-700/30 blur-[120px] animate-pulse-slow" />
        <div className="absolute top-1/3 -right-40 h-[520px] w-[520px] rounded-full bg-accent-600/20 blur-[140px] animate-pulse-slow" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-brand-500/15 blur-[120px]" />
        <div className="absolute inset-0 bg-grid opacity-60" />
      </div>

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col gap-2 border-r border-white/10 bg-[#0c0c18]/80 p-4 backdrop-blur-2xl transition-transform duration-300 lg:static lg:translate-x-0 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-2 py-2">
            <div className="flex items-center gap-2.5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-600 shadow-glow">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="font-display text-lg font-bold tracking-tight text-white">
                  NovaMind
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-brand-300/80">
                  AI Study Companion
                </div>
              </div>
            </div>

            <button
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="mt-4 flex flex-1 flex-col gap-1">
            {NAV.map((n) => {
              const Icon = n.icon;
              const isActive = active === n.id;

              return (
                <button
                  key={n.id}
                  onClick={() => {
                    setActive(n.id);
                    setMobileOpen(false);
                  }}
                  className={`nav-link ${isActive ? "nav-link-active" : ""}`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-brand-400 to-accent-500" />
                  )}
                  <Icon className="h-5 w-5" />
                  <span>{n.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="rounded-xl border border-white/10 bg-gradient-to-br from-brand-600/20 to-accent-600/10 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand-200">
              <Sparkles className="h-4 w-4" />
              Real AI
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
              The AI Assistant uses Google Gemini. Add your GEMINI_API_KEY in
              Secrets to enable live responses.
            </p>
          </div>
        </aside>

        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/10 bg-[#0a0a13]/70 px-4 py-3 backdrop-blur-2xl sm:px-6">
            <div className="flex items-center gap-3">
              <button
                className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div>
                <h1 className="font-display text-lg font-semibold text-white sm:text-xl">
                  {current?.label}
                </h1>
                <p className="hidden text-xs text-slate-400 sm:block">
                  {new Date().toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 sm:flex">
                <Sparkles className="h-4 w-4 text-brand-300" />
                <span className="text-xs font-medium text-slate-300">
                  {data.tasks.filter((t) => !t.done).length} tasks pending
                </span>
              </div>

              <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 sm:flex">
                <div className="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-600 text-[10px] font-bold text-white">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[120px] truncate text-xs font-medium text-slate-200">
                  {displayName}
                </span>
              </div>

              <button
                onClick={toggle}
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition-all hover:bg-white/10 hover:text-white"
                aria-label="Toggle theme"
                title="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>

              <button
                onClick={signOut}
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition-all hover:bg-rose-500/15 hover:text-rose-300"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div key={active} className="animate-slide-up">
              {view}
            </div>
          </main>

          <footer className="px-6 py-4 text-center text-xs text-slate-500">
            NovaMind · Built with React &amp; Tailwind · AI Assistant powered by
            Google Gemini
          </footer>
        </div>
      </div>
    </div>
  );
}