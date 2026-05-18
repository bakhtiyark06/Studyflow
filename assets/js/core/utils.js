export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function esc(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function today() {
  return new Date().toISOString().split("T")[0];
}

export function daysUntil(dateString) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const then = new Date(dateString);
  then.setHours(0, 0, 0, 0);
  return Math.round((then - now) / 86400000);
}

export function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

export function durationLabel(minutes = 0) {
  const safe = Math.max(0, Number(minutes) || 0);
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  if (!hours) return `${mins}m`;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

export function timeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function allCourses(state) {
  return [...new Set([
    ...state.assignments.map((item) => item.course),
    ...state.exams.map((item) => item.course),
    ...state.study.map((item) => item.course),
    ...state.notes.map((item) => item.course),
    ...state.classes.map((item) => item.name),
  ].filter(Boolean))].sort();
}

export function classNameFor(state, classId, fallback = "") {
  const item = state.classes.find((classItem) => classItem.id === classId);
  return item?.name || fallback || "";
}

export function classOptions(state, selectedId = "") {
  return [
    '<option value="">No linked class</option>',
    ...state.classes.map((classItem) => `<option value="${esc(classItem.id)}" ${classItem.id === selectedId ? "selected" : ""}>${esc(classItem.name)}</option>`),
  ].join("");
}

export function totalStudyMinutes(study = []) {
  return study.reduce((sum, session) => sum + (Number(session.duration) || 0), 0);
}

export function studyStreak(study = []) {
  const days = new Set(study.map((session) => String(session.date || "").split("T")[0]));
  let streak = 0;
  const ref = new Date();
  for (let i = 0; i < 365; i += 1) {
    const key = new Date(ref.getTime() - i * 86400000).toISOString().split("T")[0];
    if (!days.has(key)) break;
    streak += 1;
  }
  return streak;
}
