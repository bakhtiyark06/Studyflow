import { classNameFor, daysUntil, esc, today, totalStudyMinutes } from "./utils.js";

export const WEEKLY_FOCUS_GOAL = 600;

export const REMINDER_OPTIONS = [
  { value: "", label: "Use default reminder" },
  { value: "day-of", label: "Day of deadline" },
  { value: "1d", label: "1 day before" },
  { value: "2d", label: "2 days before" },
  { value: "1w", label: "1 week before" },
  { value: "custom", label: "Custom date/time" },
  { value: "none", label: "No reminder" },
];

export function reminderOptions(selected = "") {
  return REMINDER_OPTIONS
    .map((item) => `<option value="${esc(item.value)}" ${item.value === selected ? "selected" : ""}>${esc(item.label)}</option>`)
    .join("");
}

export function startOfWeek(reference = new Date()) {
  const date = new Date(reference);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function isInCurrentWeek(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const start = startOfWeek();
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return date >= start && date < end;
}

export function isToday(value) {
  if (!value) return false;
  return String(value).slice(0, 10) === today();
}

export function priorityWeight(priority = "medium") {
  return { high: 0, medium: 1, low: 2 }[priority] ?? 1;
}

export function difficultyWeight(difficulty = "medium") {
  return { hard: 0, medium: 1, easy: 2 }[difficulty] ?? 1;
}

export function assignmentDueSoon(item) {
  const due = daysUntil(item.dueDate);
  return !item.done && due >= 0 && due <= 7;
}

export function examSoon(item) {
  const examDate = new Date(item.date);
  return !item.done && examDate > new Date() && daysUntil(item.date) <= 7;
}

export function focusPercent(studyMinutes) {
  return Math.min(100, Math.round((studyMinutes / WEEKLY_FOCUS_GOAL) * 100));
}

export function workloadStatus(score) {
  if (score >= 76) return "Extremely Cooked";
  if (score >= 46) return "Cooked";
  if (score >= 21) return "Slightly Cooked";
  return "Not Cooked";
}

export function workloadTone(status) {
  return {
    "Not Cooked": "not-cooked",
    "Slightly Cooked": "slightly-cooked",
    Cooked: "cooked",
    "Extremely Cooked": "extremely-cooked",
  }[status] || "not-cooked";
}

export function activeAssignments(state) {
  return state.assignments.filter((item) => !item.done);
}

export function completedAssignments(state) {
  return state.assignments.filter((item) => item.done);
}

export function activeExams(state) {
  return state.exams.filter((item) => !item.done);
}

export function completedExams(state) {
  return state.exams.filter((item) => item.done);
}

export function weeklyStudySessions(state) {
  return state.study.filter((item) => isInCurrentWeek(item.date));
}

export function dashboardMetrics(state) {
  const pending = activeAssignments(state);
  const activeExamList = activeExams(state);
  const overdue = pending.filter((item) => daysUntil(item.dueDate) < 0);
  const dueThisWeek = pending.filter(assignmentDueSoon);
  const examsThisWeek = activeExamList.filter(examSoon);
  const weeklyStudy = weeklyStudySessions(state);
  const weeklyStudyMins = totalStudyMinutes(weeklyStudy);
  const completedAssignmentCount = completedAssignments(state).length;
  const completionPercent = state.assignments.length
    ? Math.round((completedAssignmentCount / state.assignments.length) * 100)
    : 0;
  return {
    pending,
    activeExamList,
    overdue,
    dueThisWeek,
    examsThisWeek,
    weeklyStudy,
    weeklyStudyMins,
    weeklyFocus: focusPercent(weeklyStudyMins),
    completedAssignmentCount,
    completedExamCount: completedExams(state).length,
    completionPercent,
    studiedToday: state.study.some((item) => isToday(item.date)),
  };
}

export function workloadReport(state) {
  const metrics = dashboardMetrics(state);
  const score = Math.max(0, Math.min(100,
    metrics.dueThisWeek.length * 14
    + metrics.examsThisWeek.length * 22
    + metrics.overdue.length * 20
    - Math.min(18, Math.floor(metrics.weeklyStudyMins / 35))
  ));
  const status = workloadStatus(score);
  const assignmentText = `${metrics.dueThisWeek.length} assignment${metrics.dueThisWeek.length === 1 ? "" : "s"}`;
  const examText = `${metrics.examsThisWeek.length} exam${metrics.examsThisWeek.length === 1 ? "" : "s"}`;
  const overdueText = metrics.overdue.length ? ` ${metrics.overdue.length} overdue task${metrics.overdue.length === 1 ? "" : "s"} need attention.` : "";
  return {
    score,
    status,
    tone: workloadTone(status),
    explanation: `You have ${assignmentText} and ${examText} coming up this week.${overdueText}`,
  };
}

export function rankedWorkItems(state) {
  const assignments = activeAssignments(state).map((item) => {
    const due = daysUntil(item.dueDate);
    return {
      id: `assignment:${item.id}`,
      sourceId: item.id,
      type: "assignment",
      title: item.title,
      classLabel: classNameFor(state, item.classId, item.course),
      date: item.dueDate,
      days: due,
      priority: item.priority || "medium",
      score: (due < 0 ? -80 : due * 8) + priorityWeight(item.priority) * 16 + (Number(item.estimatedMinutes) || 45) / 30,
      action: due < 0
        ? `Finish ${item.title} today so it stops dragging your week down.`
        : `Work on ${item.title} for 45 minutes today.`,
    };
  });

  const exams = activeExams(state).map((item) => {
    const due = daysUntil(item.date);
    return {
      id: `exam:${item.id}`,
      sourceId: item.id,
      type: "exam",
      title: item.title,
      classLabel: classNameFor(state, item.classId, item.course),
      date: item.date,
      days: due,
      priority: item.difficulty || item.priority || "medium",
      score: due * 7 + difficultyWeight(item.difficulty || item.priority) * 18,
      action: `Review for ${item.title} for 45 minutes today.`,
    };
  });

  return [...assignments, ...exams].sort((a, b) => a.score - b.score);
}

export function nextMove(state) {
  const [item] = rankedWorkItems(state);
  if (!item) return "You're clear for now. Add your assignments to get smarter recommendations.";
  return `Your next move: ${item.action}`;
}

export function reminderLabel(item, fallback = "") {
  const preset = item.reminderPreset || fallback;
  const match = REMINDER_OPTIONS.find((option) => option.value === preset);
  if (preset === "custom" && item.reminderAt) return `Reminder: ${new Date(item.reminderAt).toLocaleString()}`;
  return match?.label || "Use default reminder";
}

function reminderLeadDays(preset) {
  return {
    "day-of": 0,
    "1d": 1,
    "2d": 2,
    "1w": 7,
  }[preset] ?? 0;
}

function applyTime(date, time = "09:00") {
  const [hours, minutes] = String(time || "09:00").split(":").map(Number);
  date.setHours(Number.isFinite(hours) ? hours : 9, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return date;
}

export function reminderDateFor(item, kind, settings = {}) {
  const isExam = kind === "exam";
  const preset = item.reminderPreset || (isExam ? settings.defaultExamReminder : settings.defaultAssignmentReminder) || (isExam ? "2d" : "1d");
  if (preset === "none") return null;
  if (preset === "custom") return item.reminderAt ? new Date(item.reminderAt) : null;

  const sourceDate = item.date || item.dueDate;
  if (!sourceDate) return null;
  const date = new Date(sourceDate);
  if (Number.isNaN(date.getTime())) return null;
  if (!isExam || !String(sourceDate).includes("T")) {
    applyTime(date, isExam ? settings.defaultExamReminderTime : settings.defaultAssignmentReminderTime);
  }
  date.setDate(date.getDate() - reminderLeadDays(preset));
  return date;
}

export function reminderDueNow(item, kind, settings = {}) {
  const reminderDate = reminderDateFor(item, kind, settings);
  if (!reminderDate) return false;
  return reminderDate <= new Date();
}

export function classWorkloadOverview(state) {
  return state.classes.map((classItem) => {
    const assignments = activeAssignments(state).filter((item) => item.classId === classItem.id);
    const exams = activeExams(state).filter((item) => item.classId === classItem.id);
    const overdue = assignments.filter((item) => daysUntil(item.dueDate) < 0);
    return {
      ...classItem,
      assignments,
      exams,
      overdue,
      load: assignments.length + exams.length * 2 + overdue.length * 2,
    };
  }).sort((a, b) => b.load - a.load || a.name.localeCompare(b.name));
}

export function buildAlertItems(state, { includeDismissed = false } = {}) {
  const metrics = dashboardMetrics(state);
  const dismissed = new Set(state.reminders?.dismissed || []);
  const alerts = [];

  metrics.overdue.forEach((item) => {
    alerts.push({
      id: `overdue:${item.id}`,
      kind: "Overdue",
      title: "Overdue work",
      message: `${item.title} is overdue.`,
      href: "assignments.html",
      severity: "danger",
      notifyNow: true,
    });
  });

  metrics.dueThisWeek.forEach((item) => {
    const due = daysUntil(item.dueDate);
    alerts.push({
      id: `assignment-due:${item.id}:${item.dueDate}`,
      kind: "Due soon",
      title: "Assignment coming up",
      message: due === 0 ? `${item.title} is due today.` : `${item.title} is due in ${due} day${due === 1 ? "" : "s"}.`,
      href: "assignments.html",
      severity: due <= 1 ? "warning" : "info",
      notifyNow: reminderDueNow(item, "assignment", state.settings),
    });
  });

  metrics.examsThisWeek.forEach((item) => {
    const due = daysUntil(item.date);
    alerts.push({
      id: `exam-soon:${item.id}:${item.date}`,
      kind: "Exams soon",
      title: "Exam coming up",
      message: due === 0 ? `${item.title} is today.` : `${item.title} exam is in ${due} day${due === 1 ? "" : "s"}.`,
      href: "exams.html",
      severity: due <= 2 ? "warning" : "info",
      notifyNow: reminderDueNow(item, "exam", state.settings),
    });
  });

  if (state.settings.dailyFocusReminder !== false && !metrics.studiedToday) {
    const focusTime = state.settings.dailyFocusTime || "18:00";
    alerts.push({
      id: `daily-study:${today()}`,
      kind: "Recommended focus",
      title: "Study reminder",
      message: "You have not logged a study session today.",
      href: "timer.html",
      severity: "info",
      notifyNow: new Date().toTimeString().slice(0, 5) >= focusTime,
    });
  }

  return alerts
    .filter((item) => includeDismissed || !dismissed.has(item.id))
    .sort((a, b) => ({ danger: 0, warning: 1, info: 2 }[a.severity] - { danger: 0, warning: 1, info: 2 }[b.severity]));
}

export function completedReminderItems(state) {
  const completed = state.reminders?.completed || [];
  const assignmentItems = completedAssignments(state).slice(-6).map((item) => ({
    id: `completed-assignment:${item.id}`,
    kind: "Completed",
    title: "Completed assignment",
    message: `${item.title} is complete.`,
  }));
  const examItems = completedExams(state).slice(-6).map((item) => ({
    id: `completed-exam:${item.id}`,
    kind: "Completed",
    title: "Completed exam",
    message: `${item.title} is complete.`,
  }));
  return [...completed, ...assignmentItems, ...examItems].slice(-12).reverse();
}

export function inQuietHours(settings = {}, reference = new Date()) {
  if (!settings.quietHoursEnabled) return false;
  const current = reference.toTimeString().slice(0, 5);
  const start = settings.quietStart || "22:00";
  const end = settings.quietEnd || "07:00";
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

export function canUseBrowserNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission() {
  if (!canUseBrowserNotifications()) return "unsupported";
  return Notification.requestPermission();
}

export function maybeSendBrowserNotifications(state) {
  if (!canUseBrowserNotifications()) return [];
  if (!state.settings.notificationsEnabled) return [];
  if (Notification.permission !== "granted") return [];
  if (inQuietHours(state.settings)) return [];

  const sent = new Set(state.reminders?.browserSent || []);
  const alerts = buildAlertItems(state).filter((alert) => alert.notifyNow !== false).slice(0, 2);
  const sentNow = [];
  alerts.forEach((alert) => {
    const sentId = `${alert.id}:${today()}`;
    if (sent.has(sentId)) return;
    new Notification(alert.title, { body: alert.message, tag: sentId });
    sent.add(sentId);
    sentNow.push(sentId);
  });
  return sentNow;
}
