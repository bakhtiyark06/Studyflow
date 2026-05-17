/* =====================================================
   StudyFlow — script.js
   State, rendering, events, LocalStorage, timer
   ===================================================== */

'use strict';

// =====================
// STATE
// =====================

const State = {
  assignments: [],
  exams: [],
  study: [],
  name: 'Student',
  view: 'dashboard',
  filter: 'all',
  timer: {
    running: false,
    paused: false,
    seconds: 0,
    interval: null,
    startEpoch: null,
    presetSecs: null,
  },
};

// =====================
// PERSISTENCE
// =====================

function load() {
  try {
    State.assignments = JSON.parse(localStorage.getItem('sf_a') || '[]');
    State.exams       = JSON.parse(localStorage.getItem('sf_e') || '[]');
    State.study       = JSON.parse(localStorage.getItem('sf_s') || '[]');
    State.name        = localStorage.getItem('sf_name') || 'Student';
  } catch(e) { console.warn('StudyFlow load error', e); }
}

const save = {
  assignments: () => localStorage.setItem('sf_a', JSON.stringify(State.assignments)),
  exams:       () => localStorage.setItem('sf_e', JSON.stringify(State.exams)),
  study:       () => localStorage.setItem('sf_s', JSON.stringify(State.study)),
  name:        () => localStorage.setItem('sf_name', State.name),
};

// =====================
// UTILS
// =====================

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function daysUntil(dateStr) {
  const now  = new Date(); now.setHours(0,0,0,0);
  const then = new Date(dateStr); then.setHours(0,0,0,0);
  return Math.round((then - now) / 86_400_000);
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric' })
    + ' at ' + d.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
}

function hms(secs) {
  const h = Math.floor(secs / 3600).toString().padStart(2,'0');
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2,'0');
  const s = (secs % 60).toString().padStart(2,'0');
  return `${h}:${m}:${s}`;
}

function fmtDuration(mins) {
  if (!mins) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function timeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function dueClass(dateStr) {
  const d = daysUntil(dateStr);
  if (d < 0) return 'overdue';
  if (d <= 2) return 'soon';
  return '';
}

function dueLabel(dateStr) {
  const d = daysUntil(dateStr);
  if (d < -1) return `${Math.abs(d)}d overdue`;
  if (d === -1) return '1d overdue';
  if (d === 0)  return 'Due today';
  if (d === 1)  return 'Due tomorrow';
  return `Due in ${d}d`;
}

function studyStreak() {
  const days = new Set(State.study.map(s => s.date.split('T')[0]));
  let streak = 0;
  const ref = new Date();
  for (let i = 0; i < 365; i++) {
    const key = new Date(ref.getTime() - i * 86_400_000).toISOString().split('T')[0];
    if (days.has(key)) streak++;
    else break;
  }
  return streak;
}

function totalStudyMins() {
  return State.study.reduce((acc, s) => acc + (s.duration || 0), 0);
}

function allCourses() {
  return [...new Set([
    ...State.assignments.map(a => a.course),
    ...State.exams.map(e => e.course),
    ...State.study.map(s => s.course),
  ].filter(Boolean))];
}

// =====================
// HTML BUILDERS
// =====================

function emptyHTML(icon, text) {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-text">${text}</div></div>`;
}

function assignCardHTML(a, slim = false) {
  const dc   = dueClass(a.dueDate);
  const dl   = dueLabel(a.dueDate);
  return `
    <div class="assign-card ${a.done ? 'is-done' : ''}" data-id="${a.id}" role="listitem">
      <div class="check-box ${a.done ? 'checked' : ''}" data-toggle="${a.id}" role="checkbox"
           aria-checked="${a.done}" aria-label="Mark ${esc(a.title)} complete" tabindex="0">
        ${a.done ? '&#10003;' : ''}
      </div>
      <div class="ac-body">
        <div class="ac-title">${esc(a.title)}</div>
        <div class="ac-meta">
          ${a.course ? `<span class="tag tag-course">${esc(a.course)}</span>` : ''}
          <span class="tag tag-${a.priority}">${a.priority}</span>
          <span class="due-label ${dc}">${dl}</span>
        </div>
      </div>
      ${slim ? '' : `
        <div class="ac-actions">
          <button class="icon-btn del" data-del="${a.id}" aria-label="Delete assignment" title="Delete">&#x2715;</button>
        </div>`}
    </div>`;
}

function examCardHTML(e) {
  const days = Math.max(0, daysUntil(e.date));
  return `
    <div class="exam-card" data-id="${e.id}" role="listitem">
      <div class="exam-countdown" aria-label="${days} days away">
        <div class="cd-num">${days}</div>
        <div class="cd-unit">days</div>
      </div>
      <div class="exam-body">
        <div class="exam-title">${esc(e.title)}</div>
        <div class="exam-meta">
          ${e.course   ? `<span>&#128218; ${esc(e.course)}</span>` : ''}
          <span>&#128197; ${formatDateTime(e.date)}</span>
          ${e.location ? `<span>&#128205; ${esc(e.location)}</span>` : ''}
        </div>
      </div>
      <div class="exam-actions">
        <button class="icon-btn del" data-del-exam="${e.id}" aria-label="Delete exam" title="Delete">&#x2715;</button>
      </div>
    </div>`;
}

function studyItemHTML(s) {
  return `
    <div class="study-item" role="listitem">
      <div class="study-dur" aria-label="${fmtDuration(s.duration)}">${fmtDuration(s.duration)}</div>
      <div class="study-info">
        <div class="study-course">${esc(s.course || 'General Study')}</div>
        <div class="study-date">${formatDate(s.date)}</div>
      </div>
      <button class="icon-btn del study-delete" data-del-study="${s.id}" aria-label="Delete session">&#x2715;</button>
    </div>`;
}

// =====================
// RENDER — DASHBOARD
// =====================

function renderDashboard() {
  // Greeting
  el('timeOfDay').textContent  = timeOfDay();
  el('userName').textContent   = State.name;

  const pending  = State.assignments.filter(a => !a.done);
  const overdue  = pending.filter(a => daysUntil(a.dueDate) < 0);
  const upcoming = State.exams.filter(e => new Date(e.date) > new Date());
  const mins     = totalStudyMins();

  // Stats
  el('statsGrid').innerHTML = `
    <div class="stat-card c-accent">
      <div class="stat-num">${pending.length}</div>
      <div class="stat-label">Pending</div>
    </div>
    <div class="stat-card c-danger">
      <div class="stat-num">${overdue.length}</div>
      <div class="stat-label">Overdue</div>
    </div>
    <div class="stat-card c-violet">
      <div class="stat-num">${upcoming.length}</div>
      <div class="stat-label">Exams Ahead</div>
    </div>
    <div class="stat-card c-success">
      <div class="stat-num">${fmtDuration(mins)}</div>
      <div class="stat-label">Total Study</div>
    </div>`;

  // Due soon
  const sorted = [...pending].sort((a,b) => new Date(a.dueDate)-new Date(b.dueDate)).slice(0,5);
  el('dueSoonList').innerHTML = sorted.length
    ? sorted.map(a => assignCardHTML(a, true)).join('')
    : emptyHTML('&#128235;', 'All clear — no pending assignments');

  // Upcoming exams
  const eList = [...upcoming].sort((a,b) => new Date(a.date)-new Date(b.date)).slice(0,3);
  el('upcomingExams').innerHTML = eList.length
    ? eList.map(e => examCardHTML(e)).join('')
    : emptyHTML('&#128197;', 'No upcoming exams');

  // Recent study
  const recent = [...State.study].reverse().slice(0,4);
  el('recentStudy').innerHTML = recent.length
    ? recent.map(s => studyItemHTML(s)).join('')
    : emptyHTML('&#9202;', 'Start the timer to log study time');

  // Streak
  el('streakCount').textContent = studyStreak();

  // Subtitle encouragement
  const msg = overdue.length
    ? `${overdue.length} assignment${overdue.length>1?'s':''} overdue — you can catch up!`
    : pending.length === 0
      ? "You're all caught up. Nice work!"
      : `${pending.length} assignment${pending.length>1?'s':''} to go. Keep at it!`;
  el('dashSubtitle').textContent = msg;

  // Nav badges
  const ba = el('navBadgeAssign');
  if (overdue.length) { ba.textContent = overdue.length; ba.style.display = ''; }
  else ba.style.display = 'none';

  const now = new Date();
  const examSoon = State.exams.filter(e => {
    const d = daysUntil(e.date);
    return d >= 0 && d <= 7;
  }).length;
  const be = el('navBadgeExam');
  if (examSoon) { be.textContent = examSoon; be.style.display = ''; }
  else be.style.display = 'none';

  bindCheckboxes();
  bindExamHover();
}

// =====================
// RENDER — ASSIGNMENTS
// =====================

function renderAssignments() {
  let list = [...State.assignments];
  if (State.filter === 'pending')   list = list.filter(a => !a.done);
  if (State.filter === 'completed') list = list.filter(a => a.done);

  // Sort: incomplete first, then by priority, then by date
  const priMap = { high:0, medium:1, low:2 };
  list.sort((a,b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (priMap[a.priority] !== priMap[b.priority]) return priMap[a.priority]-priMap[b.priority];
    return new Date(a.dueDate)-new Date(b.dueDate);
  });

  el('assignmentsList').innerHTML = list.length
    ? list.map(a => assignCardHTML(a, false)).join('')
    : emptyHTML('&#128221;', 'Nothing here. Hit "+ Add" to create an assignment.');

  bindCheckboxes();
  bindDeleteAssign();
}

// =====================
// RENDER — EXAMS
// =====================

function renderExams() {
  const now = new Date();
  const coming = State.exams.filter(e=>new Date(e.date)>now).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const past   = State.exams.filter(e=>new Date(e.date)<=now).sort((a,b)=>new Date(b.date)-new Date(a.date));

  let html = '';
  if (coming.length) html += `<h2 class="section-label">Upcoming</h2>${coming.map(examCardHTML).join('')}`;
  if (past.length)   html += `<h2 class="section-label" style="margin-top:32px">Past Exams</h2>
    <div style="opacity:.45">${past.map(examCardHTML).join('')}</div>`;

  el('examsList').innerHTML = html || emptyHTML('&#128218;', 'No exams yet. Hit "+ Add" to track one.');
  bindExamHover();
  bindDeleteExam();
}

// =====================
// RENDER — STUDY LOG
// =====================

function renderStudyLog() {
  const list = [...State.study].reverse();
  el('studyLog').innerHTML = list.length
    ? list.map(studyItemHTML).join('')
    : emptyHTML('&#9202;', 'Start the timer above to log a session');

  const mins = totalStudyMins();
  el('studyTotal').textContent = mins ? `${fmtDuration(mins)} total` : '';

  el('streakCount').textContent = studyStreak();
  bindDeleteStudy();
  updateCourseList();
}

// =====================
// RENDER — CURRENT VIEW
// =====================

function renderView() {
  switch(State.view) {
    case 'dashboard':   renderDashboard();   break;
    case 'assignments': renderAssignments(); break;
    case 'exams':       renderExams();       break;
    case 'study':       renderStudyLog();    break;
  }
}

// =====================
// NAVIGATION
// =====================

function switchView(view) {
  State.view = view;

  qsa('.nav-item').forEach(btn => {
    const active = btn.dataset.view === view;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-current', active ? 'page' : 'false');
  });

  qsa('.view').forEach(sec => sec.classList.toggle('active', sec.id === `view-${view}`));

  const titles = { dashboard:'Dashboard', assignments:'Assignments', exams:'Exams', study:'Study Timer' };
  el('topbarTitle').textContent = titles[view] || '';

  const addBtn = el('addBtn');
  if (view === 'assignments' || view === 'exams') {
    addBtn.classList.remove('hidden');
    addBtn.dataset.target = view === 'assignments' ? 'assignment' : 'exam';
  } else {
    addBtn.classList.add('hidden');
  }

  renderView();
  closeSidebar();
}

// =====================
// MODALS
// =====================

function openModal(type) {
  el('modalBackdrop').classList.remove('hidden');
  el(`modal-${type}`).classList.remove('hidden');
  const first = el(`modal-${type}`).querySelector('input, select, textarea');
  if (first) setTimeout(() => first.focus(), 50);
}

function closeModal(type) {
  el(`modal-${type}`).classList.add('hidden');
  const any = [...qsa('.modal')].some(m => !m.classList.contains('hidden'));
  if (!any) el('modalBackdrop').classList.add('hidden');
}

function closeAllModals() {
  qsa('.modal').forEach(m => m.classList.add('hidden'));
  el('modalBackdrop').classList.add('hidden');
}

// =====================
// ADD ASSIGNMENT
// =====================

function addAssignment() {
  const title   = el('aTitle').value.trim();
  const dueDate = el('aDueDate').value;

  if (!title)   { toast('Please enter a title', 'error'); el('aTitle').focus(); return; }
  if (!dueDate) { toast('Please pick a due date', 'error'); el('aDueDate').focus(); return; }

  State.assignments.push({
    id:       uid(),
    title,
    course:   el('aCourse').value.trim(),
    dueDate,
    priority: el('aPriority').value,
    notes:    el('aNotes').value.trim(),
    done:     false,
    created:  new Date().toISOString(),
  });

  save.assignments();
  updateCourseList();
  closeModal('assignment');
  reset(['aTitle','aCourse','aNotes']);
  el('aPriority').value = 'medium';
  el('aDueDate').value  = today();
  toast('Assignment added!', 'success');
  renderView();
}

// =====================
// ADD EXAM
// =====================

function addExam() {
  const title = el('eTitle').value.trim();
  const date  = el('eDate').value;

  if (!title) { toast('Please enter an exam name', 'error'); el('eTitle').focus(); return; }
  if (!date)  { toast('Please pick a date and time', 'error'); el('eDate').focus(); return; }

  State.exams.push({
    id:       uid(),
    title,
    course:   el('eCourse').value.trim(),
    date,
    location: el('eLocation').value.trim(),
    notes:    el('eNotes').value.trim(),
    created:  new Date().toISOString(),
  });

  save.exams();
  closeModal('exam');
  reset(['eTitle','eCourse','eDate','eLocation','eNotes']);
  toast('Exam added!', 'success');
  renderView();
}

// =====================
// TOGGLE / DELETE
// =====================

function bindCheckboxes() {
  qsa('[data-toggle]').forEach(box => {
    box.addEventListener('click', handleToggle);
    box.addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' ') handleToggle.call(box); });
  });
}

function handleToggle() {
  const id = this.dataset.toggle;
  const a  = State.assignments.find(x => x.id === id);
  if (!a) return;
  a.done = !a.done;
  save.assignments();
  renderView();
  toast(a.done ? '&#10003; Marked complete!' : 'Marked incomplete', a.done ? 'success' : 'default');
}

function bindDeleteAssign() {
  qsa('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      State.assignments = State.assignments.filter(a => a.id !== btn.dataset.del);
      save.assignments();
      renderView();
      toast('Assignment removed');
    });
  });
}

function bindDeleteExam() {
  qsa('[data-del-exam]').forEach(btn => {
    btn.addEventListener('click', () => {
      State.exams = State.exams.filter(e => e.id !== btn.dataset.delExam);
      save.exams();
      renderView();
      toast('Exam removed');
    });
  });
}

function bindDeleteStudy() {
  qsa('[data-del-study]').forEach(btn => {
    btn.addEventListener('click', () => {
      State.study = State.study.filter(s => s.id !== btn.dataset.delStudy);
      save.study();
      renderStudyLog();
      toast('Session removed');
    });
  });
}

function bindExamHover() {
  qsa('.exam-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      const a = card.querySelector('.exam-actions');
      if (a) a.style.opacity = '1';
    });
    card.addEventListener('mouseleave', () => {
      const a = card.querySelector('.exam-actions');
      if (a) a.style.opacity = '0';
    });
  });
}

// =====================
// STUDY TIMER
// =====================

const T = State.timer;

function timerStart() {
  if (T.paused) {
    T.startEpoch = Date.now() - (T.seconds * 1000);
  } else {
    T.seconds    = 0;
    T.startEpoch = Date.now();
  }
  T.running = true;
  T.paused  = false;

  T.interval = setInterval(() => {
    T.seconds = Math.floor((Date.now() - T.startEpoch) / 1000);

    // Preset countdown finished?
    if (T.presetSecs !== null && T.seconds >= T.presetSecs) {
      timerStop(true);
      return;
    }

    el('timerDisplay').textContent = hms(T.seconds);
    updateTimerRing();
  }, 250);

  el('timerDisplay').className = 'timer-display running';
  el('timerStart').classList.add('hidden');
  el('timerPause').classList.remove('hidden');
  el('timerStop').classList.remove('hidden');

  qsa('.preset-btn').forEach(b => b.classList.remove('active'));
}

function timerPause() {
  clearInterval(T.interval);
  T.running = false;
  T.paused  = true;

  el('timerDisplay').className = 'timer-display paused';
  el('timerStart').textContent = 'Resume';
  el('timerStart').classList.remove('hidden');
  el('timerPause').classList.add('hidden');
}

function timerStop(auto = false) {
  clearInterval(T.interval);
  const secs = T.seconds;
  const mins = Math.max(0, Math.round(secs / 60));

  T.running    = false;
  T.paused     = false;
  T.presetSecs = null;
  T.seconds    = 0;

  // Reset UI
  el('timerDisplay').textContent = '00:00:00';
  el('timerDisplay').className   = 'timer-display';
  el('timerStart').textContent   = 'Start';
  el('timerStart').classList.remove('hidden');
  el('timerPause').classList.add('hidden');
  el('timerStop').classList.add('hidden');
  resetRing();
  qsa('.preset-btn').forEach(b => b.classList.remove('active'));

  if (mins > 0) {
    State.study.push({
      id:       uid(),
      course:   el('timerCourse').value.trim(),
      duration: mins,
      date:     new Date().toISOString(),
    });
    save.study();
    renderStudyLog();
    toast(`&#9201; Logged ${fmtDuration(mins)} of study!`, 'success');
  } else {
    toast('Session too short to log (< 1 min)', 'error');
  }
}

function updateTimerRing() {
  const circle  = el('timerProgress');
  if (!circle) return;
  const total   = T.presetSecs || 3600; // default: show full ring at 1hr
  const pct     = Math.min(T.seconds / total, 1);
  const circ    = 2 * Math.PI * 54; // r=54 → 339.3
  circle.style.strokeDashoffset = String(circ * (1 - pct));
}

function resetRing() {
  const circle = el('timerProgress');
  if (circle) circle.style.strokeDashoffset = '339.3';
}

function timerPreset(mins) {
  if (T.running) return;
  T.presetSecs = mins * 60;
  qsa('.preset-btn').forEach(b => b.classList.toggle('active', Number(b.dataset.mins) === mins));
  timerStart();
}

// =====================
// SETTINGS
// =====================

function openSettings() {
  el('settingName').value = State.name;
  openModal('settings');
}

function saveSettings() {
  const n = el('settingName').value.trim();
  if (n) {
    State.name = n;
    save.name();
  }
  closeModal('settings');
  renderView();
  toast('Settings saved', 'success');
}

function clearAllData() {
  if (!confirm('Delete ALL assignments, exams, and study data? This cannot be undone.')) return;
  State.assignments = [];
  State.exams       = [];
  State.study       = [];
  save.assignments();
  save.exams();
  save.study();
  closeAllModals();
  renderView();
  toast('All data cleared');
}

// =====================
// COURSE DATALISTS
// =====================

function updateCourseList() {
  const courses = allCourses();
  const opts    = courses.map(c => `<option value="${esc(c)}">`).join('');
  qsa('#courseList, #timerCourseList').forEach(dl => { dl.innerHTML = opts; });
}

// =====================
// TOAST
// =====================

function toast(msg, type = 'default') {
  const div = document.createElement('div');
  div.className = `toast ${type}`;
  div.innerHTML = msg;
  el('toastContainer').appendChild(div);

  setTimeout(() => {
    div.style.animation = 'toastOut .22s ease forwards';
    setTimeout(() => div.remove(), 240);
  }, 2800);
}

// =====================
// SIDEBAR MOBILE
// =====================

function openSidebar()  { el('sidebar').classList.add('open');    el('overlay').classList.add('active'); }
function closeSidebar() { el('sidebar').classList.remove('open'); el('overlay').classList.remove('active'); }

// =====================
// DOM HELPERS
// =====================

function el(id)  { return document.getElementById(id); }
function qsa(s)  { return document.querySelectorAll(s); }
function reset(ids) { ids.forEach(id => { const e = el(id); if(e) e.value = ''; }); }

// =====================
// KEYBOARD
// =====================

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAllModals();
});

// =====================
// INIT
// =====================

document.addEventListener('DOMContentLoaded', () => {
  load();

  // Set defaults for date inputs
  el('aDueDate').value = today();

  // Nav items
  qsa('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // Add button
  el('addBtn').addEventListener('click', () => openModal(el('addBtn').dataset.target));

  // Filter buttons
  qsa('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      qsa('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.filter = btn.dataset.filter;
      renderAssignments();
    });
  });

  // Modal close — "Cancel" + "×" buttons
  qsa('[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.modal));
  });

  // Click outside modal body to close
  el('modalBackdrop').addEventListener('click', e => {
    if (e.target === el('modalBackdrop')) closeAllModals();
  });

  // Save handlers
  el('saveAssignment').addEventListener('click', addAssignment);
  el('saveExam').addEventListener('click', addExam);
  el('saveSettings').addEventListener('click', saveSettings);
  el('clearDataBtn').addEventListener('click', clearAllData);

  // Enter key saves from first input field
  el('aTitle').addEventListener('keydown', e => { if(e.key==='Enter') addAssignment(); });
  el('eTitle').addEventListener('keydown', e => { if(e.key==='Enter') addExam(); });

  // Timer
  el('timerStart').addEventListener('click', timerStart);
  el('timerPause').addEventListener('click', timerPause);
  el('timerStop').addEventListener('click', () => timerStop(false));

  qsa('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => timerPreset(Number(btn.dataset.mins)));
  });

  // Settings
  el('settingsBtn').addEventListener('click', openSettings);

  // Sidebar mobile
  el('menuBtn').addEventListener('click', openSidebar);
  el('sidebarClose').addEventListener('click', closeSidebar);
  el('overlay').addEventListener('click', closeSidebar);

  // Initial render
  updateCourseList();
  switchView('dashboard');

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
      .catch(err => console.warn('SW registration failed:', err));
  }
});