import { KEYS, loadState, replaceLocalStateFromSync } from "../core/storage.js";
import { hasFirebaseConfig } from "./firebaseConfig.js";
import { getFirebaseApp } from "./firebaseCore.js";
import { watchAuthState } from "./auth.js";

export const SYNC_KEYS = [
  KEYS.classes,
  KEYS.assignments,
  KEYS.exams,
  KEYS.study,
  KEYS.notes,
  KEYS.settings,
  KEYS.name,
];

const DOC_BY_KEY = {
  [KEYS.classes]: "classes",
  [KEYS.assignments]: "assignments",
  [KEYS.exams]: "exams",
  [KEYS.study]: "studySessions",
  [KEYS.notes]: "notes",
  [KEYS.settings]: "settings",
  [KEYS.name]: "profile",
};

const KEY_BY_DOC = Object.fromEntries(Object.entries(DOC_BY_KEY).map(([key, docId]) => [docId, key]));

let firestoreApi = null;
let firestoreLoadError = null;
let currentUser = null;
let syncTimer = null;
let syncStarted = false;
const statusListeners = new Set();

function emitSyncStatus(status, detail = "") {
  const payload = { status, detail };
  statusListeners.forEach((listener) => listener(payload));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("studyflow:sync-status", { detail: payload }));
  }
}

export function onSyncStatus(listener) {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

export function getCloudSyncStatus() {
  return hasFirebaseConfig()
    ? "Signed out. Sign in to sync with Firestore."
    : "Local Mode. Cloud Sync Coming Soon.";
}

async function loadFirestore() {
  if (!hasFirebaseConfig()) return null;
  if (firestoreApi) return firestoreApi;
  if (firestoreLoadError) return null;

  try {
    const app = await getFirebaseApp();
    if (!app) return null;
    const firestoreModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
    firestoreApi = {
      db: firestoreModule.getFirestore(app),
      ...firestoreModule,
    };
    return firestoreApi;
  } catch (error) {
    firestoreLoadError = error;
    return null;
  }
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
    updatedAtClient: new Date().toISOString(),
  };
}

function userDataCollection(firestore, uid) {
  return firestore.collection(firestore.db, "users", uid, "studyflow");
}

function userDataDoc(firestore, uid, key) {
  return firestore.doc(firestore.db, "users", uid, "studyflow", DOC_BY_KEY[key]);
}

export async function pushLocalDataToCloud(user = currentUser) {
  if (!user?.uid) {
    const status = hasFirebaseConfig() ? "Signed out" : "Local Mode";
    const mode = hasFirebaseConfig() ? "signed-out" : "local-mode";
    emitSyncStatus(status, "Sign in to enable cloud sync.");
    return { ok: false, mode, message: "Sign in to enable cloud sync." };
  }

  const firestore = await loadFirestore();
  if (!firestore) {
    emitSyncStatus("Sync Error", "Firestore is unavailable. Local data is safe.");
    return { ok: false, mode: "sync-error", message: "Firestore is unavailable. Local data is still saved locally." };
  }

  try {
    emitSyncStatus("Syncing", "Uploading local changes...");
    const payload = buildLocalSyncPayload();
    const batch = firestore.writeBatch(firestore.db);
    SYNC_KEYS.forEach((key) => {
      batch.set(userDataDoc(firestore, user.uid, key), {
        key,
        value: payload[key],
        updatedAt: firestore.serverTimestamp(),
        updatedAtClient: payload.updatedAtClient,
      }, { merge: true });
    });
    await batch.commit();
    emitSyncStatus("Synced", "Cloud data is up to date.");
    return { ok: true, mode: "synced", message: "Cloud data is up to date." };
  } catch (error) {
    emitSyncStatus("Sync Error", "Could not upload changes. Local data is safe.");
    return { ok: false, mode: "sync-error", message: "Could not upload changes. Local data is still saved locally." };
  }
}

export async function pullCloudDataToLocal(user = currentUser) {
  if (!user?.uid) {
    const status = hasFirebaseConfig() ? "Signed out" : "Local Mode";
    const mode = hasFirebaseConfig() ? "signed-out" : "local-mode";
    emitSyncStatus(status, "Sign in to load cloud data.");
    return { ok: false, mode, message: "Sign in to load cloud data." };
  }

  const firestore = await loadFirestore();
  if (!firestore) {
    emitSyncStatus("Sync Error", "Firestore is unavailable. Local data is safe.");
    return { ok: false, mode: "sync-error", message: "Firestore is unavailable. Local data is still saved locally." };
  }

  try {
    emitSyncStatus("Syncing", "Loading cloud data...");
    const snapshot = await firestore.getDocs(userDataCollection(firestore, user.uid));
    const cloudPayload = {};
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const key = data.key || KEY_BY_DOC[docSnap.id];
      if (SYNC_KEYS.includes(key)) cloudPayload[key] = data.value;
    });

    if (!Object.keys(cloudPayload).length) {
      return { ok: true, empty: true, mode: "synced", message: "No cloud data found yet." };
    }

    replaceLocalStateFromSync(cloudPayload);
    emitSyncStatus("Synced", "Cloud data loaded onto this device.");
    return { ok: true, empty: false, mode: "synced", message: "Cloud data loaded onto this device." };
  } catch (error) {
    emitSyncStatus("Sync Error", "Could not load cloud data. Local data is safe.");
    return { ok: false, mode: "sync-error", message: "Could not load cloud data. Local data is still saved locally." };
  }
}

function scheduleCloudPush() {
  if (!currentUser?.uid) return;
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    pushLocalDataToCloud(currentUser);
  }, 700);
}

async function handleSignedIn(user) {
  currentUser = user;
  const pull = await pullCloudDataToLocal(user);
  if (pull.ok) {
    await pushLocalDataToCloud(user);
  }
}

export function initCloudSync() {
  if (syncStarted || typeof window === "undefined") return;
  syncStarted = true;

  window.addEventListener("studyflow:local-change", scheduleCloudPush);

  watchAuthState((status) => {
    if (status.mode === "local-mode") {
      currentUser = null;
      emitSyncStatus("Local Mode", "Cloud sync is unavailable. Local data is safe.");
      return;
    }

    if (!status.user) {
      currentUser = null;
      emitSyncStatus("Signed out", "Sign in to sync with Firestore.");
      return;
    }

    handleSignedIn(status.user);
  }).catch(() => {
    currentUser = null;
    emitSyncStatus("Sync Error", "Cloud sync could not start. Local data is safe.");
  });
}
