import { useState } from "react";
import { Sparkles, Plus, Trash2, Wand2, Clock, Calendar, Target, Save } from "lucide-react";
import { Section, Badge, EmptyState } from "../components/ui.jsx";
import { generateStudyPlan } from "../utils/ai.js";
import { formatTime, formatDate, daysUntil } from "../utils/index.js";

const DIFFS = [
  { value: "easy", label: "Easy", tone: "emerald" },
  { value: "medium", label: "Medium", tone: "amber" },
  { value: "hard", label: "Hard", tone: "rose" },
];

export default function Planner({ data }) {
  const { plannerInput, setPlannerInput, setSchedule } = data;
  const [subjects, setSubjects] = useState(
    plannerInput?.subjects || [{ name: "Mathematics", difficulty: "hard" }, { name: "Chemistry", difficulty: "medium" }]
  );
  const [hoursPerDay, setHoursPerDay] = useState(plannerInput?.hoursPerDay || 4);
  const [examDates, setExamDates] = useState(plannerInput?.examDates || {});
  const [startDate, setStartDate] = useState(plannerInput?.startDate || new Date().toISOString().slice(0, 10));
  const [plan, setPlan] = useState(plannerInput?.plan || null);
  const [busy, setBusy] = useState(false);

  const addSubject = () => setSubjects((p) => [...p, { name: "", difficulty: "medium" }]);
  const removeSubject = (i) => setSubjects((p) => p.filter((_, idx) => idx !== i));
  const updateSubject = (i, patch) =>
    setSubjects((p) => p.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const generate = () => {
    setBusy(true);
    setTimeout(() => {
      const clean = subjects.filter((s) => s.name.trim());
      const result = generateStudyPlan({ subjects: clean, hoursPerDay, examDates, startDate });
      setPlan(result);
      setPlannerInput({ subjects: clean, hoursPerDay, examDates, startDate, plan: result });
      setBusy(false);
    }, 600);
  };

  const applyToSchedule = () => {
    if (!plan) return;
    const today = plan.plan.find((d) => d.day === ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()]);
    const sessions = (today || plan.plan[0]).sessions.map((s) => ({
      id: Math.random().toString(36).slice(2),
      time: s.time,
      title: `${s.subject} — ${s.focus}`,
      subject: s.subject,
      duration: s.hours,
    }));
    setSchedule(sessions);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Form */}
      <div className="space-y-6 lg:col-span-2">
        <Section title="Plan Builder" subtitle="Tell NovaMind what to plan around">
          <div className="space-y-4">
            <div>
              <label className="label">Start date</label>
              <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Available study hours per day</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  className="flex-1 accent-brand-500"
                />
                <span className="w-14 rounded-lg bg-white/5 px-2 py-1 text-center text-sm font-semibold text-white">
                  {hoursPerDay}h
                </span>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="label !mb-0">Subjects</label>
                <button onClick={addSubject} className="btn-ghost !px-2.5 !py-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
              <div className="space-y-2">
                {subjects.map((s, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center gap-2">
                      <input
                        className="input !py-2"
                        placeholder="Subject name"
                        value={s.name}
                        onChange={(e) => updateSubject(i, { name: e.target.value })}
                      />
                      <button
                        onClick={() => removeSubject(i)}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      {DIFFS.map((d) => (
                        <button
                          key={d.value}
                          onClick={() => updateSubject(i, { difficulty: d.value })}
                          className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-all ${
                            s.difficulty === d.value
                              ? `bg-${d.tone}-500/20 text-${d.tone}-300 border border-${d.tone}-500/40`
                              : "border border-white/10 bg-white/5 text-slate-400 hover:text-white"
                          }`}
                          style={s.difficulty === d.value ? { background: toneBg(d.tone), color: toneText(d.tone), borderColor: toneBorder(d.tone) } : {}}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2">
                      <label className="text-[11px] text-slate-400">Exam date (optional)</label>
                      <input
                        type="date"
                        className="input mt-1 !py-2"
                        value={examDates[s.name] || ""}
                        onChange={(e) =>
                          setExamDates((p) => ({ ...p, [s.name]: e.target.value }))
                        }
                      />
                      {examDates[s.name] && (
                        <div className="mt-1 text-[11px] text-brand-300">
                          {daysUntil(examDates[s.name])} days to exam
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button className="btn-primary w-full" onClick={generate} disabled={busy}>
              <Wand2 className="h-4 w-4" /> {busy ? "Generating..." : "Generate Study Plan"}
            </button>
            <p className="text-center text-[11px] text-slate-500">
              Demo AI: plan generated locally from your inputs.
            </p>
          </div>
        </Section>
      </div>

      {/* Result */}
      <div className="lg:col-span-3">
        <Section
          title="Generated Weekly Plan"
          subtitle={plan ? `${plan.hoursPerDay}h/day · ${plan.plan.reduce((a, d) => a + d.sessions.length, 0)} sessions` : "Your AI-generated timetable will appear here"}
          action={plan && <button className="btn-primary !py-2 text-xs" onClick={applyToSchedule}><Save className="h-3.5 w-3.5" /> Apply today</button>}
        >
          {!plan ? (
            <EmptyState
              icon={Sparkles}
              title="No plan yet"
              subtitle="Fill in your subjects and hours, then click Generate Study Plan."
            />
          ) : (
            <div className="space-y-4">
              {plan.plan.map((day, di) => (
                <div key={di} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500/30 to-accent-500/20 font-display text-sm font-bold text-brand-200">
                      {day.day[0]}
                    </div>
                    <h4 className="font-display text-sm font-semibold text-white">{day.day}</h4>
                    <span className="ml-auto text-xs text-slate-400">
                      {day.sessions.length} sessions · {day.sessions.reduce((a, s) => a + s.hours, 0)}h
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {day.sessions.map((s, si) => (
                      <div key={si} className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-display text-xs font-semibold text-brand-200">{formatTime(s.time)}</span>
                          <Badge tone={s.difficulty === "hard" ? "rose" : s.difficulty === "medium" ? "amber" : "emerald"}>
                            {s.difficulty}
                          </Badge>
                        </div>
                        <div className="mt-1.5 text-sm font-medium text-white">{s.subject}</div>
                        <div className="mt-0.5 text-xs text-slate-400">{s.focus}</div>
                        <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {s.hours}h</span>
                          {s.exam && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(s.exam)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function toneBg(t) { return { emerald: "rgba(16,185,129,0.18)", amber: "rgba(245,158,11,0.18)", rose: "rgba(244,63,94,0.18)" }[t]; }
function toneText(t) { return { emerald: "#6ee7b7", amber: "#fcd34d", rose: "#fda4af" }[t]; }
function toneBorder(t) { return { emerald: "rgba(16,185,129,0.4)", amber: "rgba(245,158,11,0.4)", rose: "rgba(244,63,94,0.4)" }[t]; }
