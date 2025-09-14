// OpenMeet topnav.js — renders a consistent Google Sign-In widget at the top
// Requires: ./js/auth.js (v3.0.1+) and the <div id="topnav"> container on the page.

import * as Auth from './auth.js?v=3.0.1';

function parseEmail(idToken){
  try{
    const payload = JSON.parse(atob(idToken.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
    return payload.email || null;
  }catch{ return null; }
}

function renderSignedOut(container){
  container.innerHTML = `
    <div class="bar">
      <div class="brand">OpenMeet</div>
      <div id="googleBtn"></div>
    </div>
  `;
  google.accounts.id.renderButton(
    container.querySelector('#googleBtn'),
    { theme: 'outline', size: 'medium', shape: 'pill', text: 'signin_with' }
  );
  // One-tap prompt (non-blocking)
  google.accounts.id.prompt(() => {});
}

function renderSignedIn(container, email){
  container.innerHTML = `
    <div class="bar">
      <div class="brand">OpenMeet</div>
      <div class="signed">
        <span class="muted">Signed in as</span>
        <strong>${email}</strong>
        <button class="btn btn-ghost" id="signout">Sign out</button>
      </div>
    </div>
  `;
  container.querySelector('#signout').onclick = () => { Auth.signOut(); location.reload(); };
}

export async function mountTopnav() {
  await Auth.initGoogle();
  const top = document.getElementById('topnav');
  if (!top) return;

  // Basic styles (scoped-ish)
  top.innerHTML = `
    <style>
      #topnav .bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border-bottom:1px solid #e5e7eb;background:#ffffff;position:sticky;top:0;z-index:10}
      #topnav .brand{font-weight:800}
      #topnav .muted{opacity:.8;margin-right:6px}
      #topnav .btn{padding:6px 10px;border-radius:999px;border:1px solid #cbd5e1;background:#fff}
      #topnav .btn-ghost{background:transparent}
    </style>
    <div class="bar"><div class="brand">OpenMeet</div><div id="googleBtn"></div></div>
  `;

  const cached = Auth.peekIdToken();
  if (cached){
    const email = parseEmail(cached) || 'Google user';
    renderSignedIn(top, email);
    return;
  }

  // Prepare GIS callback so the button works immediately on click
  window.__openmeet_onCredential = (resp)=>{
    try{
      const idt = resp && resp.credential;
      if (idt){
        // auth.js already saves the token (it registered this same callback)
        const email = parseEmail(idt) || 'Google user';
        renderSignedIn(top, email);
      }
    }catch(e){ console.error(e); }
  };

  renderSignedOut(top);
}
