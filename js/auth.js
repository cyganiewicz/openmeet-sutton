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
export async function postSecure(action, payload) {
  const token = token(); // existing function
  if (!token) throw new Error("Not signed in");

  const r = await fetch(WEBAPP_URL, {
    method: "POST",
    // Use text/plain so the browser does not preflight with OPTIONS
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, id_token: token, ...payload }),
  });

  const text = await r.text(); // Apps Script returns text
  let out;
  try { out = JSON.parse(text); } catch { throw new Error("Bad JSON from server: " + text.slice(0,200)); }
  if (out && out.error) throw new Error(out.error);
  return out;
}
