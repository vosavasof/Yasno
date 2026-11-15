import{test}from'node:test';
import assert from'node:assert/strict';
import{parseHTML}from'linkedom';
import{initTheme,applyTheme,toggleTheme,themeSwitch}from'../dist/theme.js';
test('theme choice persists, every switch stays accessible and entered form data survives',()=>{
 const{document}=parseHTML('<html><head><meta name="theme-color"></head><body><input value="Анна"></body></html>');globalThis.document=document;
 const values=new Map([['yasna-theme','dark']]);globalThis.localStorage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 assert.equal(initTheme(),'dark');
 document.body.insertAdjacentHTML('beforeend',themeSwitch({id:'first'})+themeSwitch({id:'second'}));
 assert.equal(document.querySelector('#first').getAttribute('aria-checked'),'true');
 toggleTheme();for(const b of document.querySelectorAll('[data-theme-switch]'))assert.equal(b.getAttribute('aria-checked'),'false');
 assert.equal(values.get('yasna-theme'),'light');assert.equal(document.querySelector('input').value,'Анна');assert.equal(document.querySelector('meta').content,'#f6f7f8');
 applyTheme('dark');assert.equal(document.querySelector('#second').getAttribute('aria-checked'),'true');
 globalThis.localStorage={getItem(){throw Error('unavailable')},setItem(){throw Error('unavailable')}};assert.equal(initTheme(),'light');assert.equal(toggleTheme(),'dark');
});
