import { initShell, onCloudStateLoaded } from "../core/shell.js";
import { $, $$, classNameFor, classOptions, esc, today, uid } from "../core/utils.js";
import { store } from "../core/storage.js";
import { assignmentCard, emptyState, modal, toast } from "../core/ui.js";
import { reminderLabel, reminderOptions } from "../core/success.js";

const state = initShell();
let filter = "all";
let search = "";
let editingId = "";

function assignmentSearchText(item) {
  return `${item.title} ${item.course} ${classNameFor(state, item.classId)} ${item.notes || ""} ${item.priority || ""}`.toLowerCase();
}

function filteredAssignments() {
  let list = state.assignments.slice();
  if (filter === "pending") list = list.filter((item) => !item.done);
  if (filter === "completed") list = list.filter((item) => item.done);
  if (search) {
    const query = search.toLowerCase();
    list = list.filter((item) => assignmentSearchText(item).includes(query));
  }
  const priority = { high: 0, medium: 1, low: 2 };
  return list.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (priority[a.priority] !== priority[b.priority]) return priority[a.priority] - priority[b.priority];
    return new Date(a.dueDate) - new Date(b.dueDate);
  });
}

function section(title, list, fallback) {
  return `
    <div class="archive-section">
      <div class="section-heading">
        <h2>${esc(title)}</h2>
        <span class="pill">${list.length}</span>
      </div>
      <div class="stack-list">${list.length ? list.map((item) => assignmentCard(item, { state })).join("") : emptyState(fallback)}</div>
    </div>`;
}

function render() {
  const list = filteredAssignments();
  const pending = list.filter((item) => !item.done);
  const completed = list.filter((item) => item.done);
  if (filter === "completed") {
    $("#assignmentsList").innerHTML = section("Completed Assignments Archive", completed, "No completed assignments yet.");
    return;
  }
  if (filter === "pending") {
    $("#assignmentsList").innerHTML = section("Pending Assignments", pending, "No pending assignments match this view.");
    return;
  }
  $("#assignmentsList").innerHTML = [
    section("Active Assignments", pending, "No active assignments match this view."),
    section("Completed Assignments Archive", completed, "Completed assignments will appear here."),
  ].join("");
}

function reminderFields(item = {}) {
  const selected = item.reminderPreset ?? "";
  return `
    <label class="label" for="aReminder">Reminder</label>
    <select class="input" id="aReminder">${reminderOptions(selected)}</select>
    <label class="label" for="aReminderAt">Custom reminder date/time</label>
    <input class="input" id="aReminderAt" type="datetime-local" value="${esc(item.reminderAt || "")}">
    <p class="muted-note">Current reminder: ${esc(reminderLabel(item, state.settings.defaultAssignmentReminder))}</p>`;
}

function openForm(item = null) {
  editingId = item?.id || "";
  $("#modalRoot").innerHTML = modal(editingId ? "Edit Assignment" : "New Assignment", `
    <label class="label" for="aTitle">Title</label>
    <input class="input" id="aTitle" placeholder="Lab report" value="${esc(item?.title || "")}">
    <label class="label" for="aClass">Class</label>
    <select class="input" id="aClass">${classOptions(state, item?.classId || "")}</select>
    <label class="label" for="aCourse">Course label</label>
    <input class="input" id="aCourse" placeholder="Optional fallback, e.g. BIOL 201" value="${esc(item?.course || "")}">
    <label class="label" for="aDueDate">Due date</label>
    <input class="input" id="aDueDate" type="date" value="${esc(item?.dueDate || today())}">
    <label class="label" for="aPriority">Priority</label>
    <select class="input" id="aPriority">
      <option value="high" ${item?.priority === "high" ? "selected" : ""}>High</option>
      <option value="medium" ${!item?.priority || item?.priority === "medium" ? "selected" : ""}>Medium</option>
      <option value="low" ${item?.priority === "low" ? "selected" : ""}>Low</option>
    </select>
    <label class="label" for="aEstimate">Estimated workload</label>
    <input class="input" id="aEstimate" type="number" min="0" step="15" placeholder="Minutes, e.g. 90" value="${esc(item?.estimatedMinutes || "")}">
    ${reminderFields(item || {})}
    <label class="label" for="aNotes">Notes / description</label>
    <textarea class="input textarea" id="aNotes">${esc(item?.notes || "")}</textarea>
  `, `<button class="btn" data-close-modal>Cancel</button><button class="btn primary" id="saveAssignment">${editingId ? "Save Changes" : "Save"}</button>`);
  $("#aTitle").focus();
}

function assignmentFromForm(existing = {}) {
  const reminderPreset = $("#aReminder").value;
  return {
    ...existing,
    id: existing.id || uid(),
    title: $("#aTitle").value.trim(),
    classId: $("#aClass").value,
    course: $("#aCourse").value.trim(),
    dueDate: $("#aDueDate").value,
    priority: $("#aPriority").value,
    estimatedMinutes: Number($("#aEstimate").value) || "",
    reminderPreset,
    reminderAt: reminderPreset === "custom" ? $("#aReminderAt").value : "",
    notes: $("#aNotes").value.trim(),
    done: Boolean(existing.done),
    created: existing.created || new Date().toISOString(),
    updated: new Date().toISOString(),
  };
}

$("#openAssignmentModal").addEventListener("click", () => openForm());
$("#assignmentSearch").addEventListener("input", (event) => { search = event.target.value; render(); });
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
  if (event.target.matches("#saveAssignment")) {
    const existing = state.assignments.find((assignment) => assignment.id === editingId) || {};
    const next = assignmentFromForm(existing);
    if (!next.title || !next.dueDate) return toast("Title and due date are required.");
    if (next.reminderPreset === "custom" && !next.reminderAt) return toast("Choose a custom reminder date/time.");
    state.assignments = editingId
      ? state.assignments.map((assignment) => assignment.id === editingId ? next : assignment)
      : [...state.assignments, next];
    store.setAssignments(state.assignments);
    $("#modalRoot").innerHTML = "";
    toast(editingId ? "Assignment updated." : "Assignment saved.");
    editingId = "";
    render();
  }
  const editId = event.target.dataset.edit;
  if (editId) {
    const item = state.assignments.find((assignment) => assignment.id === editId);
    if (item) openForm(item);
  }
  const toggleId = event.target.dataset.toggle;
  if (toggleId) {
    const item = state.assignments.find((assignment) => assignment.id === toggleId);
    if (item) {
      item.done = !item.done;
      item.completedAt = item.done ? new Date().toISOString() : "";
    }
    store.setAssignments(state.assignments);
    toast(item?.done ? "Assignment completed." : "Assignment restored.");
    render();
  }
  const deleteId = event.target.dataset.delete;
  if (deleteId) {
    const item = state.assignments.find((assignment) => assignment.id === deleteId);
    if (!confirm(`Delete "${item?.title || "this assignment"}"?`)) return;
    state.assignments = state.assignments.filter((assignment) => assignment.id !== deleteId);
    store.setAssignments(state.assignments);
    toast("Assignment removed.");
    render();
  }
});

render();
onCloudStateLoaded(state, render);
