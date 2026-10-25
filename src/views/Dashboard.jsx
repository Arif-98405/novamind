import {
  CheckSquare,
  Clock,
  Target,
  Flame,
  ArrowRight,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import { StatCard, Section, Badge, ProgressBar, EmptyState } from "../components/ui.jsx";
import { formatTime, formatDate, daysUntil, pluralize } from "../utils/index.js";

export default function Dashboard({ data, go }) {
  const { stats, schedule, tasks, toggleTask, studyLog } = data;
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const weekHours = studyLog
    .filter((l) => daysUntil(l.date) >= -6 && daysUntil(l.date) <= 0)
    .reduce((a, b) => a + (b.hours || 0), 0);

  const streak = (() => {
    const days = new Set(studyLog.map((l) => l.date));
    let s = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      if (days.has(d)) s++;
      else if (i > 0) break;
    }
    return s;
  })();

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand-700/40 via-brand-900/30 to-accent-700/20 p-6 sm:p-8">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent-500/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-brand-200">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">Your study cockpit</span>
          </div>
          <h2 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">
            {greeting}, ready to learn? <span className="text-brand-300">Let's go.</span>
          </h2>
          <p className="mt-2 max-w-xl text-sm text-slate-300">
            You have {stats.todayTasks.length} task{stats.todayTasks.length === 1 ? "" : "s"} today and{" "}
            {schedule.length} study sessions scheduled. Keep your streak alive — you're at{" "}
            <span className="font-semibold text-amber-300">{pluralize(streak, "day")}</span>.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button className="btn-primary" onClick={() => go("planner")}>
              <Sparkles className="h-4 w-4" /> Open AI Planner
            </button>
            <button className="btn-ghost" onClick={() => go("assistant")}>
              Ask AI Assistant <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={CheckSquare} label="Pending Tasks" value={stats.pending} sub={`${stats.done} completed`} accent="brand" />
        <StatCard icon={Clock} label="Today's Sessions" value={schedule.length} sub={`${schedule.reduce((a, s) => a + s.duration, 0)}h total`} accent="accent" />
        <StatCard icon={Flame} label="Study Streak" value={`${streak}d`} sub="Keep it going" accent="amber" />
        <StatCard icon={Target} label="Week Study Hours" value={weekHours.toFixed(1)} sub={`${stats.totalStudyHours.toFixed(1)}h all-time`} accent="emerald" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's schedule */}
        <Section
          title="Today's Schedule"
          subtitle="AI-generated study sessions"
          className="lg:col-span-2"
          action={<Badge tone="accent"><CalendarDays className="h-3 w-3" /> {formatDate(new Date().toISOString().slice(0,10))}</Badge>}
        >
          {schedule.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No sessions today" subtitle="Generate a plan in the AI Study Planner." action={<button className="btn-primary" onClick={() => go("planner")}><Sparkles className="h-4 w-4" /> Create plan</button>} />
          ) : (
            <div className="space-y-2">
              {schedule
                .sort((a, b) => a.time - b.time)
                .map((s) => (
                  <div key={s.id} className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.03] p-3 transition-all hover:bg-white/[0.06]">
                    <div className="w-20 shrink-0 text-right">
                      <div className="font-display text-sm font-semibold text-white">{formatTime(s.time)}</div>
                      <div className="text-[11px] text-slate-400">{s.duration}h</div>
                    </div>
                    <div className="h-10 w-1 rounded-full bg-gradient-to-b from-brand-400 to-accent-500" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-white">{s.title}</div>
                      <div className="text-xs text-slate-400">{s.subject}</div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Section>

        {/* Upcoming deadlines */}
        <Section title="Upcoming Deadlines" subtitle="Next assignments due">
          {stats.upcoming.length === 0 ? (
            <EmptyState icon={Target} title="All clear" subtitle="No upcoming deadlines. Add a task to get started." action={<button className="btn-ghost" onClick={() => go("tasks")}>Add task</button>} />
          ) : (
            <div className="space-y-2">
              {stats.upcoming.map((t) => {
                const days = daysUntil(t.due);
                const tone = days <= 1 ? "rose" : days <= 3 ? "amber" : "brand";
                return (
                  <div key={t.id} className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-white">{t.title}</span>
                      <Badge tone={tone}>{days === 0 ? "Today" : days < 0 ? "Overdue" : pluralize(days, "day")}</Badge>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                      <span>{t.subject}</span>
                      <span>{formatDate(t.due)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick tasks */}
        <Section
          title="Today's Tasks"
          subtitle="Tap to complete"
          className="lg:col-span-2"
          action={<button className="btn-ghost text-xs" onClick={() => go("tasks")}>View all <ArrowRight className="h-3.5 w-3.5" /></button>}
        >
          {stats.todayTasks.length === 0 ? (
            <EmptyState icon={CheckSquare} title="No tasks today" subtitle="Enjoy the breather or plan ahead." />
          ) : (
            <div className="space-y-2">
              {stats.todayTasks.map((t) => (
                <label key={t.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3 hover:bg-white/[0.06]">
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={() => toggleTask(t.id)}
                    className="h-5 w-5 shrink-0 rounded-md border-white/20 bg-white/5 text-brand-500 focus:ring-brand-500/40"
                  />
                  <span className={`flex-1 text-sm ${t.done ? "text-slate-500 line-through" : "text-white"}`}>{t.title}</span>
                  <Badge tone={t.priority === "high" ? "rose" : t.priority === "medium" ? "amber" : "slate"}>{t.priority}</Badge>
                </label>
              ))}
            </div>
          )}
        </Section>

        {/* Weekly progress */}
        <Section title="Weekly Progress" subtitle="Tasks completed this week">
          <div className="space-y-4">
            {weeklyProgress(tasks).map((d) => (
              <div key={d.day}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-300">{d.day}</span>
                  <span className="text-slate-400">{d.done}/{d.total}</span>
                </div>
                <ProgressBar value={d.done} max={Math.max(1, d.total)} />
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function weeklyProgress(tasks) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const out = days.map((d) => ({ day: d, done: 0, total: 0 }));
  const today = new Date();
  const startIdx = (today.getDay() + 6) % 7; // Monday=0
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - startIdx + i);
    const iso = date.toISOString().slice(0, 10);
    const dayTasks = tasks.filter((t) => t.due === iso);
    out[i].total = dayTasks.length;
    out[i].done = dayTasks.filter((t) => t.done).length;
  }
  return out;
}
