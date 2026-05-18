import { initShell } from "../core/shell.js";
import { $, uid } from "../core/utils.js";
import { store } from "../core/storage.js";
import { emptyState, noteCard, toast } from "../core/ui.js";

const state = initShell();

function render() {
  $("#notesList").innerHTML = state.notes.slice().reverse().map(noteCard).join("") || emptyState("No notes saved yet.");
}

$("#saveNote").addEventListener("click", () => {
  const title = $("#noteTitle").value.trim();
  const body = $("#noteBody").value.trim();
  if (!title || !body) return toast("Add a title and note body.");
  state.notes.push({
    id: uid(),
    title,
    course: $("#noteCourse").value.trim(),
    body,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  });
  store.setNotes(state.notes);
  $("#noteTitle").value = "";
  $("#noteCourse").value = "";
  $("#noteBody").value = "";
  toast("Note saved.");
  render();
});

document.addEventListener("click", (event) => {
  const deleteId = event.target.dataset.delete;
  if (!deleteId) return;
  state.notes = state.notes.filter((note) => note.id !== deleteId);
  store.setNotes(state.notes);
  toast("Note removed.");
  render();
});

render();
