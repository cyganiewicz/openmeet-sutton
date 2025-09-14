/* OpenMeet auth.js — GIS (ID token) helper
 *
 * Exports:
 *   - WEBAPP_URL           → your Apps Script Web App endpoint (ends with /exec)
 *   - initGoogle()         → load Google Identity Services & prep sign-in
 *   - getIdToken(force)    → returns a Promise<string> Google ID token (JWT)
 *
 * This uses Google Identity Services "google.accounts.id" to obtain an ID token.
 * We cache it in localStorage so a page refresh still "remembers" you're signed in
 * until the token is near expiry.
 */

// TODO: ⬇️  Replace with your deployed Apps Script Web App URL (must be /exec)
export const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzz1vfALij7VdOOhI_gI2ZnCsHydglOsG1kXIG6Yp2sXWdpqScVwxwm-YBg5-6DeOrz/exec';

// Your OAuth 2.0 Client ID must match CFG.OAUTH_AUDIENCE in Code.gs
const CLIENT_ID = '1053304257177-3lm950qstcn6cvb1omjnqbj3dqlv1o08.apps.googleusercontent.com';

// Storage keys
const LS_TOKEN = 'openmeet_idt';
const LS_EXP   = 'openmeet_idt_exp'; // unix seconds

let _gisLoaded = false;
let _initDone  = false;
let _pendingResolver = null; // when waiting for a credential from the callback

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function isValidCached() {
  const t = localStorage.getItem(LS_TOKEN);
  const exp = Number(localStorage.getItem(LS_EXP) || 0);
  if (!t || !exp) return false;
  const now = Math.floor(Date.now() / 1000);
  // refresh if less than 60s remaining
  return (exp - now) > 60;
}

function saveToken(idt) {
  const payload = parseJwt(idt) || {};
  const exp = Number(payload.exp || 0);
  localStorage.setItem(LS_TOKEN, idt);
  localStorage.setItem(LS_EXP, String(exp));
}

function clearToken() {
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_EXP);
}

/**
 * Initialize Google Identity Services and prep a credential callback.
 * Call once near app startup.
 */
export async function initGoogle() {
  if (_initDone) return;
  await loadScript('https://accounts.google.com/gsi/client');
  _gisLoaded = true;

  // Set up the one callback we’ll use for prompted sign-in
  window.__openmeet_onCredential = (resp) => {
    try {
      const idt = resp && resp.credential;
      if (idt) {
        saveToken(idt);
        if (_pendingResolver) { _pendingResolver(idt); _pendingResolver = null; }
      } else {
        // No credential returned; clear cache
        clearToken();
        if (_pendingResolver) { _pendingResolver(Promise.reject(new Error('No credential'))); _pendingResolver = null; }
      }
    } catch (e) {
      console.error(e);
      clearToken();
      if (_pendingResolver) { _pendingResolver(Promise.reject(e)); _pendingResolver = null; }
    }
  };

  // Initialize GIS. We won't render a button here; we just prompt when needed.
  // You can still render a button elsewhere using google.accounts.id.renderButton().
  // NOTE: use_fedcm_for_prompt improves UX in modern browsers.
  // The callback will fire with a JWT (id_token) when the user completes sign-in.
  if (window.google && google.accounts && google.accounts.id) {
    google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: window.__openmeet_onCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: true
    });
  } else {
    throw new Error('Google Identity Services failed to load.');
  }

  _initDone = true;
}

/**
 * Get a valid Google ID token (JWT).
 * - If we have a non-expired cached token, returns it immediately.
 * - Otherwise triggers the GIS prompt flow and resolves when the user signs in.
 *
 * @param {boolean} force  Set true to ignore cache and force a fresh prompt.
 * @returns {Promise<string>} id_token
 */
export async function getIdToken(force = false) {
  if (!_initDone) await initGoogle();

  if (!force && isValidCached()) {
    return localStorage.getItem(LS_TOKEN);
  }

  // Prompt the user; resolve once our credential callback fires.
  return new Promise((resolve, reject) => {
    _pendingResolver = resolve;
    try {
      google.accounts.id.prompt((notification) => {
        // If the user closes the dialog or there’s an error, reject gracefully.
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          _pendingResolver = null;
          reject(new Error('Sign-in needed'));
        }
      });
    } catch (e) {
      _pendingResolver = null;
      reject(e);
    }
  });
}

/** Optional helper you can call from a Sign out button */
export function signOut() {
  try { google.accounts.id.disableAutoSelect(); } catch {}
  clearToken();
}
