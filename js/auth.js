// Load on pages that need Google sign-in:
// <script src="https://accounts.google.com/gsi/client" async defer></script>

export const GOOGLE_CLIENT_ID = "1053304257177-3lm950qstcn6cvb1omjnqbj3dqlv1o08.apps.googleusercontent.com";
export const WEBAPP_URL = "https://script.google.com/macros/s/REPLACE_WITH_YOUR_EXEC_URL/exec"; // MUST be the /exec URL

let idToken = null;

export function renderSignIn(buttonId, onSignedIn) {
  /* global google */
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (resp) => {
      idToken = resp.credential;
      sessionStorage.setItem('om_id_token', idToken);
      if (typeof onSignedIn === 'function') onSignedIn();
    }
  });
  const el = document.getElementById(buttonId);
  if (el) google.accounts.id.renderButton(el, { theme: "outline", size: "large" });
}

export function getToken() {
  return idToken || sessionStorage.getItem('om_id_token');
}

// IMPORTANT: use text/plain to avoid CORS preflight.
// Also avoid shadowing function names (e.g., don't name a var "token").
export async function postSecure(action, payload) {
  const t = getToken();
  if (!t) throw new Error("Not signed in");

  const r = await fetch(WEBAPP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, id_token: t, ...payload }),
  });

  const text = await r.text();
  let out;
  try { out = JSON.parse(text); } catch { throw new Error("Bad JSON from server: " + text.slice(0, 200)); }
  if (out && out.error) throw new Error(out.error);
  return out;
}
