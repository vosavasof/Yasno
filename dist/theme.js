const key='yasna-theme';
export function currentTheme(){return document.documentElement.dataset.theme||'light'}
export function applyTheme(theme){const value=theme==='dark'?'dark':'light';document.documentElement.dataset.theme=value;document.documentElement.style.colorScheme=value;try{localStorage.setItem(key,value)}catch{};return value}
export function toggleTheme(){return applyTheme(currentTheme()==='dark'?'light':'dark')}
export function initTheme(){let value='light';try{value=localStorage.getItem(key)||'light'}catch{}return applyTheme(value)}
