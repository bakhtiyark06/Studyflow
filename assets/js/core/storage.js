const KEYS = {
  assignments: "sf_a",
  exams: "sf_e",
  study: "sf_s",
  name: "sf_name",
  notes: "sf_notes",
  classes: "sf_classes",
  settings: "sf_settings",
};

const defaults = {
  assignments: [],
  exams: [],
  study: [],
  name: "Student",
  notes: [],
  classes: [],
  settings: { compactMode: false },
};

let suppressStorageEvents = false;

function emitStorageChange(key) {
  if (suppressStorageEvents || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("studyflow:local-change", { detail: { key } }));
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`StudyFlow could not read ${key}`, error);
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    emitStorageChange(key);
    return true;
  } catch (error) {
    console.warn(`StudyFlow could not save ${key}`, error);
    return false;
  }
}

function readString(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch (error) {
    console.warn(`StudyFlow could not read ${key}`, error);
    return fallback;
  }
}

export function loadState() {
  return {
    assignments: readJson(KEYS.assignments, defaults.assignments),
    exams: readJson(KEYS.exams, defaults.exams),
    study: readJson(KEYS.study, defaults.study),
    name: readString(KEYS.name, defaults.name),
    notes: readJson(KEYS.notes, defaults.notes),
    classes: readJson(KEYS.classes, defaults.classes),
    settings: { ...defaults.settings, ...readJson(KEYS.settings, defaults.settings) },
  };
}

export const store = {
  setAssignments(value) { return writeJson(KEYS.assignments, value); },
  setExams(value) { return writeJson(KEYS.exams, value); },
  setStudy(value) { return writeJson(KEYS.study, value); },
  setNotes(value) { return writeJson(KEYS.notes, value); },
  setClasses(value) { return writeJson(KEYS.classes, value); },
  setName(value) {
    try {
      localStorage.setItem(KEYS.name, value || defaults.name);
      emitStorageChange(KEYS.name);
      return true;
    } catch (error) {
      console.warn("StudyFlow could not save name", error);
      return false;
    }
  },
  setSettings(value) { return writeJson(KEYS.settings, { ...defaults.settings, ...value }); },
  clearAll() {
    try {
      Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
      emitStorageChange("clear");
      return true;
    } catch (error) {
      console.warn("StudyFlow could not clear local data", error);
      return false;
    }
  },
};

export function replaceLocalStateFromSync(payload = {}) {
  suppressStorageEvents = true;
  try {
    if (KEYS.assignments in payload) localStorage.setItem(KEYS.assignments, JSON.stringify(payload[KEYS.assignments] || []));
    if (KEYS.exams in payload) localStorage.setItem(KEYS.exams, JSON.stringify(payload[KEYS.exams] || []));
    if (KEYS.study in payload) localStorage.setItem(KEYS.study, JSON.stringify(payload[KEYS.study] || []));
    if (KEYS.notes in payload) localStorage.setItem(KEYS.notes, JSON.stringify(payload[KEYS.notes] || []));
    if (KEYS.classes in payload) localStorage.setItem(KEYS.classes, JSON.stringify(payload[KEYS.classes] || []));
    if (KEYS.settings in payload) localStorage.setItem(KEYS.settings, JSON.stringify({ ...defaults.settings, ...(payload[KEYS.settings] || {}) }));
    if (KEYS.name in payload) localStorage.setItem(KEYS.name, payload[KEYS.name] || defaults.name);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("studyflow:cloud-loaded", { detail: { keys: Object.keys(payload) } }));
    }
    return true;
  } catch (error) {
    console.warn("StudyFlow could not apply cloud data", error);
    return false;
  } finally {
    suppressStorageEvents = false;
  }
}

export { KEYS };
