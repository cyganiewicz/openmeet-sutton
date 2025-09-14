// Use on pages that require Google Sign-In.
// Keep this tag in the HTML page head:
// <script src="https://accounts.google.com/gsi/client" async defer></script>

export const GOOGLE_CLIENT_ID =
  "1053304257177-3lm950qstcn6cvb1omjnqbj3dqlv1o08.apps.googleusercontent.com";

// IMPORTANT: must be your Apps Script *exec* URL (not /dev)
export const WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbzz1vfALij7VdOOhI_gI2ZnCsHydglOsG1kXIG6Yp2sXWdpqScVwxwm-YBg5-6DeOrz/exec";

// ---- Lightweight logger to help debug in DevTools ----
function log(...args) { try { console.log("[OpenMeet]", ...args); } catch {} }

// ---- Token persistence (works across refreshes) ----
let idToken = null;
const KEY = "om_id_token";

export function getToken() {
  return idToken || localStorage.getItem(KEY) || null;
}
export function setToken(tok) {
  idToken = tok || null;
  if (tok) localStorage.setItem(KEY, tok);
  else localStorage.removeItem(KEY);
}
export function clearToken() {
  setToken(null);
}

// ---- Wait for the GIS script to be ready (resilient) ----
export function waitForGIS(maxMs = 6000, intervalMs = 50) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function tick() {
      if (window.google?.accounts?.id) {
        log("GIS ready");
        resolve(window.google.accounts.id);
        return;
      }
      if (Date.now() - start >= maxMs) {
        reject(new Error("Google Identity Services failed to load."));
        return;
      }
      setTimeout(tick, intervalMs);
    })();
  });
}

// ---- Optional: ask GIS to show one-tap if eligible ----
export function promptSignIn() {
  try { window.google?.accounts?.id?.prompt?.(); } catch {}
}

// ---- Render Sign-In button. Also autostart if token is already present. ----
export async function renderSignIn(buttonId, onSignedIn) {
  const saved = getToken();
  if (saved) {
    // We have a token from a prior session — start immediately.
    try { if (typeof onSignedIn === "function") onSignedIn(); } catch {}
  }

  let gis;
  try {
    gis = await waitForGIS();
  } catch (e) {
    // Fallback: show a basic button that reattempts initialization
    const el = document.getElementById(buttonId);
    if (el) {
      el.innerHTML = "";
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = "Sign in with Google";
      btn.onclick = async () => {
        try {
          // Try again to init GIS, then render officially
          gis = await waitForGIS(4000);
          initAndRender(gis, buttonId, onSignedIn);
        } catch (err) {
          alert("Google Sign-In could not initialize. Please reload the page.");
        }
      };
      el.appendChild(btn);
    }
    return;
  }

  initAndRender(gis, buttonId, onSignedIn);
}

function initAndRender(gis, buttonId, onSignedIn) {
  try {
    gis.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (resp) => {
        if (resp?.credential) {
          setToken(resp.credential);
          if (typeof onSignedIn === "function") onSignedIn();
        } else {
          log("GIS callback received no credential");
        }
      },
    });
    const el = document.getElementById(buttonId);
    if (el) {
      el.innerHTML = "";
      gis.renderButton(el, { theme: "outline", size: "large" });
    }
    // Also try one-tap (won't always show)
    promptSignIn();
  } catch (e) {
    log("initAndRender error", e);
  }
}

// ---- Secure POST helper (no preflight; auto token recovery) ----
export async function postSecure(action, payload) {
  let tok = getToken();
  if (!tok) {
    promptSignIn();
    throw new Error("Not signed in.");
  }

  const r = await fetch(WEBAPP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // avoid CORS preflight
    body: JSON.stringify({ action, id_token: tok, ...payload }),
  });

  const text = await r.text();
  let out;
  try { out = JSON.parse(text); }
  catch { throw new Error("Bad JSON from server: " + text.slice(0, 200)); }

  if (out && out.error) {
    // Token-related errors → clear and ask to sign again
    if (/Invalid id_token|Missing id_token|Mismatched audience|Staff\/Clerk Google account required/i.test(out.error)) {
      clearToken();
      promptSignIn();
      throw new Error("Your session expired or is not authorized. Please sign in again.");
    }
    throw new Error(out.error);
  }
  return out;
}
