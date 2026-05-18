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
      return true;
    } catch (error) {
      console.warn("StudyFlow could not clear local data", error);
      return false;
    }
  },
};

export { KEYS };
