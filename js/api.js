export const API = 'https://script.google.com/macros/s/AKfycbzz1vfALij7VdOOhI_gI2ZnCsHydglOsG1kXIG6Yp2sXWdpqScVwxwm-YBg5-6DeOrz/exec';

export async function j(u){ const r=await fetch(u,{mode:'cors'}); return r.json(); }
export const listMeetings = (q='') => j(`${API}?route=api/public/meetings${q}`);
export const getMeeting   = (id)   => j(`${API}?route=api/public/meeting&id=${encodeURIComponent(id)}`);
export const listFiles    = (id,all=false)=> j(`${API}?route=api/public/files&meeting_id=${encodeURIComponent(id)}${all?'&all=1':''}`);
