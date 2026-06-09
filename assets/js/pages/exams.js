import { initShell, onCloudStateLoaded } from "../core/shell.js";
import { $, $$, classOptions, esc, uid } from "../core/utils.js";
import { store } from "../core/storage.js";
import { emptyState, examCard, modal, toast } from "../core/ui.js";
import { reminderLabel, reminderOptions } from "../core/success.js";

const state = initShell();
let filter = "all";
let editingId = "";

function section(title, list, fallback) {
  return `
    <div class="archive-section">
      <div class="section-heading">
        <h2>${esc(title)}</h2>
        <span class="pill">${list.length}</span>
      </div>
      <div class="stack-list">${list.length ? list.map((item) => examCard(item, { state })).join("") : emptyState(fallback)}</div>
    </div>`;
}

function render() {
  const now = new Date();
  const active = state.exams.filter((item) => !item.done);
  const upcoming = active.filter((item) => new Date(item.date) > now).sort((a, b) => new Date(a.date) - new Date(b.date));
  const past = active.filter((item) => new Date(item.date) <= now).sort((a, b) => new Date(b.date) - new Date(a.date));
  const completed = state.exams.filter((item) => item.done).sort((a, b) => new Date(b.completedAt || b.date) - new Date(a.completedAt || a.date));

  if (filter === "upcoming") {
    $("#examsList").innerHTML = section("Upcoming Exams", upcoming, "No upcoming exams match this view.");
    return;
  }
  if (filter === "completed") {
    $("#examsList").innerHTML = section("Completed Exams Archive", completed, "No completed exams yet.");
    return;
  }
  $("#examsList").innerHTML = [
    section("Upcoming Exams", upcoming, "No upcoming exams yet."),
    section("Past Active Exams", past, "No past active exams."),
    section("Completed Exams Archive", completed, "Completed exams will appear here."),
  ].join("");
}

function reminderFields(item = {}) {
  const selected = item.reminderPreset ?? "";
  return `
    <label class="label" for="eReminder">Reminder</label>
    <select class="input" id="eReminder">${reminderOptions(selected)}</select>
    <label class="label" for="eReminderAt">Custom reminder date/time</label>
    <input class="input" id="eReminderAt" type="datetime-local" value="${esc(item.reminderAt || "")}">
    <p class="muted-note">Current reminder: ${esc(reminderLabel(item, state.settings.defaultExamReminder))}</p>`;
}

function openForm(item = null) {
  editingId = item?.id || "";
  $("#modalRoot").innerHTML = modal(editingId ? "Edit Exam" : "New Exam", `
    <label class="label" for="eTitle">Exam name</label>
    <input class="input" id="eTitle" placeholder="Midterm" value="${esc(item?.title || "")}">
    <label class="label" for="eClass">Class</label>
    <select class="input" id="eClass">${classOptions(state, item?.classId || "")}</select>
    <label class="label" for="eCourse">Course label</label>
    <input class="input" id="eCourse" placeholder="Optional fallback, e.g. MATH 241" value="${esc(item?.course || "")}">
    <label class="label" for="eDate">Date and time</label>
    <input class="input" id="eDate" type="datetime-local" value="${esc(item?.date || "")}">
    <label class="label" for="eDifficulty">Priority / difficulty</label>
    <select class="input" id="eDifficulty">
      <option value="hard" ${item?.difficulty === "hard" ? "selected" : ""}>Hard</option>
      <option value="medium" ${!item?.difficulty || item?.difficulty === "medium" ? "selected" : ""}>Medium</option>
      <option value="easy" ${item?.difficulty === "easy" ? "selected" : ""}>Easy</option>
    </select>
    ${reminderFields(item || {})}
    <label class="label" for="eLocation">Location</label>
    <input class="input" id="eLocation" placeholder="Room or building" value="${esc(item?.location || "")}">
    <label class="label" for="eNotes">Study notes</label>
    <textarea class="input textarea" id="eNotes">${esc(item?.notes || "")}</textarea>
  `, `<button class="btn" data-close-modal>Cancel</button><button class="btn primary" id="saveExam">${editingId ? "Save Changes" : "Save"}</button>`);
  $("#eTitle").focus();
}

function examFromForm(existing = {}) {
  const reminderPreset = $("#eReminder").value;
  return {
    ...existing,
    id: existing.id || uid(),
    title: $("#eTitle").value.trim(),
    classId: $("#eClass").value,
    course: $("#eCourse").value.trim(),
    date: $("#eDate").value,
    difficulty: $("#eDifficulty").value,
    priority: $("#eDifficulty").value,
    reminderPreset,
    reminderAt: reminderPreset === "custom" ? $("#eReminderAt").value : "",
    location: $("#eLocation").value.trim(),
    notes: $("#eNotes").value.trim(),
    done: Boolean(existing.done),
    created: existing.created || new Date().toISOString(),
    updated: new Date().toISOString(),
  };
}

$("#openExamModal").addEventListener("click", () => openForm());
$$("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    $$("[data-filter]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    filter = button.dataset.filter;
    render();
  });
});

document.addEventListener("click", (event) => {
  if (event.target.matches("[data-close-modal], .modal-backdrop")) $("#modalRoot").innerHTML = "";
  if (event.target.matches("#saveExam")) {
    const existing = state.exams.find((exam) => exam.id === editingId) || {};
    const next = examFromForm(existing);
    if (!next.title || !next.date) return toast("Exam name and date are required.");
    if (next.reminderPreset === "custom" && !next.reminderAt) return toast("Choose a custom reminder date/time.");
    state.exams = editingId
      ? state.exams.map((exam) => exam.id === editingId ? next : exam)
      : [...state.exams, next];
    store.setExams(state.exams);
    $("#modalRoot").innerHTML = "";
    toast(editingId ? "Exam updated." : "Exam saved.");
    editingId = "";
    render();
  }
  const editId = event.target.dataset.edit;
  if (editId) {
    const item = state.exams.find((exam) => exam.id === editId);
    if (item) openForm(item);
  }
  const toggleId = event.target.dataset.toggle;
  if (toggleId) {
    const item = state.exams.find((exam) => exam.id === toggleId);
    if (item) {
      item.done = !item.done;
      item.completedAt = item.done ? new Date().toISOString() : "";
    }
    store.setExams(state.exams);
    toast(item?.done ? "Exam completed." : "Exam restored.");
    render();
  }
  const deleteId = event.target.dataset.delete;
  if (deleteId) {
    const item = state.exams.find((exam) => exam.id === deleteId);
    if (!confirm(`Delete "${item?.title || "this exam"}"?`)) return;
    state.exams = state.exams.filter((exam) => exam.id !== deleteId);
    store.setExams(state.exams);
    toast("Exam removed.");
    render();
  }
});

render();
onCloudStateLoaded(state, render);
