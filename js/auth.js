// Keep this tag in any page using sign-in:
// <script src="https://accounts.google.com/gsi/client" async defer></script>

export const GOOGLE_CLIENT_ID =
  "1053304257177-3lm950qstcn6cvb1omjnqbj3dqlv1o08.apps.googleusercontent.com";

// IMPORTANT: use your Apps Script *exec* URL (not /dev)
export const WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbzz1vfALij7VdOOhI_gI2ZnCsHydglOsG1kXIG6Yp2sXWdpqScVwxwm-YBg5-6DeOrz/exec";

let idToken = null;
const KEY = "om_id_token";

// ---- Token helpers (persist across refresh) ----
export function getToken() {
  return idToken || localStorage.getItem(KEY) || null;
}
export function setToken(tok) {
  idToken = tok || null;
  if (tok) localStorage.setItem(KEY, tok);
  else localStorage.removeItem(KEY);
}
export function clearToken() { setToken(null); }

// ---- Wait for GIS to be ready ----
async function waitForGIS(maxMs = 6000, intervalMs = 50) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function tick(){
      if (window.google?.accounts?.id) return resolve(window.google.accounts.id);
      if (Date.now() - start >= maxMs) return reject(new Error("Google Identity Services failed to load."));
      setTimeout(tick, intervalMs);
    })();
  });
}

export function promptSignIn() {
  try { window.google?.accounts?.id?.prompt?.(); } catch {}
}

// ---- Render sign-in button; autostart if token already saved ----
export async function renderSignIn(buttonId, onSignedIn) {
  const saved = getToken();
  if (saved && typeof onSignedIn === "function") {
    // start immediately; GIS will render button when ready
    try { onSignedIn(); } catch {}
  }

  let gis;
  try { gis = await waitForGIS(); }
  catch {
    const el = document.getElementById(buttonId);
    if (el) {
      el.innerHTML = "";
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = "Sign in with Google";
      btn.onclick = async ()=>{
        try { const g = await waitForGIS(4000); initAndRender(g, buttonId, onSignedIn); }
        catch { alert("Google Sign-In could not initialize. Please reload the page."); }
      };
      el.appendChild(btn);
    }
    return;
  }

  initAndRender(gis, buttonId, onSignedIn);
}

function initAndRender(gis, buttonId, onSignedIn){
  gis.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (resp)=>{
      if (resp?.credential) {
        setToken(resp.credential);
        if (typeof onSignedIn === "function") onSignedIn();
      }
    }
  });
  const el = document.getElementById(buttonId);
  if (el) {
    el.innerHTML = "";
    gis.renderButton(el, { theme: "outline", size: "large" });
  }
  promptSignIn();
}

// ---- Secure POST (no CORS preflight) ----
export async function postSecure(action, payload) {
  const tok = getToken();
  if (!tok) { promptSignIn(); throw new Error("Not signed in."); }

  const r = await fetch(WEBAPP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, id_token: tok, ...payload }),
  });

  const text = await r.text();
  let out; try { out = JSON.parse(text); }
  catch { throw new Error("Bad JSON from server: " + text.slice(0,200)); }

  if (out && out.error) {
    if (/Invalid id_token|Missing id_token|Mismatched audience|Staff\/Clerk Google account required/i.test(out.error)) {
      clearToken(); promptSignIn();
      throw new Error("Your session expired or is not authorized. Please sign in again.");
    }
    throw new Error(out.error);
  }
  return out;
}
