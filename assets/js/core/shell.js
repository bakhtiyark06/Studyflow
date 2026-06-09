import { $, $$, esc } from "./utils.js";
import { loadState, store } from "./storage.js";
import { buildAlertItems, maybeSendBrowserNotifications } from "./success.js";
import { getCloudSyncStatus, initCloudSync, onSyncStatus } from "../cloud/cloudStorage.js";

const nav = [
  { page: "dashboard", label: "Dashboard", path: "index.html", icon: "grid" },
  { page: "classes", label: "Classes", path: "pages/classes.html", icon: "book" },
  { page: "assignments", label: "Assignments", path: "pages/assignments.html", icon: "check" },
  { page: "exams", label: "Exams", path: "pages/exams.html", icon: "calendar" },
  { page: "timer", label: "Study Timer", path: "pages/timer.html", icon: "clock" },
  { page: "notes", label: "Notes", path: "pages/notes.html", icon: "note" },
  { page: "notifications", label: "Notifications", path: "pages/notifications.html", icon: "bell" },
  { page: "stats", label: "Stats", path: "pages/stats.html", icon: "chart" },
  { page: "settings", label: "Settings", path: "pages/settings.html", icon: "gear" },
  { page: "login", label: "Login/Account", path: "pages/login.html", icon: "account" },
];

function icon(name) {
  const paths = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16M8 7h8M8 11h6"/>',
    check: '<path d="M5 12l4 4L19 6"/><path d="M4 4h16v16H4z"/>',
    calendar: '<path d="M7 3v4M17 3v4M4 9h16"/><rect x="4" y="5" width="16" height="16" rx="3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    note: '<path d="M6 4h9l3 3v13H6z"/><path d="M15 4v4h4M9 12h6M9 16h6"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    chart: '<path d="M5 19V9M12 19V5M19 19v-7"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    account: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  };
  return `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
}

function applyShellState(state = loadState()) {
  document.body.classList.toggle("compact", Boolean(state.settings.compactMode));
  const pendingPill = $("#sidebarPending");
  if (pendingPill) {
    pendingPill.textContent = `${state.assignments.filter((item) => !item.done).length} pending`;
  }
}

function alertLink(root, href) {
  return `${root}pages/${href}`;
}

function renderAlertStrip(root) {
  const state = loadState();
  const strip = $("#alertStrip");
  if (!strip) return;
  const alerts = buildAlertItems(state).slice(0, 3);
  const sentIds = maybeSendBrowserNotifications(state);
  if (sentIds.length) {
    store.setReminders({
      ...state.reminders,
      browserSent: [...new Set([...(state.reminders.browserSent || []), ...sentIds])].slice(-80),
    });
  }

  strip.hidden = !alerts.length;
  strip.innerHTML = alerts.length ? `
    <div class="alert-strip-list">
      ${alerts.map((alert) => `
        <article class="mini-alert ${esc(alert.severity)}">
          <div>
            <strong>${esc(alert.title)}</strong>
            <span>${esc(alert.message)}</span>
          </div>
          <div class="mini-alert-actions">
            <a class="text-link" href="${alertLink(root, alert.href)}">Open</a>
            <button class="icon-btn" data-dismiss-alert="${esc(alert.id)}" aria-label="Dismiss reminder">Done</button>
          </div>
        </article>`).join("")}
    </div>
    <a class="text-link alert-center-link" href="${root}pages/notifications.html">Notification center</a>` : "";
}

export function syncPageState(state) {
  Object.assign(state, loadState());
  applyShellState(state);
  return state;
}

export function onCloudStateLoaded(state, callback) {
  window.addEventListener("studyflow:cloud-loaded", () => {
    syncPageState(state);
    callback?.(state);
  });
}

export function initShell() {
  const activePage = document.body.dataset.page || "dashboard";
  const state = loadState();
  const root = window.location.pathname.includes("/pages/") ? "../" : "";
  const initialSyncStatus = getCloudSyncStatus();
  const [initialSyncTitle, initialSyncDetail = ""] = initialSyncStatus.split(". ");
  applyShellState(state);

  $("#appShell").innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <a class="brand" href="${root}index.html">
          <span class="brand-mark">SF</span>
          <span>StudyFlow</span>
        </a>
        <nav class="nav-list" aria-label="Main navigation">
          ${nav.map((item) => `
            <a class="nav-link ${item.page === activePage ? "active" : ""}" href="${root}${item.path}" ${item.page === activePage ? 'aria-current="page"' : ""}>
              ${icon(item.icon)}
              <span>${item.label}</span>
            </a>
          `).join("")}
        </nav>
        <div class="sidebar-footer">
          <span class="pill" id="sidebarPending">${state.assignments.filter((item) => !item.done).length} pending</span>
        </div>
      </aside>
      <div>
        <header class="mobile-topbar">
          <button class="icon-btn" id="menuButton" aria-label="Open menu">Menu</button>
          <a class="brand" href="${root}index.html"><span class="brand-mark">SF</span><span>StudyFlow</span></a>
        </header>
        <main class="main">
          <div class="sync-banner" role="status">
            <strong id="syncStatusTitle">${initialSyncTitle}</strong>
            <span id="syncStatusDetail">${initialSyncDetail}</span>
          </div>
          <section class="alert-strip" id="alertStrip" aria-label="StudyFlow alerts" hidden></section>
          <div class="page-wrap" id="pageMount"></div>
        </main>
      </div>
    </div>`;

  $("#pageMount").append($("#pageContent").content.cloneNode(true));
  $("#menuButton")?.addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  $$(".nav-link").forEach((link) => link.addEventListener("click", () => $("#sidebar").classList.remove("open")));
  onSyncStatus(({ status, detail }) => {
    $("#syncStatusTitle").textContent = status;
    $("#syncStatusDetail").textContent = detail;
  });
  document.addEventListener("click", (event) => {
    const alertId = event.target.dataset.dismissAlert;
    if (!alertId) return;
    const latest = loadState();
    const alert = buildAlertItems(latest, { includeDismissed: true }).find((item) => item.id === alertId);
    store.setReminders({
      ...latest.reminders,
      dismissed: [...new Set([...(latest.reminders.dismissed || []), alertId])].slice(-80),
      completed: alert ? [...(latest.reminders.completed || []), { ...alert, completedAt: new Date().toISOString() }].slice(-40) : latest.reminders.completed,
    });
    renderAlertStrip(root);
  });
  window.addEventListener("studyflow:local-change", () => {
    applyShellState(loadState());
    renderAlertStrip(root);
  });
  window.addEventListener("studyflow:cloud-loaded", () => {
    applyShellState(loadState());
    renderAlertStrip(root);
  });
  renderAlertStrip(root);
  initCloudSync();
  return state;
}
