import { useState } from "react";
import { TrendingUp, Clock, Plus, Flame, Target, Award, BookOpen } from "lucide-react";
import { StatCard, Section, Badge, ProgressBar, EmptyState } from "../components/ui.jsx";
import { formatDate, daysUntil, pluralize } from "../utils/index.js";

function formatAgo(iso) {
  const d = daysUntil(iso);
  if (d === null) return "";
  if (d === 0) return "today";
  if (d === -1) return "yesterday";
  if (d < 0) return pluralize(-d, "day", "days") + " ago";
  return "in " + pluralize(d, "day", "days");
}

export default function Progress({ data }) {
  const { tasks, studyLog, logStudy } = data;
  const [hours, setHours] = useState(1);
  const [subject, setSubject] = useState("");

  const totalDone = tasks.filter((t) => t.done).length;
  const totalHours = studyLog.reduce((a, l) => a + (l.hours || 0), 0);

  const streak = (() => {
    const days = new Set(studyLog.map((l) => l.date));
    let s = 0;
    for (let i = 0; i < 60; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      if (days.has(d)) s++;
      else if (i > 0) break;
    }
    return s;
  })();

  // last 14 days hours
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(Date.now() - (13 - i) * 86400000);
    const iso = date.toISOString().slice(0, 10);
    const h = studyLog.filter((l) => l.date === iso).reduce((a, l) => a + (l.hours || 0), 0);
    return { iso, h, label: date.toLocaleDateString(undefined, { weekday: "short" }) };
  });
  const maxH = Math.max(1, ...last14.map((d) => d.h));

  // subject breakdown
  const bySubject = {};
  tasks.forEach((t) => {
    const s = t.subject || "General";
    bySubject[s] = bySubject[s] || { total: 0, done: 0 };
    bySubject[s].total++;
    if (t.done) bySubject[s].done++;
  });
  const subjectList = Object.entries(bySubject).sort((a, b) => b[1].total - a[1].total);

  const addLog = (e) => {
    e.preventDefault();
    if (hours <= 0) return;
    logStudy({ hours: Number(hours), subject: subject || "General" });
    setSubject("");
    setHours(1);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Target} label="Tasks Completed" value={totalDone} sub={`of ${tasks.length}`} accent="emerald" />
        <StatCard icon={Clock} label="Total Study Hours" value={totalHours.toFixed(1)} sub="all-time" accent="brand" />
        <StatCard icon={Flame} label="Current Streak" value={`${streak}d`} sub={streak > 0 ? "On fire" : "Start today"} accent="amber" />
        <StatCard icon={Award} label="Completion Rate" value={`${tasks.length ? Math.round((totalDone / tasks.length) * 100) : 0}%`} sub="of all tasks" accent="accent" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Study Hours — Last 14 Days" subtitle="Log sessions to fill the chart" className="lg:col-span-2">
          <div className="flex h-52 items-end gap-1.5">
            {last14.map((d, i) => (
              <div key={i} className="group flex flex-1 flex-col items-center gap-1.5">
                <div className="relative flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-brand-600 to-accent-500 transition-all duration-500 hover:from-brand-500 hover:to-accent-400"
                    style={{ height: `${(d.h / maxH) * 100}%`, minHeight: d.h > 0 ? "4px" : "2px", opacity: d.h > 0 ? 1 : 0.15 }}
                  />
                  <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {d.h}h
                  </div>
                </div>
                <span className="text-[10px] text-slate-500">{d.label[0]}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Log Study Session" subtitle="Track time you spent studying">
          <form onSubmit={addLog} className="space-y-3">
            <div>
              <label className="label">Subject</label>
              <input className="input" placeholder="e.g. Mathematics" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div>
              <label className="label">Hours studied</label>
              <div className="flex items-center gap-3">
                <input type="range" min={0.5} max={8} step={0.5} value={hours} onChange={(e) => setHours(Number(e.target.value))} className="flex-1 accent-brand-500" />
                <span className="w-14 rounded-lg bg-white/5 px-2 py-1 text-center text-sm font-semibold text-white">{hours}h</span>
              </div>
            </div>
            <button className="btn-primary w-full"><Plus className="h-4 w-4" /> Log session</button>
          </form>
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Subject Progress" subtitle="Completion by subject">
          {subjectList.length === 0 ? (
            <EmptyState icon={BookOpen} title="No subjects yet" subtitle="Add tasks with subjects to see progress." />
          ) : (
            <div className="space-y-3">
              {subjectList.map(([name, s]) => (
                <div key={name}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200">{name}</span>
                    <span className="text-slate-400">{s.done}/{s.total}</span>
                  </div>
                  <ProgressBar value={s.done} max={s.total} tone="emerald" />
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Recent Study Sessions" subtitle={`${studyLog.length} logged`}>
          {studyLog.length === 0 ? (
            <EmptyState icon={Clock} title="No sessions logged" subtitle="Use the form to log your first study session." />
          ) : (
            <div className="space-y-2">
              {studyLog.slice(0, 8).map((l) => (
                <div key={l.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-brand-500/20 to-accent-500/10 text-brand-300">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white">{l.subject}</div>
                    <div className="text-xs text-slate-400">{formatDate(l.date)} · {formatAgo(l.date)}</div>
                  </div>
                  <Badge tone="brand">{l.hours}h</Badge>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
