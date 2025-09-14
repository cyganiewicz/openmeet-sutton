/* OpenMeet auth.js — GIS (ID token) helper — v3
   Exports:
     - WEBAPP_URL
     - initGoogle()
     - getIdToken(force?)
     - signOut()
   Also exposes window.OpenMeetAuth for sanity checks/fallbacks.
*/

// ⛳ TODO: replace with your deployed Apps Script Web App URL ending in /exec
export const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzz1vfALij7VdOOhI_gI2ZnCsHydglOsG1kXIG6Yp2sXWdpqScVwxwm-YBg5-6DeOrz/exec';

// Must match CFG.OAUTH_AUDIENCE in Code.gs (OAuth Client ID)
const CLIENT_ID = '1053304257177-3lm950qstcn6cvb1omjnqbj3dqlv1o08.apps.googleusercontent.com';

// Simple version so we can bust caches from HTML imports
export const AUTH_JS_VERSION = '3.0.0';

const LS_TOKEN = 'openmeet_idt';
const LS_EXP   = 'openmeet_idt_exp'; // unix seconds

let _initDone = false;
let _pendingResolve = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src; s.async = true; s.defer = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load '+src));
    document.head.appendChild(s);
  });
}

function parseJwt(t){
  try{
    const b64 = t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    const s = atob(b64).split('').map(c=>'%' + ('00'+c.charCodeAt(0).toString(16)).slice(-2)).join('');
    return JSON.parse(decodeURIComponent(s));
  }catch{ return null; }
}
function isTokenValid(){
  const tok = localStorage.getItem(LS_TOKEN);
  const exp = Number(localStorage.getItem(LS_EXP)||0);
  if(!tok || !exp) return false;
  const now = Math.floor(Date.now()/1000);
  return (exp - now) > 60; // > 60s left
}
function saveToken(idt){
  const p = parseJwt(idt) || {};
  localStorage.setItem(LS_TOKEN, idt);
  if (p && p.exp) localStorage.setItem(LS_EXP, String(p.exp));
}
function clearToken(){
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_EXP);
}

/** Initialize Google Identity Services */
export async function initGoogle(){
  if (_initDone) return;
  await loadScript('https://accounts.google.com/gsi/client');
  if (!window.google || !google.accounts || !google.accounts.id) throw new Error('GIS failed to load');

  // One callback for the prompt
  window.__openmeet_onCredential = (resp)=>{
    try{
      const idt = resp && resp.credential;
      if (!idt) throw new Error('No credential');
      saveToken(idt);
      if (_pendingResolve){ _pendingResolve(idt); _pendingResolve = null; }
    }catch(e){
      console.error(e);
      clearToken();
      if (_pendingResolve){ _pendingResolve(Promise.reject(e)); _pendingResolve = null; }
    }
  };

  google.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: window.__openmeet_onCredential,
    auto_select: false,
    cancel_on_tap_outside: true,
    use_fedcm_for_prompt: true
  });

  _initDone = true;
}

/** Get a valid ID token (cached or prompt) */
export async function getIdToken(force=false){
  if (!_initDone) await initGoogle();

  if (!force && isTokenValid()){
    return localStorage.getItem(LS_TOKEN);
  }

  return new Promise((resolve, reject)=>{
    _pendingResolve = resolve;
    try{
      google.accounts.id.prompt((note)=>{
        if (note.isNotDisplayed() || note.isSkippedMoment()){
          _pendingResolve = null;
          reject(new Error('Sign-in needed'));
        }
      });
    }catch(e){
      _pendingResolve = null;
      reject(e);
    }
  });
}

export function signOut(){
  try{ google.accounts.id.disableAutoSelect(); }catch{}
  clearToken();
}

// Window fallback (useful if ESM import gets weirdly cached)
if (typeof window !== 'undefined'){
  window.OpenMeetAuth = { WEBAPP_URL, initGoogle, getIdToken, signOut, AUTH_JS_VERSION };
}
