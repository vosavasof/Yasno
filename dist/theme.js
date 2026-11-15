const key='yasna-theme';
export function currentTheme(){return document.documentElement.dataset.theme==='dark'?'dark':'light'}
const label=dark=>dark?'Включить светлую тему':'Включить тёмную тему';
export function themeSwitch({id,action}={}){
 const dark=currentTheme()==='dark';
 return `<button type="button" class="theme-toggle" data-theme-switch${id?` id="${id}"`:''}${action?` data-action="${action}"`:''} role="switch" aria-checked="${dark}" aria-label="Тёмная тема" title="${label(dark)}"><span class="theme-track" aria-hidden="true"><span class="theme-thumb"></span><svg class="theme-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg><svg class="theme-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M20 14a8.5 8.5 0 0 1-10-10 8.5 8.5 0 1 0 10 10Z"/></svg></span></button>`
}
export function applyTheme(theme){
 const value=theme==='dark'?'dark':'light',dark=value==='dark';
 document.documentElement.dataset.theme=value;
 document.documentElement.style.colorScheme=value;
 document.querySelectorAll('[data-theme-switch]').forEach(button=>{button.setAttribute('aria-checked',String(dark));button.setAttribute('title',label(dark))});
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#111214':'#f6f7f8');
 try{localStorage.setItem(key,value)}catch{}
 return value
}
export function toggleTheme(){return applyTheme(currentTheme()==='dark'?'light':'dark')}
export function initTheme(){let value='light';try{value=localStorage.getItem(key)||'light'}catch{}return applyTheme(value)}
