// Default: same-origin VPS. GitHub Pages injects the public API address in config.js.
const base=(globalThis.YASNA_API_BASE||'').replace(/\/$/,'');
const key='yasna-session:'+base;
let token='';try{token=sessionStorage.getItem(key)||''}catch{}
export function clearAccess(){token='';try{sessionStorage.removeItem(key)}catch{}}
export async function apiFetch(path,options={}){if(globalThis.YASNA_BACKEND_CONFIGURED===false)throw Error("Общий сервер ещё не подключён. Запись и кабинеты будут доступны после подключения сервера.");const headers=new Headers(options.headers||{});if(token)headers.set('Authorization','Bearer '+token);const response=await fetch(base+path,{...options,headers});if(response.status===401&&path!=='/api/login')clearAccess();if(['/api/login','/api/parent-entry','/api/auth/setup','/api/public/enroll'].includes(path)&&response.ok){const copy=await response.clone().json();if(copy.authToken){token=copy.authToken;try{sessionStorage.setItem(key,token)}catch{}}}if(path==='/api/logout'&&response.ok)clearAccess();return response}
