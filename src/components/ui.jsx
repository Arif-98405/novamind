export function StatCard({ icon: Icon, label, value, sub, accent = "brand" }) {
  const accents = {
    brand: "from-brand-500/20 to-brand-700/10 text-brand-300",
    accent: "from-accent-500/20 to-accent-700/10 text-accent-400",
    emerald: "from-emerald-500/20 to-emerald-700/10 text-emerald-300",
    amber: "from-amber-500/20 to-amber-700/10 text-amber-300",
    sky: "from-sky-500/20 to-sky-700/10 text-sky-300",
  };
  return (
    <div className="card group p-5 hover:-translate-y-0.5 hover:border-white/20">
      <div className="flex items-start justify-between">
        <div>
          <div className="label">{label}</div>
          <div className="mt-1 font-display text-3xl font-bold text-white">{value}</div>
          {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
        </div>
        <div className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${accents[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function Section({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`card p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold text-white">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Badge({ children, tone = "brand" }) {
  const tones = {
    brand: "bg-brand-500/15 text-brand-300 border-brand-500/30",
    accent: "bg-accent-500/15 text-accent-400 border-accent-500/30",
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    rose: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    slate: "bg-white/5 text-slate-300 border-white/10",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
      {Icon && (
        <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500/20 to-accent-500/10 text-brand-300">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <div className="font-display text-base font-semibold text-white">{title}</div>
      {subtitle && <p className="mt-1 max-w-sm text-sm text-slate-400">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, max = 100, tone = "brand" }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const tones = {
    brand: "from-brand-500 to-accent-500",
    emerald: "from-emerald-400 to-emerald-500",
    amber: "from-amber-400 to-amber-500",
  };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${tones[tone]} transition-all duration-700`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
