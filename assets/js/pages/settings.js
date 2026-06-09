import { initShell, onCloudStateLoaded } from "../core/shell.js";
import { $ } from "../core/utils.js";
import { store } from "../core/storage.js";
import { toast } from "../core/ui.js";
import { requestNotificationPermission } from "../core/success.js";

const state = initShell();

function renderSettings() {
  $("#studentName").value = state.name;
  $("#compactMode").checked = Boolean(state.settings.compactMode);
  $("#notificationsEnabled").checked = Boolean(state.settings.notificationsEnabled);
  $("#defaultAssignmentReminder").value = state.settings.defaultAssignmentReminder || "1d";
  $("#defaultAssignmentReminderTime").value = state.settings.defaultAssignmentReminderTime || "09:00";
  $("#defaultExamReminder").value = state.settings.defaultExamReminder || "2d";
  $("#defaultExamReminderTime").value = state.settings.defaultExamReminderTime || "09:00";
  $("#dailyFocusReminder").checked = Boolean(state.settings.dailyFocusReminder);
  $("#dailyFocusTime").value = state.settings.dailyFocusTime || "18:00";
  $("#quietHoursEnabled").checked = Boolean(state.settings.quietHoursEnabled);
  $("#quietStart").value = state.settings.quietStart || "22:00";
  $("#quietEnd").value = state.settings.quietEnd || "07:00";
}

async function saveReminderSettings() {
  const wantsNotifications = $("#notificationsEnabled").checked;
  let notificationsEnabled = wantsNotifications;
  if (wantsNotifications) {
    const permission = await requestNotificationPermission();
    notificationsEnabled = permission === "granted";
    if (!notificationsEnabled) toast("Browser notifications were not enabled. In-app alerts will stay active.");
  }
  return {
    notificationsEnabled,
    defaultAssignmentReminder: $("#defaultAssignmentReminder").value,
    defaultAssignmentReminderTime: $("#defaultAssignmentReminderTime").value || "09:00",
    defaultExamReminder: $("#defaultExamReminder").value,
    defaultExamReminderTime: $("#defaultExamReminderTime").value || "09:00",
    dailyFocusReminder: $("#dailyFocusReminder").checked,
    dailyFocusTime: $("#dailyFocusTime").value || "18:00",
    quietHoursEnabled: $("#quietHoursEnabled").checked,
    quietStart: $("#quietStart").value || "22:00",
    quietEnd: $("#quietEnd").value || "07:00",
  };
}

$("#saveSettings").addEventListener("click", async () => {
  const name = $("#studentName").value.trim() || "Student";
  const settings = {
    ...state.settings,
    compactMode: $("#compactMode").checked,
    ...(await saveReminderSettings()),
  };
  state.settings = settings;
  state.name = name;
  store.setName(name);
  store.setSettings(settings);
  document.body.classList.toggle("compact", settings.compactMode);
  toast("Settings saved.");
  renderSettings();
});

$("#clearData").addEventListener("click", () => {
  if (!confirm("Clear assignments, exams, study sessions, notes, and settings from this browser?")) return;
  store.clearAll();
  toast("Local StudyFlow data cleared.");
  setTimeout(() => window.location.assign("../index.html"), 700);
});

renderSettings();
onCloudStateLoaded(state, renderSettings);
