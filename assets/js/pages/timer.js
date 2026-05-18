import { initShell } from "../core/shell.js";
import { $, $$, allCourses, durationLabel, esc, totalStudyMinutes, uid } from "../core/utils.js";
import { store } from "../core/storage.js";
import { emptyState, studyCard, toast } from "../core/ui.js";

const state = initShell();
const timer = { running: false, paused: false, seconds: 0, start: 0, interval: null, preset: null };

function hms(seconds) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function updateRing() {
  const total = timer.preset || 3600;
  const percent = Math.min(timer.seconds / total, 1);
  $("#timerProgress").style.strokeDashoffset = String(339.292 * (1 - percent));
}

function renderLog() {
  $("#studyTotal").textContent = `${durationLabel(totalStudyMinutes(state.study))} total`;
  $("#studyLog").innerHTML = state.study.slice().reverse().map(studyCard).join("") || emptyState("No study sessions logged yet.");
  $("#courseOptions").innerHTML = allCourses(state).map((course) => `<option value="${esc(course)}"></option>`).join("");
}

function startTimer() {
  timer.start = Date.now() - timer.seconds * 1000;
  timer.running = true;
  timer.paused = false;
  $("#timerStart").hidden = true;
  $("#timerPause").hidden = false;
  $("#timerStop").hidden = false;
  timer.interval = setInterval(() => {
    timer.seconds = Math.floor((Date.now() - timer.start) / 1000);
    $("#timerDisplay").textContent = hms(timer.seconds);
    updateRing();
    if (timer.preset && timer.seconds >= timer.preset) stopTimer();
  }, 250);
}

function pauseTimer() {
  clearInterval(timer.interval);
  timer.running = false;
  timer.paused = true;
  $("#timerStart").textContent = "Resume";
  $("#timerStart").hidden = false;
  $("#timerPause").hidden = true;
}

function resetTimerUi() {
  clearInterval(timer.interval);
  timer.running = false;
  timer.paused = false;
  timer.seconds = 0;
  timer.preset = null;
  $("#timerDisplay").textContent = "00:00:00";
  $("#timerProgress").style.strokeDashoffset = "339.292";
  $("#timerStart").textContent = "Start";
  $("#timerStart").hidden = false;
  $("#timerPause").hidden = true;
  $("#timerStop").hidden = true;
  $$("[data-mins]").forEach((button) => button.classList.remove("active"));
}

function stopTimer() {
  const minutes = Math.max(0, Math.round(timer.seconds / 60));
  if (minutes > 0) {
    state.study.push({
      id: uid(),
      course: $("#timerCourse").value.trim(),
      duration: minutes,
      date: new Date().toISOString(),
    });
    store.setStudy(state.study);
    toast(`Logged ${durationLabel(minutes)}.`);
  } else {
    toast("Session was too short to log.");
  }
  resetTimerUi();
  renderLog();
}

$("#timerStart").addEventListener("click", startTimer);
$("#timerPause").addEventListener("click", pauseTimer);
$("#timerStop").addEventListener("click", stopTimer);
$$("[data-mins]").forEach((button) => {
  button.addEventListener("click", () => {
    if (timer.running) return;
    timer.preset = Number(button.dataset.mins) * 60;
    button.classList.add("active");
    startTimer();
  });
});

document.addEventListener("click", (event) => {
  const deleteId = event.target.dataset.delete;
  if (deleteId) {
    state.study = state.study.filter((session) => session.id !== deleteId);
    store.setStudy(state.study);
    toast("Session removed.");
    renderLog();
  }
});

renderLog();
