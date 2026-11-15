import assert from'node:assert/strict';
import{readFileSync,readdirSync,existsSync}from'node:fs';
import{resolve,sep}from'node:path';
import{parseHTML}from'linkedom';
import{build}from'esbuild';
import{securityPolicy}from'../dist/security-policy.js';
const root=resolve('dist'),origin='https://workshop.invalid',files=new Set();
function asset(ref){
 if(ref.startsWith('data:'))return;
 const url=new URL(ref,origin+'/');assert.equal(url.origin,origin,'External asset: '+ref);
 const path=resolve(root,'.'+decodeURIComponent(url.pathname));assert.ok(path.startsWith(root+sep),'Asset path escapes dist');assert.ok(existsSync(path),'Missing asset: '+ref);files.add(path);
}
const{document}=parseHTML(readFileSync('dist/index.html','utf8'));
for(const node of document.querySelectorAll('script[src],link[href],img[src]'))asset(node.getAttribute('src')||node.getAttribute('href'));
for(const file of readdirSync(root).filter(f=>f.endsWith('.css'))){const source=readFileSync(resolve(root,file),'utf8');for(const match of source.matchAll(/url\(\s*['"]?([^'"\)]+)['"]?\s*\)/g))asset(match[1]);assert.ok(!/@import\s/i.test(source),'Review CSS imports: '+file)}
const graph=await build({entryPoints:['dist/app.js','dist/config.js','dist/yookassa-sdk.js'],bundle:true,write:false,metafile:true,outdir:'work/asset-audit',platform:'browser',format:'esm',logLevel:'silent'});
for(const path of Object.keys(graph.metafile.inputs))assert.ok(resolve(path).startsWith(root+sep),'Non-local module: '+path);
for(const output of Object.values(graph.metafile.outputs))for(const dependency of output.imports)assert.ok(!dependency.external,'External module: '+dependency.path);
for(const policy of [securityPolicy(),securityPolicy({apiOrigin:'https://api.example.ru',preventEmbedding:true})])assert.equal(policy.split(';').map(x=>x.trim()).find(x=>x.startsWith('script-src')),"script-src 'self'");
console.log(`Asset audit passed: ${files.size} HTML/CSS assets and ${Object.keys(graph.metafile.inputs).length} JavaScript inputs are local. API and payment-page connections remain separate.`);
