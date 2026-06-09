import { $, esc, formatDate, formatDateTime, daysUntil, durationLabel } from "./utils.js";

export function toast(message) {
  const region = $("#toastRegion");
  if (!region) return;
  const item = document.createElement("div");
  item.className = "toast";
  item.textContent = message;
  region.append(item);
  setTimeout(() => item.remove(), 2600);
}

export function emptyState(message) {
  return `<div class="empty-state">${esc(message)}</div>`;
}

export function statCard(label, value) {
  return `<article class="stat-card"><div class="stat-num">${esc(value)}</div><div class="stat-label">${esc(label)}</div></article>`;
}

export function assignmentCard(item, { compact = false, state = null } = {}) {
  const due = daysUntil(item.dueDate);
  const dueText = due < 0 ? `${Math.abs(due)}d overdue` : due === 0 ? "Due today" : `Due in ${due}d`;
  const linkedClass = state?.classes?.find((classItem) => classItem.id === item.classId);
  const classLabel = linkedClass?.name || item.course || "";
  const reminderText = item.reminderPreset && item.reminderPreset !== "none" ? "Reminder set" : "";
  return `
    <article class="card ${item.done ? "is-done" : ""}" data-id="${esc(item.id)}">
      <div>
        <h3 class="card-title">${esc(item.title)}</h3>
        <div class="card-meta">
          ${classLabel ? `<span>${esc(classLabel)}</span>` : ""}
          <span class="priority-${esc(item.priority || "medium")}">${esc(item.priority || "medium")}</span>
          <span>${esc(dueText)}</span>
          ${reminderText ? `<span>${esc(reminderText)}</span>` : ""}
        </div>
      </div>
      ${compact ? "" : `<div class="card-actions">
        <button class="icon-btn" data-edit="${esc(item.id)}" aria-label="Edit assignment">Edit</button>
        <button class="icon-btn" data-toggle="${esc(item.id)}" aria-label="Toggle complete">${item.done ? "Restore" : "Done"}</button>
        <button class="icon-btn" data-delete="${esc(item.id)}" aria-label="Delete assignment">Del</button>
      </div>`}
    </article>`;
}

export function examCard(item, { compact = false, state = null } = {}) {
  const days = Math.max(0, daysUntil(item.date));
  const linkedClass = state?.classes?.find((classItem) => classItem.id === item.classId);
  const classLabel = linkedClass?.name || item.course || "";
  const difficulty = item.difficulty || item.priority || "medium";
  return `
    <article class="card ${item.done ? "is-done" : ""}" data-id="${esc(item.id)}">
      <div>
        <h3 class="card-title">${esc(item.title)}</h3>
        <div class="card-meta">
          ${classLabel ? `<span>${esc(classLabel)}</span>` : ""}
          <span class="priority-${esc(difficulty === "hard" ? "high" : difficulty === "easy" ? "low" : "medium")}">${esc(difficulty)}</span>
          <span>${formatDateTime(item.date)}</span>
          ${item.location ? `<span>${esc(item.location)}</span>` : ""}
          ${item.reminderPreset && item.reminderPreset !== "none" ? "<span>Reminder set</span>" : ""}
        </div>
      </div>
      ${compact ? "" : `<div class="card-actions">
        <span class="tag">${days}d</span>
        <button class="icon-btn" data-edit="${esc(item.id)}" aria-label="Edit exam">Edit</button>
        <button class="icon-btn" data-toggle="${esc(item.id)}" aria-label="Toggle exam complete">${item.done ? "Restore" : "Done"}</button>
        <button class="icon-btn" data-delete="${esc(item.id)}" aria-label="Delete exam">Del</button>
      </div>`}
    </article>`;
}

export function studyCard(item) {
  return `
    <article class="card" data-id="${esc(item.id)}">
      <div>
        <h3 class="card-title">${esc(item.course || "General Study")}</h3>
        <div class="card-meta"><span>${formatDate(item.date)}</span></div>
      </div>
      <div class="card-actions">
        <span class="tag">${durationLabel(item.duration)}</span>
        <button class="icon-btn" data-delete="${esc(item.id)}" aria-label="Delete session">Del</button>
      </div>
    </article>`;
}

export function noteCard(item) {
  return `
    <article class="card" data-id="${esc(item.id)}">
      <div>
        <h3 class="card-title">${esc(item.title)}</h3>
        <div class="card-meta">
          ${item.course ? `<span>${esc(item.course)}</span>` : ""}
          <span>${formatDate(item.updated || item.created)}</span>
        </div>
        <p>${esc(item.body).slice(0, 160)}</p>
      </div>
      <div class="card-actions">
        <button class="icon-btn" data-delete="${esc(item.id)}" aria-label="Delete note">Del</button>
      </div>
    </article>`;
}

export function classCard(item) {
  return `
    <article class="card" data-id="${esc(item.id)}">
      <div>
        <h3 class="card-title">${esc(item.name)}</h3>
        <div class="card-meta">
          ${item.instructor ? `<span>${esc(item.instructor)}</span>` : ""}
          ${item.meetingTime ? `<span>${esc(item.meetingTime)}</span>` : ""}
          ${item.location ? `<span>${esc(item.location)}</span>` : ""}
        </div>
        ${item.notes ? `<p>${esc(item.notes).slice(0, 180)}</p>` : ""}
        ${item.syllabusUrl ? `<a class="text-link" href="${esc(item.syllabusUrl)}" target="_blank" rel="noreferrer">Open syllabus</a>` : ""}
      </div>
      <div class="card-actions">
        <button class="icon-btn" data-delete="${esc(item.id)}" aria-label="Delete class">Del</button>
      </div>
    </article>`;
}

export function modal(title, body, footer) {
  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <article class="panel modal">
        <div class="panel-header">
          <h2>${esc(title)}</h2>
          <button class="icon-btn" data-close-modal aria-label="Close">Close</button>
        </div>
        <div class="modal-body">${body}</div>
        <div class="modal-footer">${footer}</div>
      </article>
    </div>`;
}
