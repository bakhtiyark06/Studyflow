import { initShell } from "../core/shell.js";
import { $, uid } from "../core/utils.js";
import { store } from "../core/storage.js";
import { emptyState, examCard, modal, toast } from "../core/ui.js";

const state = initShell();

function render() {
  const now = new Date();
  const upcoming = state.exams.filter((item) => new Date(item.date) > now).sort((a, b) => new Date(a.date) - new Date(b.date));
  const past = state.exams.filter((item) => new Date(item.date) <= now).sort((a, b) => new Date(b.date) - new Date(a.date));
  $("#examsList").innerHTML = [
    upcoming.length ? `<h2>Upcoming</h2>${upcoming.map(examCard).join("")}` : "",
    past.length ? `<h2>Past Exams</h2>${past.map(examCard).join("")}` : "",
  ].join("") || emptyState("No exams yet.");
}

$("#openExamModal").addEventListener("click", () => {
  $("#modalRoot").innerHTML = modal("New Exam", `
    <label class="label" for="eTitle">Exam name</label>
    <input class="input" id="eTitle" placeholder="Midterm">
    <label class="label" for="eCourse">Course</label>
    <input class="input" id="eCourse" placeholder="MATH 241">
    <label class="label" for="eDate">Date and time</label>
    <input class="input" id="eDate" type="datetime-local">
    <label class="label" for="eLocation">Location</label>
    <input class="input" id="eLocation" placeholder="Room or building">
    <label class="label" for="eNotes">Notes</label>
    <textarea class="input textarea" id="eNotes"></textarea>
  `, `<button class="btn" data-close-modal>Cancel</button><button class="btn primary" id="saveExam">Save</button>`);
});

document.addEventListener("click", (event) => {
  if (event.target.matches("[data-close-modal], .modal-backdrop")) $("#modalRoot").innerHTML = "";
  if (event.target.matches("#saveExam")) {
    const title = $("#eTitle").value.trim();
    const date = $("#eDate").value;
    if (!title || !date) return toast("Exam name and date are required.");
    state.exams.push({
      id: uid(),
      title,
      course: $("#eCourse").value.trim(),
      date,
      location: $("#eLocation").value.trim(),
      notes: $("#eNotes").value.trim(),
      created: new Date().toISOString(),
    });
    store.setExams(state.exams);
    $("#modalRoot").innerHTML = "";
    toast("Exam saved.");
    render();
  }
  const deleteId = event.target.dataset.delete;
  if (deleteId) {
    state.exams = state.exams.filter((exam) => exam.id !== deleteId);
    store.setExams(state.exams);
    toast("Exam removed.");
    render();
  }
});

render();
