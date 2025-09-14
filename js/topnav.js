// OpenMeet topnav.js — v2 (polished header + GIS button)
// Requires: <script src="https://accounts.google.com/gsi/client" async defer></script> in the <head>
// Requires: <div id="topnav"></div> in the <body> (top of page)
// Requires: ./js/auth.js (v3.0.1+)

import * as Auth from './auth.js?v=3.0.2';

function parseEmail(idToken){
  try{
    const payload = JSON.parse(atob(idToken.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
    return payload.email || null;
  }catch{ return null; }
}

function html(strings, ...vals){ return strings.map((s,i)=>s+(vals[i]??'')).join(''); }

function baseStyles(){
  return html`
    <style id="om-topnav-styles">
      :root{
        --om-bg: #0b1020;
        --om-bg-grad: linear-gradient(135deg, #0b1020 0%, #111b3a 60%, #1a2e5a 100%);
        --om-fg: #ecf0f6;
        --om-muted: rgba(236,240,246,.75);
        --om-border: rgba(255,255,255,.08);
        --om-pill-bg: rgba(255,255,255,.08);
        --om-pill-border: rgba(255,255,255,.14);
        --om-accent: #7dc4ff;
      }
      #topnav{
        position: sticky; top: 0; z-index: 1000;
        background: var(--om-bg-grad);
        color: var(--om-fg);
        box-shadow: 0 6px 18px rgba(0,0,0,.25);
      }
      #topnav .container{
        max-width: 1100px; margin: 0 auto; padding: 12px 16px;
        display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center;
      }
      #topnav .brand{
        display:flex; align-items:center; gap:12px; min-height:40px;
      }
      #topnav .brand .seal{
        width:28px; height:28px; border-radius:8px;
        background: url('./assets/sutton-seal.svg') center/cover, var(--om-pill-bg);
        border: 1px solid var(--om-border);
        box-shadow: inset 0 0 0 1px rgba(255,255,255,.03);
      }
      #topnav .brand .title{
        font-weight: 800; letter-spacing:.2px;
      }
      #topnav .brand .sub{
        margin-left:8px; padding: 3px 8px; border-radius:999px; font-size:12px;
        background: var(--om-pill-bg); border:1px solid var(--om-pill-border); color: var(--om-muted);
      }
      #topnav .right{
        display:flex; align-items:center; gap:10px; min-height:40px;
      }
      #topnav .user{
        display:flex; align-items:center; gap:8px; padding:6px 10px;
        border-radius:999px; border:1px solid var(--om-pill-border); background: var(--om-pill-bg);
      }
      #topnav .user .dot{ width:6px; height:6px; border-radius:50%; background:#38d39f; box-shadow:0 0 0 3px rgba(56,211,159,.2); }
      #topnav .user .email{ font-weight:600; color:var(--om-fg) }
      #topnav .btn-ghost{
        padding:6px 10px; border-radius:999px; border:1px solid var(--om-pill-border);
        background: transparent; color:var(--om-fg); cursor:pointer;
      }
      #topnav .btn-ghost:hover{ border-color: var(--om-accent); box-shadow:0 0 0 2px rgba(125,196,255,.15) inset; }
      /* Space for GIS button */
      #topnav #googleBtn > div{ filter: drop-shadow(0 2px 4px rgba(0,0,0,.25)); }
      @media (max-width:640px){
        #topnav .container{ grid-template-columns: 1fr; gap:8px; }
        #topnav .right{ justify-content:flex-start; }
      }
    </style>
  `;
}

function renderSignedOut(container){
  container.innerHTML = baseStyles() + html`
    <div class="container">
      <div class="brand">
        <div class="seal" aria-hidden="true"></div>
        <div class="title">OpenMeet</div>
        <div class="sub">Town of Sutton</div>
      </div>
      <div class="right">
        <div id="googleBtn" aria-label="Google Sign-In"></div>
      </div>
    </div>
  `;
  // Official GIS button
  google.accounts.id.renderButton(
    container.querySelector('#googleBtn'),
    { theme: 'outline', size: 'large', shape:'pill', text:'signin_with' }
  );
  // One-tap (non-blocking)
  google.accounts.id.prompt(() => {});
}

function renderSignedIn(container, email){
  container.innerHTML = baseStyles() + html`
    <div class="container">
      <div class="brand">
        <div class="seal" aria-hidden="true"></div>
        <div class="title">OpenMeet</div>
        <div class="sub">Town of Sutton</div>
      </div>
      <div class="right">
        <div class="user"><span class="dot"></span><span class="email">${email}</span></div>
        <button class="btn-ghost" id="signout">Sign out</button>
      </div>
    </div>
  `;
  container.querySelector('#signout').onclick = () => { Auth.signOut(); location.reload(); };
}

function parseEmailFrom(token){
  const e = token ? parseEmail(token) : null;
  return e || 'Google user';
}

export async function mountTopnav(){
  await Auth.initGoogle();
  const top = document.getElementById('topnav');
  if (!top) return;

  const cached = Auth.peekIdToken();
  if (cached){
    renderSignedIn(top, parseEmailFrom(cached));
    return;
  }

  // Ensure our callback is available before rendering button
  window.__openmeet_onCredential = (resp)=>{
    try{
      const idt = resp && resp.credential;
      if (idt){
        // auth.js saved token in storage already
        renderSignedIn(top, parseEmailFrom(idt));
      }
    }catch(e){ console.error(e); }
  };

  renderSignedOut(top);
}
