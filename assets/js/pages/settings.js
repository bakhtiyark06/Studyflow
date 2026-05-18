import { initShell } from "../core/shell.js";
import { $ } from "../core/utils.js";
import { store } from "../core/storage.js";
import { toast } from "../core/ui.js";

const state = initShell();

$("#studentName").value = state.name;
$("#compactMode").checked = Boolean(state.settings.compactMode);

$("#saveSettings").addEventListener("click", () => {
  const name = $("#studentName").value.trim() || "Student";
  const settings = { compactMode: $("#compactMode").checked };
  store.setName(name);
  store.setSettings(settings);
  document.body.classList.toggle("compact", settings.compactMode);
  toast("Settings saved.");
});

$("#clearData").addEventListener("click", () => {
  if (!confirm("Clear assignments, exams, study sessions, notes, and settings from this browser?")) return;
  store.clearAll();
  toast("Local StudyFlow data cleared.");
  setTimeout(() => window.location.assign("../index.html"), 700);
});
