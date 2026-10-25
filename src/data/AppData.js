import { useCallback, useMemo } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { todayISO, uid } from "../utils/index.js";

const seedTasks = () => [
  {
    id: uid(),
    title: "Finish Calculus problem set 4",
    subject: "Mathematics",
    type: "assignment",
    due: todayISO(),
    done: false,
    priority: "high",
    createdAt: Date.now(),
  },
  {
    id: uid(),
    title: "Read Chapter 7 — Organic Chemistry",
    subject: "Chemistry",
    type: "study",
    due: todayISO(),
    done: false,
    priority: "medium",
    createdAt: Date.now(),
  },
  {
    id: uid(),
    title: "Submit History essay draft",
    subject: "History",
    type: "assignment",
    due: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    done: false,
    priority: "high",
    createdAt: Date.now(),
  },
  {
    id: uid(),
    title: "Review Physics flashcards",
    subject: "Physics",
    type: "study",
    due: new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10),
    done: true,
    priority: "low",
    createdAt: Date.now() - 86400000,
    completedAt: Date.now() - 3600000,
  },
];

const seedSchedule = () => [
  { id: uid(), time: 9, title: "Calculus — Practice problems", subject: "Mathematics", duration: 1.5 },
  { id: uid(), time: 11, title: "Chemistry — Chapter reading", subject: "Chemistry", duration: 1 },
  { id: uid(), time: 14, title: "History — Essay outline", subject: "History", duration: 1 },
  { id: uid(), time: 16.5, title: "Physics — Flashcards review", subject: "Physics", duration: 0.5 },
];

export function useAppData() {
  const [tasks, setTasks] = useLocalStorage("novamind:tasks", seedTasks);
  const [schedule, setSchedule] = useLocalStorage("novamind:schedule", seedSchedule);
  const [plannerInput, setPlannerInput] = useLocalStorage("novamind:plannerInput", null);
  const [studyLog, setStudyLog] = useLocalStorage("novamind:studyLog", []);
  const [summaries, setSummaries] = useLocalStorage("novamind:summaries", []);
  const [chats, setChats] = useLocalStorage("novamind:chats", []);

  const addTask = useCallback(
    (task) => setTasks((prev) => [{ ...task, id: uid(), createdAt: Date.now() }, ...prev]),
    [setTasks]
  );
  const updateTask = useCallback(
    (id, patch) =>
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          const done = patch.done !== undefined ? patch.done : t.done;
          return {
            ...t,
            ...patch,
            completedAt: done ? t.completedAt || Date.now() : null,
          };
        })
      ),
    [setTasks]
  );
  const deleteTask = useCallback(
    (id) => setTasks((prev) => prev.filter((t) => t.id !== id)),
    [setTasks]
  );
  const toggleTask = useCallback(
    (id) =>
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, done: !t.done, completedAt: !t.done ? Date.now() : null } : t
        )
      ),
    [setTasks]
  );

  const logStudy = useCallback(
    (entry) => setStudyLog((prev) => [{ ...entry, id: uid(), date: todayISO(), at: Date.now() }, ...prev]),
    [setStudyLog]
  );

  const addSummary = useCallback(
    (s) => setSummaries((prev) => [{ ...s, id: uid(), at: Date.now() }, ...prev]),
    [setSummaries]
  );
  const deleteSummary = useCallback(
    (id) => setSummaries((prev) => prev.filter((s) => s.id !== id)),
    [setSummaries]
  );

  const addChat = useCallback(
    (c) => setChats((prev) => [...prev, { ...c, id: uid(), at: Date.now() }]),
    [setChats]
  );
  const clearChats = useCallback(() => setChats([]), [setChats]);

  const stats = useMemo(() => {
    const done = tasks.filter((t) => t.done).length;
    const pending = tasks.length - done;
    const todayTasks = tasks.filter((t) => t.due === todayISO());
    const upcoming = tasks
      .filter((t) => !t.done && t.due && t.due >= todayISO())
      .sort((a, b) => a.due.localeCompare(b.due))
      .slice(0, 6);
    const totalStudyHours = studyLog.reduce((sum, l) => sum + (l.hours || 0), 0);
    return { done, pending, total: tasks.length, todayTasks, upcoming, totalStudyHours };
  }, [tasks, studyLog]);

  return {
    tasks,
    schedule,
    setSchedule,
    plannerInput,
    setPlannerInput,
    studyLog,
    logStudy,
    summaries,
    addSummary,
    deleteSummary,
    chats,
    addChat,
    clearChats,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    stats,
  };
}
