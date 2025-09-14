// topnav.js — v3 (instant render + resilient GIS load)
import * as Auth from './auth.js?v=3.0.2';

const waitForGIS = () =>
  new Promise((resolve) => {
    let tries = 0;
    const tick = () => {
      if (window.google?.accounts?.id) return resolve();
      if (++tries > 200) return resolve(); // give up after ~4s, we can render again later
      setTimeout(tick, 20);
    };
    tick();
  });

const decodeEmail = (tok) => {
  if (!tok) return null;
  try {
    const p = JSON.parse(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return p.email || null;
  } catch { return null; }
};

const styles = `
  <style>
    :root{
      --om-bg: #0b1020;
      --om-bg-grad: linear-gradient(135deg, #0b1020 0%, #111b3a 60%, #1a2e5a 100%);
      --om-fg: #ecf0f6; --om-muted: rgba(236,240,246,.75);
      --om-border: rgba(255,255,255,.08); --om-pill: rgba(255,255,255,.08);
      --om-pill-b: rgba(255,255,255,.14); --om-accent:#7dc4ff;
    }
    #topnav{position:sticky;top:0;z-index:1000;background:var(--om-bg-grad);color:var(--om-fg);box-shadow:0 6px 18px rgba(0,0,0,.25)}
    #topnav .container{max-width:1100px;margin:0 auto;padding:12px 16px;display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center}
    #topnav .brand{display:flex;align-items:center;gap:12px;min-height:40px}
    #topnav .seal{width:28px;height:28px;border-radius:8px;background:url('./assets/sutton-seal.svg') center/cover, var(--om-pill);border:1px solid var(--om-border);box-shadow:inset 0 0 0 1px rgba(255,255,255,.03)}
    #topnav .title{font-weight:800;letter-spacing:.2px}
    #topnav .sub{margin-left:8px;padding:3px 8px;border-radius:999px;font-size:12px;background:var(--om-pill);border:1px solid var(--om-pill-b);color:var(--om-muted)}
    #topnav .right{display:flex;align-items:center;gap:10px;min-height:40px}
    #topnav .user{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;border:1px solid var(--om-pill-b);background:var(--om-pill)}
    #topnav .dot{width:6px;height:6px;border-radius:50%;background:#38d39f;box-shadow:0 0 0 3px rgba(56,211,159,.2)}
    #topnav .btn-ghost{padding:6px 10px;border-radius:999px;border:1px solid var(--om-pill-b);background:transparent;color:var(--om-fg);cursor:pointer}
    #topnav .btn-ghost:hover{border-color:var(--om-accent);box-shadow:0 0 0 2px rgba(125,196,255,.15) inset}
    #topnav #googleBtn > div{filter:drop-shadow(0 2px 4px rgba(0,0,0,.25))}
    @media (max-width:640px){#topnav .container{grid-template-columns:1fr} #topnav .right{justify-content:flex-start}}
  </style>
`;

const shell = (rightHTML) => `
  ${styles}
  <div class="container">
    <div class="brand">
      <div class="seal" aria-hidden="true"></div>
      <div class="title">OpenMeet</div>
      <div class="sub">Town of Sutton</div>
    </div>
    <div class="right">${rightHTML}</div>
  </div>
`;

function renderSignedOut(el){
  el.innerHTML = shell('<div id="googleBtn" aria-label="Google Sign-In"></div>');
  if (window.google?.accounts?.id){
    google.accounts.id.renderButton(
      el.querySelector('#googleBtn'),
      { theme:'outline', size:'large', shape:'pill', text:'signin_with' }
    );
    google.accounts.id.prompt(()=>{});
  }
}

function renderSignedIn(el, email){
  el.innerHTML = shell(`
    <div class="user"><span class="dot"></span><strong>${email}</strong></div>
    <button class="btn-ghost" id="signout">Sign out</button>
  `);
  el.querySelector('#signout').onclick = () => { Auth.signOut(); renderSignedOut(el); };
}

export async function mountTopnav(){
  const el = document.getElementById('topnav');
  if (!el) return;

  // render immediately with current state
  await Auth.initGoogle();
  const cached = Auth.peekIdToken();
  if (cached) renderSignedIn(el, decodeEmail(cached) || 'Google user');
  else renderSignedOut(el);

  // make sure GIS is loaded; if it wasn't, enhance the signed-out state later
  await waitForGIS();

  // Ensure our credential callback updates UI in-place without reloads
  window.__openmeet_onCredential = (resp) => {
    try{
      const idt = resp?.credential;
      if (idt){
        // auth.js stores the token; we just update UI
        renderSignedIn(el, decodeEmail(idt) || 'Google user');
      }
    }catch(e){ console.error(e); }
  };
}
