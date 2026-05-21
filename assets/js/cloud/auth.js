import { hasFirebaseConfig } from "./firebaseConfig.js";
import { getFirebaseApp } from "./firebaseCore.js";

let firebaseAuth = null;
let firebaseLoadError = null;

export function getAuthMode() {
  return hasFirebaseConfig() ? "firebase-ready" : "local-mode";
}

async function loadFirebaseAuth() {
  if (!hasFirebaseConfig()) return null;
  if (firebaseAuth) return firebaseAuth;
  if (firebaseLoadError) return null;

  try {
    const authModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
    const app = await getFirebaseApp();
    if (!app) return null;
    const auth = authModule.getAuth(app);
    await authModule.setPersistence(auth, authModule.browserLocalPersistence);
    firebaseAuth = { auth, ...authModule };
  } catch (error) {
    firebaseLoadError = error;
    return null;
  }
  return firebaseAuth;
}

function localModeResult(action) {
  return {
    ok: false,
    mode: "local-mode",
    message: `${action} is ready for Firebase setup. StudyFlow is currently running in Local Mode.`,
  };
}

function firebaseErrorResult(action, error) {
  const code = String(error?.code || "");
  const friendly = {
    "auth/email-already-in-use": "That email already has an account.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/invalid-credential": "Email or password was not accepted.",
    "auth/user-not-found": "No account was found for that email.",
    "auth/wrong-password": "Email or password was not accepted.",
    "auth/weak-password": "Use a stronger password with at least 6 characters.",
  };
  return {
    ok: false,
    mode: "firebase",
    message: friendly[code] || `${action} could not complete. Try again in a moment.`,
  };
}

export async function signUpWithEmail(email, password) {
  const firebase = await loadFirebaseAuth();
  if (!firebase) return localModeResult("Signup");
  try {
    const credential = await firebase.createUserWithEmailAndPassword(firebase.auth, email, password);
    return { ok: true, mode: "firebase", user: credential.user, message: "Account created." };
  } catch (error) {
    return firebaseErrorResult("Signup", error);
  }
}

export async function signInWithEmail(email, password) {
  const firebase = await loadFirebaseAuth();
  if (!firebase) return localModeResult("Login");
  try {
    const credential = await firebase.signInWithEmailAndPassword(firebase.auth, email, password);
    return { ok: true, mode: "firebase", user: credential.user, message: "Logged in." };
  } catch (error) {
    return firebaseErrorResult("Login", error);
  }
}

export async function signOutUser() {
  const firebase = await loadFirebaseAuth();
  if (!firebase) return localModeResult("Logout");
  try {
    await firebase.signOut(firebase.auth);
    return { ok: true, mode: "firebase", user: null, message: "Logged out." };
  } catch (error) {
    return firebaseErrorResult("Logout", error);
  }
}

export async function getCurrentUser() {
  const firebase = await loadFirebaseAuth();
  return firebase?.auth?.currentUser || null;
}

export async function watchAuthState(callback) {
  const firebase = await loadFirebaseAuth();
  if (!firebase) {
    callback({ mode: "local-mode", user: null, label: "Local Mode" });
    return () => {};
  }

  return firebase.onAuthStateChanged(
    firebase.auth,
    (user) => {
      callback({
        mode: "firebase",
        user,
        label: user?.email ? `Signed in as ${user.email}` : "Signed out",
      });
    },
    () => {
      callback({ mode: "local-mode", user: null, label: "Local Mode" });
    }
  );
}
