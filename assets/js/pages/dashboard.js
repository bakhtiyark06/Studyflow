import { initShell, onCloudStateLoaded } from "../core/shell.js";
import { $, daysUntil, durationLabel, esc, formatDate, studyStreak, timeOfDay, totalStudyMinutes } from "../core/utils.js";
import { assignmentCard, examCard, statCard, studyCard } from "../core/ui.js";
import { getAuthMode, watchAuthState } from "../cloud/auth.js";
import {
  activeExams,
  buildAlertItems,
  classWorkloadOverview,
  completedAssignments,
  completedExams,
  dashboardMetrics,
  isToday,
  nextMove,
  rankedWorkItems,
  workloadReport,
  WEEKLY_FOCUS_GOAL,
} from "../core/success.js";

const state = initShell();
let authIdentity = { mode: getAuthMode() === "firebase-ready" ? "pending" : "local-mode", user: null };

function titleCaseWord(value = "") {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function nameFromEmail(email = "") {
  const localPart = email.split("@")[0] || "";
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map(titleCaseWord)
    .join(" ") || "Student";
}

function authDisplayName(user) {
  const displayName = user?.displayName?.trim();
  if (displayName) return displayName;
  return nameFromEmail(user?.email || "");
}

function dashboardDisplayName() {
  if (authIdentity.mode === "firebase") {
    return authIdentity.user ? authDisplayName(authIdentity.user) : "Student";
  }
  if (authIdentity.mode === "local-mode") {
    return state.name || "Student";
  }
  return "Student";
}

function dashboardEmptyState(message, href, label) {
  return `
    <div class="empty-state dashboard-empty">
      <p>${esc(message)}</p>
      <a class="btn primary" href="${esc(href)}">${esc(label)}</a>
    </div>`;
}

function glanceItem(label, value, detail) {
  return `
    <article class="glance-item">
      <span>${esc(label)}</span>
      <strong>${esc(value)}</strong>
      <small>${esc(detail)}</small>
    </article>`;
}

function checklistItem(label, done, href = "") {
  return `
    <a class="checklist-item ${done ? "done" : ""}" href="${esc(href || "#")}">
      <span>${done ? "Done" : "Todo"}</span>
      <strong>${esc(label)}</strong>
    </a>`;
}

function barRow(label, value, percent) {
  return `
    <div class="bar-row">
      <div class="bar-head"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.min(100, Math.max(0, percent))}%"></div></div>
    </div>`;
}

function studyPlanCard(item, index) {
  return `
    <article class="card">
      <div>
        <h3 class="card-title">${esc(index === 0 ? "First study block" : "Backup study block")}</h3>
        <div class="card-meta">
          <span>${esc(item.type === "exam" ? "Exam prep" : "Assignment")}</span>
          ${item.classLabel ? `<span>${esc(item.classLabel)}</span>` : ""}
          <span>${esc(item.title)}</span>
        </div>
      </div>
      <div class="card-actions">
        <span class="tag">45m</span>
        <a class="icon-btn" href="pages/timer.html" aria-label="Start timer">Start</a>
      </div>
    </article>`;
}

function classLoadCard(item) {
  return `
    <article class="card dashboard-class-card">
      <div>
        <h3 class="card-title">${esc(item.name)}</h3>
        <div class="card-meta">
          <span>${item.assignments.length} assignment${item.assignments.length === 1 ? "" : "s"}</span>
          <span>${item.exams.length} exam${item.exams.length === 1 ? "" : "s"}</span>
          ${item.overdue.length ? `<span class="priority-high">${item.overdue.length} overdue</span>` : ""}
        </div>
      </div>
      <span class="tag">Load ${item.load}</span>
    </article>`;
}

function archiveCard(title, count, href, detail) {
  return `
    <article class="glance-item archive-card">
      <span>${esc(title)}</span>
      <strong>${esc(count)}</strong>
      <small>${esc(detail)}</small>
      <a class="text-link" href="${esc(href)}">Open archive</a>
    </article>`;
}

function renderOnboarding(metrics) {
  const hasAnyData = state.classes.length || state.assignments.length || state.exams.length || state.study.length;
  $("#onboardingPanel").hidden = Boolean(hasAnyData);
  $("#onboardingSteps").innerHTML = [
    checklistItem("Add classes", state.classes.length > 0, "pages/classes.html"),
    checklistItem("Add assignments", state.assignments.length > 0, "pages/assignments.html"),
    checklistItem("Add exams", state.exams.length > 0, "pages/exams.html"),
    checklistItem("Turn on reminders", Boolean(state.settings.notificationsEnabled), "pages/notifications.html"),
    checklistItem("Start first study session", state.study.length > 0 || metrics.studiedToday, "pages/timer.html"),
  ].join("");
}

function render() {
  const metrics = dashboardMetrics(state);
  const report = workloadReport(state);
  const ranked = rankedWorkItems(state);
  const alerts = buildAlertItems(state);
  const activeExamList = activeExams(state);
  const completedAssignmentList = completedAssignments(state);
  const completedExamList = completedExams(state);
  const todayStudyMins = totalStudyMinutes(state.study.filter((item) => isToday(item.date)));

  renderOnboarding(metrics);

  $("#timeOfDay").textContent = timeOfDay();
  $("#userName").textContent = dashboardDisplayName();
  $("#dashboardSubtitle").textContent = metrics.overdue.length
    ? `${metrics.overdue.length} overdue assignment${metrics.overdue.length === 1 ? "" : "s"} need attention first.`
    : "Your student workload, study rhythm, and next move are organized in one place.";
  $("#heroSignals").innerHTML = [
    `<span><strong>${metrics.dueThisWeek.length}</strong> task${metrics.dueThisWeek.length === 1 ? "" : "s"} due this week</span>`,
    `<span><strong>${metrics.examsThisWeek.length}</strong> exam${metrics.examsThisWeek.length === 1 ? "" : "s"} this week</span>`,
    `<span><strong>${metrics.weeklyFocus}%</strong> weekly focus</span>`,
  ].join("");

  $("#statsGrid").innerHTML = [
    statCard("Due This Week", metrics.dueThisWeek.length),
    statCard("Overdue", metrics.overdue.length),
    statCard("Exams This Week", metrics.examsThisWeek.length),
    statCard("Classes", state.classes.length),
  ].join("");

  $("#focusScore").textContent = `${metrics.weeklyFocus}%`;
  $("#todaysFocusText").textContent = alerts[0]?.message || nextMove(state);
  $("#dailyChecklist").innerHTML = [
    checklistItem("Log a study session today", metrics.studiedToday, "pages/timer.html"),
    checklistItem("Clear overdue work", !metrics.overdue.length, "pages/assignments.html"),
    checklistItem("Review exams this week", !metrics.examsThisWeek.length, "pages/exams.html"),
    checklistItem("Complete one priority task", metrics.completedAssignmentCount > 0, "pages/assignments.html"),
  ].join("");

  $("#cookedStatus").textContent = report.status;
  $("#cookedStatus").className = `pill cooked-pill ${report.tone}`;
  $("#cookedExplanation").textContent = report.explanation;
  $("#workloadFill").style.width = `${report.score}%`;
  $("#workloadFill").className = `workload-fill ${report.tone}`;
  $("#nextActionText").textContent = nextMove(state);

  $("#weeklyGoals").innerHTML = [
    barRow("Weekly focus", `${durationLabel(metrics.weeklyStudyMins)} / 10h`, metrics.weeklyFocus),
    barRow("Assignment completion", `${metrics.completionPercent}%`, metrics.completionPercent),
    barRow("Today timer progress", `${durationLabel(todayStudyMins)} logged`, Math.min(100, (todayStudyMins / 60) * 100)),
  ].join("");

  $("#weeklyGlance").innerHTML = [
    glanceItem("Due soon", metrics.dueThisWeek.length, metrics.dueThisWeek.length ? "Assignments due within 7 days" : "No assignment pressure"),
    glanceItem("Exams soon", metrics.examsThisWeek.length, metrics.examsThisWeek.length ? "Exams to prepare for" : "No exams this week"),
    glanceItem("Study logged", durationLabel(metrics.weeklyStudyMins), `${metrics.weeklyFocus}% of your 10h weekly focus goal`),
    glanceItem("Completion", `${metrics.completionPercent}%`, state.assignments.length ? `${metrics.completedAssignmentCount} of ${state.assignments.length} assignments done` : "Add assignments to track progress"),
  ].join("");

  $("#dueSoonList").innerHTML = metrics.dueThisWeek.length
    ? metrics.dueThisWeek
      .slice()
      .sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate))
      .slice(0, 5)
      .map((item) => assignmentCard(item, { compact: true, state }))
      .join("")
    : dashboardEmptyState("No assignments are due soon. Add your first assignment so StudyFlow can spot what matters next.", "pages/assignments.html", "Add your first assignment");

  $("#overdueWork").innerHTML = metrics.overdue.length
    ? metrics.overdue
      .slice()
      .sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate))
      .map((item) => assignmentCard(item, { compact: true, state }))
      .join("")
    : dashboardEmptyState("No overdue work. Keep that breathing room.", "pages/assignments.html", "Review assignments");

  $("#examsThisWeekList").innerHTML = metrics.examsThisWeek.length
    ? metrics.examsThisWeek
      .slice()
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((item) => examCard(item, { state, compact: true }))
      .join("")
    : dashboardEmptyState("No exams this week. Add your first exam and StudyFlow will help you plan around it.", "pages/exams.html", "Add your first exam");

  $("#studyPlanList").innerHTML = ranked.length
    ? ranked.slice(0, 3).map(studyPlanCard).join("")
    : dashboardEmptyState("No upcoming study blocks needed yet. Add deadlines to generate study-session recommendations.", "pages/assignments.html", "Add coursework");

  $("#classOverview").innerHTML = state.classes.length
    ? classWorkloadOverview(state).slice(0, 5).map(classLoadCard).join("")
    : dashboardEmptyState("No classes yet. Add a class to connect assignments, exams, and syllabus details.", "pages/classes.html", "Add a class");

  $("#recentStudy").innerHTML = state.study.length
    ? state.study.slice().reverse().slice(0, 4).map(studyCard).join("")
    : dashboardEmptyState("No study sessions logged yet. Start a study session to build your weekly focus score.", "pages/timer.html", "Start a study session");

  $("#studyStatsMini").innerHTML = state.study.length
    ? [
      barRow("Current streak", `${studyStreak(state.study)} days`, Math.min(100, studyStreak(state.study) * 20)),
      barRow("Weekly goal", `${durationLabel(metrics.weeklyStudyMins)} / ${durationLabel(WEEKLY_FOCUS_GOAL)}`, metrics.weeklyFocus),
      barRow("Today", `${durationLabel(todayStudyMins)} logged`, Math.min(100, (todayStudyMins / 60) * 100)),
    ].join("")
    : dashboardEmptyState("Your study stats will come alive after your first timer session.", "pages/timer.html", "Start a study session");

  $("#completedArchive").innerHTML = [
    archiveCard("Completed Assignments", completedAssignmentList.length, "pages/assignments.html", completedAssignmentList[0] ? `Latest: ${completedAssignmentList.slice(-1)[0].title}` : "No completed assignments yet"),
    archiveCard("Completed Exams", completedExamList.length, "pages/exams.html", completedExamList[0] ? `Latest: ${completedExamList.slice(-1)[0].title}` : "No completed exams yet"),
    archiveCard("Active Exams", activeExamList.length, "pages/exams.html", activeExamList[0] ? `Next: ${activeExamList.slice().sort((a, b) => new Date(a.date) - new Date(b.date))[0].title}` : "No active exams"),
  ].join("");
}

render();
onCloudStateLoaded(state, render);
watchAuthState((status) => {
  authIdentity = { mode: status.mode, user: status.user || null };
  render();
}).catch(() => {
  authIdentity = { mode: "local-mode", user: null };
  render();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch((error) => console.warn("SW registration failed", error));
}
