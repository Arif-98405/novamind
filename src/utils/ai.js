// Demo AI engine — locally generated responses (no external model).
// Clearly labeled as demo so it's never mistaken for real AI output.

export function generateStudyPlan({ subjects, hoursPerDay, examDates, startDate }) {
  // subjects: [{ name, difficulty }]  examDates: { [subject]: "YYYY-MM-DD" }
  // Build a weekly rotation that weights subjects by proximity to exam & difficulty.
  const start = startDate ? new Date(startDate + "T00:00:00") : new Date();
  start.setHours(0, 0, 0, 0);

  const items = subjects.map((s) => {
    const exam = examDates[s.name];
    const daysToExam = exam
      ? Math.max(1, Math.round((new Date(exam + "T00:00:00") - start) / 86400000))
      : 30;
    const difficultyWeight = { easy: 1, medium: 1.5, hard: 2 }[s.difficulty] || 1.5;
    const weight = difficultyWeight * (1 / Math.sqrt(daysToExam));
    return { ...s, exam, daysToExam, weight };
  });
  const totalWeight = items.reduce((a, b) => a + b.weight, 0);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const slots = [
    { time: 9, label: "Morning" },
    { time: 11, label: "Late Morning" },
    { time: 14, label: "Afternoon" },
    { time: 16.5, label: "Evening" },
    { time: 19, label: "Night" },
  ];

  const perDayBudget = Math.max(1, Number(hoursPerDay) || 3);
  // how many slots to fill per day based on hours (each slot ~1.25h)
  const slotsPerDay = Math.min(slots.length, Math.max(1, Math.round(perDayBudget / 1.25)));

  const plan = [];
  for (let d = 0; d < 7; d++) {
    const day = { day: days[d], sessions: [] };
    // shuffle subject weights a bit by day so rotation feels natural
    const dayShift = items.map((it, i) => ({
      ...it,
      dayWeight: it.weight * (1 + ((d + i) % 3) * 0.1),
    }));
    dayShift.sort((a, b) => b.dayWeight - a.dayWeight);
    for (let sIdx = 0; sIdx < slotsPerDay; sIdx++) {
      const subj = dayShift[sIdx % dayShift.length];
      const slot = slots[sIdx];
      day.sessions.push({
        time: slot.time,
        label: slot.label,
        subject: subj.name,
        difficulty: subj.difficulty,
        exam: subj.exam,
        focus:
          subj.daysToExam <= 5
            ? "Final review + past papers"
            : subj.daysToExam <= 14
            ? "Active recall + practice questions"
            : "New concepts + note taking",
        hours: Math.min(1.25, Math.round((perDayBudget / slotsPerDay) * 100) / 100),
      });
    }
    plan.push(day);
  }
  return { plan, totalWeight, generatedAt: Date.now(), hoursPerDay: perDayBudget };
}

export function summarizeText(text, maxSentences = 4) {
  // Lightweight extractive summary (top sentences by word-frequency score).
  const sentences = text
    .replace(/\s+/g, " ")
    .match(/[^.!?]+[.!?]/g) || [text];
  if (sentences.length <= maxSentences) {
    return { summary: sentences.join(" ").trim(), questions: makeQuestions(text) };
  }
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const freq = {};
  words.forEach((w) => (freq[w] = (freq[w] || 0) + 1));
  const stop = new Set(["this","that","with","from","have","they","their","there","which","where","when","what","will","your","about","into","some","more","such","than","then","them","were","been","also","only","very","much","many","most","like"]);
  const scored = sentences.map((s, i) => {
    const sw = s.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const score = sw.reduce((a, w) => a + (stop.has(w) ? 0 : freq[w] || 0), 0) / Math.max(1, sw.length);
    return { s, i, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, maxSentences).sort((a, b) => a.i - b.i).map((x) => x.s.trim());
  return { summary: top.join(" "), questions: makeQuestions(text) };
}

function makeQuestions(text) {
  const words = (text.toLowerCase().match(/\b[a-z]{5,}\b/g) || []);
  const freq = {};
  words.forEach((w) => (freq[w] = (freq[w] || 0) + 1));
  const topWords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x[0]);
  const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
  return [
    `What is the main idea discussed in this passage?`,
    ...(topWords[0] ? [`Explain the significance of "${topWords[0]}" in the context above.`] : []),
    `How would you summarize this in three bullet points?`,
    ...(topWords[1] ? [`What role does "${topWords[1]}" play? Give an example.`] : []),
    `What follow-up question would help deepen understanding of this topic?`,
  ];
}
