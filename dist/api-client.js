// Shared authentication for the browser tab and the installed application.
const base=(globalThis.YASNA_API_BASE||'').replace(/\/$/,'');
const key='yasna-session:'+base,parentKey='yasna-parent-session:'+base,roleKey='yasna-access-role:'+base;
let token='';
function rememberedParent(){try{const value=JSON.parse(localStorage.getItem(parentKey)||'null');if(value&&/^(?:[a-zA-Z0-9_-]{43}|[a-f0-9]{64})$/.test(value.token)&&value.expires>Date.now())return value.token;localStorage.removeItem(parentKey)}catch{}return''}
function accessToken(){try{token=sessionStorage.getItem(key)||rememberedParent()}catch{token=rememberedParent()||token}return token}
export function preferredAccessRole(){try{return localStorage.getItem(roleKey)||''}catch{return''}}
function rememberRole(role){try{localStorage.setItem(roleKey,role);if(role==='master')localStorage.removeItem(parentKey);else if(role==='parent'&&token)localStorage.setItem(parentKey,JSON.stringify({token,expires:Date.now()+7*86400000}))}catch{}}
export function clearAccess(){token='';try{sessionStorage.removeItem(key)}catch{}try{localStorage.removeItem(parentKey)}catch{}}
export async function apiFetch(path,options={}){
 if(globalThis.YASNA_BACKEND_CONFIGURED===false)throw Error('Общий сервер ещё не подключён. Запись и кабинеты будут доступны после подключения сервера.');
 const headers=new Headers(options.headers||{}),sentToken=accessToken();if(sentToken)headers.set('Authorization','Bearer '+sentToken);
 const response=await fetch(base+path,{...options,headers});
 if(response.status===401&&path!=='/api/login'&&accessToken()===sentToken)clearAccess();
 if(['/api/login','/api/parent-entry','/api/auth/setup','/api/public/enroll','/api/session'].includes(path)&&response.ok){const copy=await response.clone().json();if(copy.authToken){token=copy.authToken;try{sessionStorage.setItem(key,token)}catch{}}if(copy.role)rememberRole(copy.role);else if(path==='/api/session'&&copy.role===null)clearAccess()}
 if(path==='/api/logout'&&response.ok)clearAccess();return response
}
