import { firebaseConfig, hasFirebaseConfig } from "./firebaseConfig.js";

let firebaseApp = null;
let appLoadError = null;

export async function getFirebaseApp() {
  if (!hasFirebaseConfig()) return null;
  if (firebaseApp) return firebaseApp;
  if (appLoadError) return null;

  try {
    const appModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
    const apps = appModule.getApps();
    firebaseApp = apps.length ? apps[0] : appModule.initializeApp(firebaseConfig);
    return firebaseApp;
  } catch (error) {
    appLoadError = error;
    return null;
  }
}
