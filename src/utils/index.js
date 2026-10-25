export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

export const formatTime = (h) => {
  const hour = Math.floor(h);
  const m = Math.round((h - hour) * 60);
  const ampm = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
};

export const daysUntil = (iso) => {
  if (!iso) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(iso + "T00:00:00");
  return Math.round((target - now) / 86400000);
};

export const pluralize = (n, word, plural) =>
  `${n} ${n === 1 ? word : plural || word + "s"}`;
