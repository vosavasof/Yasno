import{test}from'node:test';
import assert from'node:assert/strict';
import{parseHTML}from'linkedom';
import{readFileSync}from'node:fs';
import{execFileSync}from'node:child_process';
import{CHECKOUT_SCRIPTS,securityPolicy}from'../dist/security-policy.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function setup(){const{window,document}=parseHTML('<html><head></head><body></body></html>');globalThis.window=window;globalThis.document=document;delete window.YooMoneyCheckoutWidget;return{document,...await import('../dist/payment-widget.js?test='+crypto.randomUUID())}}
test('SDK redirects and fallback are allowed by the shared production policy and Pages build',()=>{
 const policies=[securityPolicy(),securityPolicy({preventEmbedding:true})];
 execFileSync(process.execPath,['scripts/build-pages.mjs'],{env:{...process.env,YASNA_API_BASE:'https://api.example.ru'}});
 policies.push(readFileSync('work/pages/index.html','utf8').match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1]);
 for(const policy of policies){const scripts=policy.split(';').find(x=>x.trim().startsWith('script-src')).trim().split(/\s+/);for(const src of CHECKOUT_SCRIPTS)assert.ok(scripts.includes(src),src);assert.ok(!scripts.includes("'unsafe-inline'"));assert.ok(!scripts.includes('*'))}
 assert.match(policies[2],/connect-src[^;]+https:\/\/api.example.ru/);
});
test('simultaneous callers share the SDK request and use the CDN after the official URL fails',async()=>{
 const{document,loadCheckoutWidget}=await setup();const first=loadCheckoutWidget();assert.equal(loadCheckoutWidget(),first);
 const original=document.head.querySelector('script');assert.equal(original.src,CHECKOUT_SCRIPTS[0]);original.onerror();await tick();
 const fallback=document.head.querySelector('script');assert.equal(original.isConnected,false);assert.equal(fallback.src,CHECKOUT_SCRIPTS[1]);
 class SDK{}window.YooMoneyCheckoutWidget=SDK;fallback.onload();assert.equal(await first,SDK);assert.equal(await loadCheckoutWidget(),SDK);
});
test('failed SDK loads clean up scripts and permit a later retry',async()=>{
 const{document,loadCheckoutWidget}=await setup();const failed=loadCheckoutWidget();const rejection=assert.rejects(failed,/Не удалось загрузить форму/);
 document.head.querySelector('script').onerror();await tick();document.head.querySelector('script').onerror();await rejection;
 assert.equal(document.head.querySelector('script'),null);
 const retry=loadCheckoutWidget();assert.notEqual(retry,failed);class SDK{}window.YooMoneyCheckoutWidget=SDK;document.head.querySelector('script').onload();assert.equal(await retry,SDK);
});
