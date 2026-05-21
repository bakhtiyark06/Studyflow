import { KEYS, loadState } from "../core/storage.js";
import { hasFirebaseConfig } from "./firebaseConfig.js";

export const SYNC_KEYS = [
  KEYS.classes,
  KEYS.assignments,
  KEYS.exams,
  KEYS.study,
  KEYS.notes,
  KEYS.settings,
  KEYS.name,
];

export function getCloudSyncStatus() {
  return hasFirebaseConfig()
    ? "Firebase config detected. Cloud sync can be enabled in the next phase."
    : "Local Mode. Cloud Sync Coming Soon.";
}

export function buildLocalSyncPayload() {
  const state = loadState();
  return {
    [KEYS.classes]: state.classes,
    [KEYS.assignments]: state.assignments,
    [KEYS.exams]: state.exams,
    [KEYS.study]: state.study,
    [KEYS.notes]: state.notes,
    [KEYS.settings]: state.settings,
    [KEYS.name]: state.name,
    updatedAt: new Date().toISOString(),
  };
}

export async function pushLocalDataToCloud() {
  if (!hasFirebaseConfig()) {
    return {
      ok: false,
      mode: "local-mode",
      message: "Cloud sync is not active yet. Local data remains saved in this browser.",
    };
  }

  return {
    ok: false,
    mode: "firebase-ready",
    message: "Firestore write wiring will be added in the next sync phase.",
  };
}

export async function pullCloudDataToLocal() {
  if (!hasFirebaseConfig()) {
    return {
      ok: false,
      mode: "local-mode",
      message: "Cloud sync is not active yet. Nothing was downloaded.",
    };
  }

  return {
    ok: false,
    mode: "firebase-ready",
    message: "Firestore read wiring will be added in the next sync phase.",
  };
}
