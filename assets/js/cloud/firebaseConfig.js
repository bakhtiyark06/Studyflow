export const firebaseConfig = {
  apiKey: "AIzaSyDRrOMUtzD4oHkDBvFNpEBkDUnXn-1QuKE",
  authDomain: "studyflow-8ca8c.firebaseapp.com",
  projectId: "studyflow-8ca8c",
  storageBucket: "studyflow-8ca8c.firebasestorage.app",
  messagingSenderId: "895965535514",
  appId: "1:895965535514:web:8d8a8e9fc2110f3f9160a3",
};

export function hasFirebaseConfig() {
  return Object.values(firebaseConfig).every((value) => value && !String(value).startsWith("YOUR_"));
}
