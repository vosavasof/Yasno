import{test}from'node:test';import assert from'node:assert/strict';
const storage=()=>{const map=new Map();return{map,getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}};
test('parent sessions survive a cold launch, shared clients use the same login, master sessions stay temporary and revocation clears access',async()=>{
 const local=storage();let session=storage(),role='parent',status=200;globalThis.localStorage=local;globalThis.sessionStorage=session;globalThis.YASNA_API_BASE='https://api.pwa.test';globalThis.YASNA_BACKEND_CONFIGURED=true;
 const token='a'.repeat(43),master='b'.repeat(43),seen=[];
 globalThis.fetch=async(url,options)=>{seen.push(new Headers(options.headers).get('Authorization'));if(url.endsWith('/api/parent-entry'))return Response.json({role:'parent',authToken:token});if(url.endsWith('/api/login'))return Response.json({role:'master',authToken:master});return Response.json({role},{status})};
 const first=await import('../dist/api-client.js?cold-first');await first.apiFetch('/api/parent-entry',{method:'POST'});assert.equal(first.preferredAccessRole(),'parent');assert.equal(local.map.get('yasna-parent-session:https://api.pwa.test').includes(token),true);
 session=storage();globalThis.sessionStorage=session;const cold=await import('../dist/api-client.js?cold-second');await cold.apiFetch('/api/state');assert.equal(seen.at(-1),'Bearer '+token);
 status=401;await cold.apiFetch('/api/state');assert.equal(local.map.has('yasna-parent-session:https://api.pwa.test'),false);assert.equal(cold.preferredAccessRole(),'parent');status=200;
 await first.apiFetch('/api/parent-entry',{method:'POST'});await cold.apiFetch('/api/logout',{method:'POST'});await first.apiFetch('/api/state');assert.equal(seen.at(-1),null,'Logout clears the other client too');
 await first.apiFetch('/api/login',{method:'POST'});assert.equal(first.preferredAccessRole(),'master');assert.equal(local.map.has('yasna-parent-session:https://api.pwa.test'),false);globalThis.sessionStorage=storage();const masterCold=await import('../dist/api-client.js?cold-master');await masterCold.apiFetch('/api/state');assert.equal(seen.at(-1),null,'Master login is never persisted across a cold launch');
 local.setItem('yasna-parent-session:https://api.pwa.test',JSON.stringify({token,expires:Date.now()-1}));await masterCold.apiFetch('/api/state');assert.equal(seen.at(-1),null,'Expired local access is discarded');
});
