/* OpenMeet auth.js — v3.0.1 (stable)
   Exports:
     - WEBAPP_URL
     - initGoogle()
     - getIdToken(force?)
     - peekIdToken()         // fast read without prompting
     - signOut()
   Also exposes window.OpenMeetAuth for fallback.
*/

// ⛳ Replace with your deployed Apps Script Web App URL ending in /exec
export const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzz1vfALij7VdOOhI_gI2ZnCsHydglOsG1kXIG6Yp2sXWdpqScVwxwm-YBg5-6DeOrz/exec';

// Must match CFG.OAUTH_AUDIENCE in Code.gs
const CLIENT_ID = '1053304257177-3lm950qstcn6cvb1omjnqbj3dqlv1o08.apps.googleusercontent.com';

// Storage keys
const LS_TOKEN = 'openmeet_idt';
const LS_EXP   = 'openmeet_idt_exp';
const SS_TOKEN = 'openmeet_idt_ss';
const SS_EXP   = 'openmeet_idt_exp_ss';

let _initDone = false;
let _pendingResolve = null;

function loadScript(src){
  return new Promise((res, rej)=>{
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s=document.createElement('script'); s.src=src; s.async=true; s.defer=true;
    s.onload=res; s.onerror=()=>rej(new Error('Failed to load '+src));
    document.head.appendChild(s);
  });
}

function parseJwt(t){
  try{
    const b64=t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    const s=atob(b64).split('').map(c=>'%' + ('00'+c.charCodeAt(0).toString(16)).slice(-2)).join('');
    return JSON.parse(decodeURIComponent(s));
  }catch{ return null; }
}

function getCached(){
  // Prefer sessionStorage for same-tab navigations
  let tok=sessionStorage.getItem(SS_TOKEN), exp=Number(sessionStorage.getItem(SS_EXP)||0);
  if (!tok){
    tok=localStorage.getItem(LS_TOKEN);
    exp=Number(localStorage.getItem(LS_EXP)||0);
  }
  return {tok, exp};
}
function isValid(exp){
  const now=Math.floor(Date.now()/1000);
  return exp && (exp - now) > 60; // >60s left
}
function saveToken(idt){
  const p=parseJwt(idt)||{};
  const exp=Number(p.exp||0);
  localStorage.setItem(LS_TOKEN, idt);
  localStorage.setItem(LS_EXP, String(exp));
  sessionStorage.setItem(SS_TOKEN, idt);
  sessionStorage.setItem(SS_EXP, String(exp));
}
function clearToken(){
  localStorage.removeItem(LS_TOKEN); localStorage.removeItem(LS_EXP);
  sessionStorage.removeItem(SS_TOKEN); sessionStorage.removeItem(SS_EXP);
}

export async function initGoogle(){
  if (_initDone) return;
  await loadScript('https://accounts.google.com/gsi/client');
  if (!window.google || !google.accounts?.id) throw new Error('GIS failed to load');

  window.__openmeet_onCredential = (resp)=>{
    try{
      const idt=resp && resp.credential;
      if (!idt) throw new Error('No credential');
      saveToken(idt);
      if (_pendingResolve){ _pendingResolve(idt); _pendingResolve=null; }
    }catch(e){
      console.error(e); clearToken();
      if (_pendingResolve){ _pendingResolve(Promise.reject(e)); _pendingResolve=null; }
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

/** Fast read without prompting (returns null if missing/expired) */
export function peekIdToken(){
  const {tok, exp} = getCached();
  return isValid(exp) ? tok : null;
}

/** Get a valid ID token. If missing/expired, shows the GIS prompt (unless force=false). */
export async function getIdToken(force=false){
  if (!_initDone) await initGoogle();

  const {tok, exp} = getCached();
  if (!force && isValid(exp)) return tok;

  return new Promise((resolve, reject)=>{
    _pendingResolve = resolve;
    try{
      google.accounts.id.prompt(note=>{
        if (note.isNotDisplayed() || note.isSkippedMoment()){
          _pendingResolve=null; reject(new Error('Sign-in needed'));
        }
      });
    }catch(e){ _pendingResolve=null; reject(e); }
  });
}

export function signOut(){
  try{ google.accounts.id.disableAutoSelect(); }catch{}
  clearToken();
}

if (typeof window!=='undefined'){
  window.OpenMeetAuth = { WEBAPP_URL, initGoogle, getIdToken, peekIdToken, signOut };
}
