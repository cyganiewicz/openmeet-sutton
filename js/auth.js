// Load on any page that needs Google sign-in:
// <script src="https://accounts.google.com/gsi/client" async defer></script>

export const GOOGLE_CLIENT_ID = "1053304257177-3lm950qstcn6cvb1omjnqbj3dqlv1o08.apps.googleusercontent.com";
export const WEBAPP_URL = "https://script.google.com/macros/s/REPLACE_WITH_YOUR_EXEC_URL/exec"; // MUST be the /exec URL

let idToken = null; // in-memory cache
const KEY = "om_id_token"; // persisted across refreshes

// ----- Token helpers -----
export function getToken() {
  return idToken || localStorage.getItem(KEY) || null;
}
export function setToken(tok) {
  idToken = tok;
  if (tok) localStorage.setItem(KEY, tok);
}
export function clearToken() {
  idToken = null;
  localStorage.removeItem(KEY);
}

// ----- Sign-in button + auto-resume on refresh -----
export function renderSignIn(buttonId, onSignedIn) {
  /* global google */
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (resp) => {
      setToken(resp.credential);
      if (typeof onSignedIn === "function") onSignedIn();
    }
  });
  const el = document.getElementById(buttonId);
  if (el) google.accounts.id.renderButton(el, { theme: "outline", size: "large" });

  // If we already have a token from a previous sign-in (persisted), start immediately.
  const saved = getToken();
  if (saved && typeof onSignedIn === "function") onSignedIn();
}

// Optional helper if you want to trigger the GIS one-tap prompt again
export function promptSignIn() {
  /* global google */
  if (window.google?.accounts?.id?.prompt) {
    google.accounts.id.prompt(); // shows one-tap if eligible
  }
}

// IMPORTANT: Use text/plain to avoid CORS preflight.
// Auto-recover if the token is invalid/expired by clearing and re-prompting.
export async function postSecure(action, payload) {
  let t = getToken();
  if (!t) {
    // No token yet: try prompting once
    promptSignIn();
    throw new Error("Not signed in");
  }

  const r = await fetch(WEBAPP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, id_token: t, ...payload }),
  });

  const text = await r.text();
  let out;
  try { out = JSON.parse(text); } catch { throw new Error("Bad JSON from server: " + text.slice(0, 200)); }

  // If server says token is invalid, clear and hint the UI to re-sign
  if (out && out.error && /Invalid id_token|Missing id_token|Mismatched audience/i.test(out.error)) {
    clearToken();
    promptSignIn();
    throw new Error("Your session expired. Please sign in again.");
  }
  if (out && out.error) throw new Error(out.error);
  return out;
}
