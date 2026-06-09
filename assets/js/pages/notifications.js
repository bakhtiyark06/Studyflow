import { initShell, onCloudStateLoaded } from "../core/shell.js";
import { $, esc } from "../core/utils.js";
import { store } from "../core/storage.js";
import { emptyState, toast } from "../core/ui.js";
import { buildAlertItems, canUseBrowserNotifications, completedReminderItems, nextMove, requestNotificationPermission } from "../core/success.js";

const state = initShell();

function alertCard(alert) {
  return `
    <article class="card notification-card ${esc(alert.severity || "info")}">
      <div>
        <h3 class="card-title">${esc(alert.title)}</h3>
        <div class="card-meta">
          <span>${esc(alert.kind)}</span>
          <span>${esc(alert.message)}</span>
        </div>
      </div>
      <div class="card-actions">
        ${alert.href ? `<a class="icon-btn" href="${esc(alert.href)}" aria-label="Open reminder">Open</a>` : ""}
        <button class="icon-btn" data-complete-reminder="${esc(alert.id)}" aria-label="Mark reminder handled">Done</button>
      </div>
    </article>`;
}

function completedCard(item) {
  return `
    <article class="card notification-card">
      <div>
        <h3 class="card-title">${esc(item.title)}</h3>
        <div class="card-meta">
          <span>${esc(item.kind || "Completed")}</span>
          <span>${esc(item.message)}</span>
        </div>
      </div>
    </article>`;
}

function renderList(selector, alerts, fallback) {
  $(selector).innerHTML = alerts.length ? alerts.map(alertCard).join("") : emptyState(fallback);
}

function renderStatus() {
  const supported = canUseBrowserNotifications();
  const permission = supported ? Notification.permission : "unsupported";
  const enabled = Boolean(state.settings.notificationsEnabled);
  $("#notificationStatus").textContent = supported ? (enabled ? permission : "In-app alerts") : "Unsupported";
  $("#notificationSummary").textContent = supported
    ? enabled
      ? "Browser notifications are enabled when permission is granted. In-app alerts stay available as a fallback."
      : "In-app alerts are active. Enable browser notifications if you want desktop reminders while StudyFlow is open."
    : "This browser does not support notifications, so StudyFlow will show in-app alerts instead.";
}

function render() {
  const alerts = buildAlertItems(state, { includeDismissed: true });
  renderStatus();
  $("#focusRecommendation").textContent = nextMove(state);
  renderList("#dueSoonAlerts", alerts.filter((item) => item.kind === "Due soon"), "No assignments are due soon.");
  renderList("#overdueAlerts", alerts.filter((item) => item.kind === "Overdue"), "No overdue work. Nice.");
  renderList("#examAlerts", alerts.filter((item) => item.kind === "Exams soon"), "No exams coming up this week.");
  const completed = completedReminderItems(state);
  $("#completedReminders").innerHTML = completed.length
    ? completed.map(completedCard).join("")
    : emptyState("Completed or dismissed reminders will appear here.");
}

$("#enableNotifications").addEventListener("click", async () => {
  const permission = await requestNotificationPermission();
  state.settings.notificationsEnabled = permission === "granted";
  store.setSettings(state.settings);
  toast(permission === "granted" ? "Browser notifications enabled." : "In-app alerts will stay active.");
  render();
});

$("#clearCompletedReminders").addEventListener("click", () => {
  state.reminders.completed = [];
  store.setReminders(state.reminders);
  toast("Completed reminders cleared.");
  render();
});

document.addEventListener("click", (event) => {
  const alertId = event.target.dataset.completeReminder;
  if (!alertId) return;
  const alert = buildAlertItems(state, { includeDismissed: true }).find((item) => item.id === alertId);
  state.reminders.dismissed = [...new Set([...(state.reminders.dismissed || []), alertId])].slice(-80);
  if (alert) {
    state.reminders.completed = [...(state.reminders.completed || []), { ...alert, completedAt: new Date().toISOString() }].slice(-40);
  }
  store.setReminders(state.reminders);
  toast("Reminder marked handled.");
  render();
});

render();
onCloudStateLoaded(state, render);
