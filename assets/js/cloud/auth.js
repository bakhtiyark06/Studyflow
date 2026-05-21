import { firebaseConfig, hasFirebaseConfig } from "./firebaseConfig.js";

let firebaseAuth = null;

export function getAuthMode() {
  return hasFirebaseConfig() ? "firebase-ready" : "local-mode";
}

async function loadFirebaseAuth() {
  if (!hasFirebaseConfig()) return null;
  if (firebaseAuth) return firebaseAuth;

  const appModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
  const authModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
  const app = appModule.initializeApp(firebaseConfig);
  firebaseAuth = {
    auth: authModule.getAuth(app),
    ...authModule,
  };
  return firebaseAuth;
}

function localModeResult(action) {
  return {
    ok: false,
    mode: "local-mode",
    message: `${action} is ready for Firebase setup. StudyFlow is currently running in Local Mode.`,
  };
}

export async function signUpWithEmail(email, password) {
  const firebase = await loadFirebaseAuth();
  if (!firebase) return localModeResult("Signup");
  const credential = await firebase.createUserWithEmailAndPassword(firebase.auth, email, password);
  return { ok: true, mode: "firebase", user: credential.user, message: "Account created." };
}

export async function signInWithEmail(email, password) {
  const firebase = await loadFirebaseAuth();
  if (!firebase) return localModeResult("Login");
  const credential = await firebase.signInWithEmailAndPassword(firebase.auth, email, password);
  return { ok: true, mode: "firebase", user: credential.user, message: "Logged in." };
}

export async function signOutUser() {
  const firebase = await loadFirebaseAuth();
  if (!firebase) return localModeResult("Logout");
  await firebase.signOut(firebase.auth);
  return { ok: true, mode: "firebase", user: null, message: "Logged out." };
}

export async function getCurrentUser() {
  const firebase = await loadFirebaseAuth();
  return firebase?.auth?.currentUser || null;
}
