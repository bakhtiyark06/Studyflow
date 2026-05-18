import { initShell } from "../core/shell.js";
import { $, daysUntil, durationLabel, studyStreak, timeOfDay, totalStudyMinutes } from "../core/utils.js";
import { assignmentCard, emptyState, examCard, statCard, studyCard } from "../core/ui.js";

const state = initShell();
const pending = state.assignments.filter((item) => !item.done);
const overdue = pending.filter((item) => daysUntil(item.dueDate) < 0);
const upcomingExams = state.exams.filter((item) => new Date(item.date) > new Date());
const studyMins = totalStudyMinutes(state.study);

$("#timeOfDay").textContent = timeOfDay();
$("#userName").textContent = state.name;
$("#dashboardSubtitle").textContent = overdue.length
  ? `${overdue.length} overdue assignment${overdue.length === 1 ? "" : "s"} need attention first.`
  : "Your most important student work is organized and ready.";

$("#statsGrid").innerHTML = [
  statCard("Pending", pending.length),
  statCard("Overdue", overdue.length),
  statCard("Exams Ahead", upcomingExams.length),
  statCard("Study Time", durationLabel(studyMins)),
].join("");

$("#focusScore").textContent = `${Math.min(100, Math.round((studyMins / 600) * 100))}%`;

$("#dueSoonList").innerHTML = pending
  .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
  .slice(0, 5)
  .map((item) => assignmentCard(item, { compact: true }))
  .join("") || emptyState("No pending assignments.");

$("#upcomingExams").innerHTML = upcomingExams
  .sort((a, b) => new Date(a.date) - new Date(b.date))
  .slice(0, 4)
  .map(examCard)
  .join("") || emptyState("No upcoming exams.");

$("#recentStudy").innerHTML = state.study
  .slice()
  .reverse()
  .slice(0, 4)
  .map(studyCard)
  .join("") || emptyState("Start the timer to log study time.");

$("#studyStatsMini").innerHTML = `
  <div class="bar-row">
    <div class="bar-head"><span>Current streak</span><strong>${studyStreak(state.study)} days</strong></div>
    <div class="bar-track"><div class="bar-fill" style="width:${Math.min(100, studyStreak(state.study) * 20)}%"></div></div>
  </div>
  <div class="bar-row">
    <div class="bar-head"><span>Weekly goal</span><strong>${durationLabel(studyMins)} / 10h</strong></div>
    <div class="bar-track"><div class="bar-fill" style="width:${Math.min(100, (studyMins / 600) * 100)}%"></div></div>
  </div>`;

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch((error) => console.warn("SW registration failed", error));
}
