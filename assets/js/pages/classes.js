import { initShell, onCloudStateLoaded } from "../core/shell.js";
import { $, uid } from "../core/utils.js";
import { store } from "../core/storage.js";
import { classCard, emptyState, modal, toast } from "../core/ui.js";

const state = initShell();

function render() {
  $("#classCount").textContent = `${state.classes.length} class${state.classes.length === 1 ? "" : "es"}`;
  $("#classesList").innerHTML = state.classes
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(classCard)
    .join("") || emptyState("No classes yet. Add your first class to connect coursework.");
}

function openForm() {
  $("#modalRoot").innerHTML = modal("New Class", `
    <label class="label" for="cName">Class name</label>
    <input class="input" id="cName" placeholder="Biology 201">
    <label class="label" for="cInstructor">Instructor name</label>
    <input class="input" id="cInstructor" placeholder="Dr. Rivera">
    <label class="label" for="cMeetingTime">Meeting days/times</label>
    <input class="input" id="cMeetingTime" placeholder="Mon/Wed 10:00 AM">
    <label class="label" for="cLocation">Location or online link</label>
    <input class="input" id="cLocation" placeholder="Science Hall 204 or Zoom link">
    <label class="label" for="cSyllabusUrl">Syllabus URL</label>
    <input class="input" id="cSyllabusUrl" type="url" placeholder="https://school.edu/syllabus">
    <label class="label" for="cNotes">Notes</label>
    <textarea class="input textarea" id="cNotes" rows="4" placeholder="Office hours, grading notes, materials"></textarea>
  `, `<button class="btn" data-close-modal>Cancel</button><button class="btn primary" id="saveClass">Save Class</button>`);
  $("#cName").focus();
}

$("#openClassModal").addEventListener("click", openForm);

document.addEventListener("click", (event) => {
  if (event.target.matches("[data-close-modal], .modal-backdrop")) $("#modalRoot").innerHTML = "";
  if (event.target.matches("#saveClass")) {
    const name = $("#cName").value.trim();
    if (!name) return toast("Class name is required.");
    state.classes.push({
      id: uid(),
      name,
      instructor: $("#cInstructor").value.trim(),
      meetingTime: $("#cMeetingTime").value.trim(),
      location: $("#cLocation").value.trim(),
      syllabusUrl: $("#cSyllabusUrl").value.trim(),
      notes: $("#cNotes").value.trim(),
      created: new Date().toISOString(),
    });
    store.setClasses(state.classes);
    $("#modalRoot").innerHTML = "";
    toast("Class saved.");
    render();
  }
  const deleteId = event.target.dataset.delete;
  if (deleteId) {
    state.classes = state.classes.filter((classItem) => classItem.id !== deleteId);
    store.setClasses(state.classes);
    state.assignments = state.assignments.map((item) => item.classId === deleteId ? { ...item, classId: "" } : item);
    state.exams = state.exams.map((item) => item.classId === deleteId ? { ...item, classId: "" } : item);
    store.setAssignments(state.assignments);
    store.setExams(state.exams);
    toast("Class removed. Linked assignments and exams were unlinked.");
    render();
  }
});

render();
onCloudStateLoaded(state, render);
