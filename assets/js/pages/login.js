import { initShell } from "../core/shell.js";
import { $, esc } from "../core/utils.js";
import { toast } from "../core/ui.js";
import { getAuthMode, signInWithEmail, signOutUser, signUpWithEmail } from "../cloud/auth.js";
import { buildLocalSyncPayload, getCloudSyncStatus, pushLocalDataToCloud, SYNC_KEYS } from "../cloud/cloudStorage.js";

initShell();

$("#authMode").textContent = getAuthMode() === "firebase-ready" ? "Firebase Ready" : "Local Mode";
$("#authMessage").textContent = getCloudSyncStatus();
$("#syncKeys").innerHTML = SYNC_KEYS.map((key) => `<div><code>${esc(key)}</code> will sync in a later phase.</div>`).join("");

function credentials() {
  return {
    email: $("#authEmail").value.trim(),
    password: $("#authPassword").value,
  };
}

function showResult(result) {
  $("#authMessage").textContent = result.message;
  toast(result.message);
}

async function runAuthAction(action) {
  try {
    showResult(await action());
  } catch (error) {
    const message = "Authentication is not available yet. Check Firebase setup and try again.";
    $("#authMessage").textContent = message;
    toast(message);
  }
}

$("#loginBtn").addEventListener("click", async () => {
  const { email, password } = credentials();
  if (!email || !password) return toast("Enter an email and password.");
  runAuthAction(() => signInWithEmail(email, password));
});

$("#signupBtn").addEventListener("click", async () => {
  const { email, password } = credentials();
  if (!email || password.length < 6) return toast("Enter an email and a password with at least 6 characters.");
  runAuthAction(() => signUpWithEmail(email, password));
});

$("#logoutBtn").addEventListener("click", async () => {
  runAuthAction(() => signOutUser());
});

$("#cloudSyncBtn").addEventListener("click", async () => {
  runAuthAction(() => pushLocalDataToCloud());
});

$("#previewPayloadBtn").addEventListener("click", () => {
  const payload = buildLocalSyncPayload();
  $("#authMessage").textContent = `Local payload ready: ${Object.keys(payload).length} fields prepared for future sync.`;
  console.info("StudyFlow future sync payload", payload);
  toast("Local sync payload preview was written to the console.");
});
