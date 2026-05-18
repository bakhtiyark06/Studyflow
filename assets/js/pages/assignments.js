import { initShell } from "../core/shell.js";
import { $, $$, classNameFor, classOptions, today, uid } from "../core/utils.js";
import { store } from "../core/storage.js";
import { assignmentCard, emptyState, modal, toast } from "../core/ui.js";

const state = initShell();
let filter = "all";
let search = "";

function render() {
  let list = state.assignments.slice();
  if (filter === "pending") list = list.filter((item) => !item.done);
  if (filter === "completed") list = list.filter((item) => item.done);
  if (search) {
    const query = search.toLowerCase();
    list = list.filter((item) => `${item.title} ${item.course} ${classNameFor(state, item.classId)} ${item.notes}`.toLowerCase().includes(query));
  }
  const priority = { high: 0, medium: 1, low: 2 };
  list.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (priority[a.priority] !== priority[b.priority]) return priority[a.priority] - priority[b.priority];
    return new Date(a.dueDate) - new Date(b.dueDate);
  });
  $("#assignmentsList").innerHTML = list.map((item) => assignmentCard(item, { state })).join("") || emptyState("No assignments match this view.");
}

function openForm() {
  $("#modalRoot").innerHTML = modal("New Assignment", `
    <label class="label" for="aTitle">Title</label>
    <input class="input" id="aTitle" placeholder="Lab report">
    <label class="label" for="aClass">Class</label>
    <select class="input" id="aClass">${classOptions(state)}</select>
    <label class="label" for="aCourse">Course label</label>
    <input class="input" id="aCourse" placeholder="Optional fallback, e.g. BIOL 201">
    <label class="label" for="aDueDate">Due date</label>
    <input class="input" id="aDueDate" type="date" value="${today()}">
    <label class="label" for="aPriority">Priority</label>
    <select class="input" id="aPriority">
      <option value="high">High</option>
      <option value="medium" selected>Medium</option>
      <option value="low">Low</option>
    </select>
    <label class="label" for="aNotes">Notes</label>
    <textarea class="input textarea" id="aNotes"></textarea>
  `, `<button class="btn" data-close-modal>Cancel</button><button class="btn primary" id="saveAssignment">Save</button>`);
  $("#aTitle").focus();
}

$("#openAssignmentModal").addEventListener("click", openForm);
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
    const title = $("#aTitle").value.trim();
    const dueDate = $("#aDueDate").value;
    if (!title || !dueDate) return toast("Title and due date are required.");
    state.assignments.push({
      id: uid(),
      title,
      classId: $("#aClass").value,
      course: $("#aCourse").value.trim(),
      dueDate,
      priority: $("#aPriority").value,
      notes: $("#aNotes").value.trim(),
      done: false,
      created: new Date().toISOString(),
    });
    store.setAssignments(state.assignments);
    $("#modalRoot").innerHTML = "";
    toast("Assignment saved.");
    render();
  }
  const toggleId = event.target.dataset.toggle;
  if (toggleId) {
    const item = state.assignments.find((assignment) => assignment.id === toggleId);
    if (item) item.done = !item.done;
    store.setAssignments(state.assignments);
    render();
  }
  const deleteId = event.target.dataset.delete;
  if (deleteId) {
    state.assignments = state.assignments.filter((assignment) => assignment.id !== deleteId);
    store.setAssignments(state.assignments);
    toast("Assignment removed.");
    render();
  }
});

render();
