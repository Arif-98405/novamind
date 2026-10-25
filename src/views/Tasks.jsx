import { useState } from "react";
import { Plus, Trash2, Edit2, Check, X, CheckSquare } from "lucide-react";
import { Section, Badge, EmptyState } from "../components/ui.jsx";
import { formatDate, daysUntil, todayISO } from "../utils/index.js";

const TYPES = [
  { value: "assignment", label: "Assignment", tone: "brand" },
  { value: "study", label: "Study", tone: "accent" },
  { value: "personal", label: "Personal", tone: "slate" },
];
const PRIORITIES = ["low", "medium", "high"];

export default function Tasks({ data }) {
  const { tasks, addTask, updateTask, deleteTask, toggleTask } = data;
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const filtered = tasks.filter((t) => {
    if (filter === "pending") return !t.done;
    if (filter === "done") return t.done;
    if (filter === "today") return t.due === todayISO();
    return true;
  }).sort((a, b) => (a.done - b.done) || (a.due || "").localeCompare(b.due || ""));

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (editing) {
      updateTask(editing, form);
      setEditing(null);
    } else {
      addTask(form);
    }
    setForm(emptyForm());
  };

  const startEdit = (t) => {
    setEditing(t.id);
    setForm({ title: t.title, subject: t.subject, type: t.type, due: t.due, priority: t.priority });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Form */}
      <div className="lg:col-span-2">
        <Section title={editing ? "Edit Task" : "Add Task"} subtitle="Stay on top of assignments and study goals">
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="label">Title</label>
              <input className="input" placeholder="e.g. Finish lab report" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Subject</label>
                <input className="input" placeholder="Biology" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              </div>
              <div>
                <label className="label">Due date</label>
                <input type="date" className="input" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Type</label>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Priority</label>
                <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1">
                {editing ? <><Check className="h-4 w-4" /> Save changes</> : <><Plus className="h-4 w-4" /> Add task</>}
              </button>
              {editing && (
                <button type="button" className="btn-ghost" onClick={() => { setEditing(null); setForm(emptyForm()); }}>
                  <X className="h-4 w-4" /> Cancel
                </button>
              )}
            </div>
          </form>
        </Section>
      </div>

      {/* List */}
      <div className="lg:col-span-3">
        <Section
          title="Your Tasks"
          subtitle={`${tasks.length} total · ${tasks.filter((t) => !t.done).length} pending`}
          action={
            <div className="flex flex-wrap gap-1">
              {["all", "pending", "today", "done"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all ${
                    filter === f ? "bg-brand-500/20 text-brand-200 border border-brand-500/40" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          }
        >
          {filtered.length === 0 ? (
            <EmptyState icon={CheckSquare} title="No tasks here" subtitle="Add a task to get started." />
          ) : (
            <div className="space-y-2">
              {filtered.map((t) => {
                const days = daysUntil(t.due);
                const overdue = !t.done && days < 0;
                const typeMeta = TYPES.find((x) => x.value === t.type) || TYPES[0];
                return (
                  <div
                    key={t.id}
                    className={`group flex items-center gap-3 rounded-xl border p-3 transition-all ${
                      t.done ? "border-white/5 bg-white/[0.01] opacity-60" : "border-white/5 bg-white/[0.03] hover:bg-white/[0.06]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={() => toggleTask(t.id)}
                      className="h-5 w-5 shrink-0 rounded-md border-white/20 bg-white/5 text-brand-500 focus:ring-brand-500/40"
                    />
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-sm font-medium ${t.done ? "text-slate-500 line-through" : "text-white"}`}>{t.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                        {t.subject && <span className="text-slate-400">{t.subject}</span>}
                        <Badge tone={typeMeta.tone}>{typeMeta.label}</Badge>
                        <Badge tone={t.priority === "high" ? "rose" : t.priority === "medium" ? "amber" : "slate"}>{t.priority}</Badge>
                        {t.due && (
                          <Badge tone={overdue ? "rose" : days <= 1 ? "amber" : "slate"}>
                            {overdue ? "Overdue" : days === 0 ? "Today" : formatDate(t.due)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1 transition-opacity group-hover:opacity-100 max-lg:opacity-100 lg:opacity-0">
                      <button onClick={() => startEdit(t)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteTask(t.id)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-300">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function emptyForm() {
  return { title: "", subject: "", type: "assignment", due: todayISO(), priority: "medium" };
}
