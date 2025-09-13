// Include <script src="https://accounts.google.com/gsi/client" async defer></script> in admin.html
export const GOOGLE_CLIENT_ID = "1053304257177-3lm950qstcn6cvb1omjnqbj3dqlv1o08.apps.googleusercontent.com";
export const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzz1vfALij7VdOOhI_gI2ZnCsHydglOsG1kXIG6Yp2sXWdpqScVwxwm-YBg5-6DeOrz/exec";

let idToken = null;
export function renderSignIn(buttonId, onSignedIn){
  /* global google */
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (resp) => { idToken = resp.credential; sessionStorage.setItem('om_id_token', idToken); onSignedIn && onSignedIn(); }
  });
  google.accounts.id.renderButton(document.getElementById(buttonId), { theme:"outline", size:"large" });
}
export function token(){ return idToken || sessionStorage.getItem('om_id_token'); }
export async function postSecure(action, payload){
  const r = await fetch(WEBAPP_URL, {method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({action, id_token: token(), ...payload})});
  const out = await r.json(); if(out && out.error) throw new Error(out.error); return out;
}
