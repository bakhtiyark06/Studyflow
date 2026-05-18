import { initShell } from "../core/shell.js";
import { $, durationLabel, esc, studyStreak, totalStudyMinutes } from "../core/utils.js";
import { emptyState, statCard } from "../core/ui.js";

const state = initShell();
const total = totalStudyMinutes(state.study);
const courseTotals = state.study.reduce((map, session) => {
  const course = session.course || "General Study";
  map[course] = (map[course] || 0) + (Number(session.duration) || 0);
  return map;
}, {});

$("#statsGrid").innerHTML = [
  statCard("Total Study", durationLabel(total)),
  statCard("Sessions", state.study.length),
  statCard("Streak", `${studyStreak(state.study)} days`),
  statCard("Completed", state.assignments.filter((item) => item.done).length),
].join("");

const max = Math.max(...Object.values(courseTotals), 1);
$("#courseBreakdown").innerHTML = Object.entries(courseTotals)
  .sort((a, b) => b[1] - a[1])
  .map(([course, minutes]) => `
    <div class="bar-row">
      <div class="bar-head"><span>${esc(course)}</span><strong>${durationLabel(minutes)}</strong></div>
      <div class="bar-track"><div class="bar-fill" style="width:${(minutes / max) * 100}%"></div></div>
    </div>`)
  .join("") || emptyState("Study sessions will appear here after you use the timer.");
