import{apiFetch}from'./api-client.js?v=pwaaccess1';
async function request(path,body){const r=await apiFetch('/api/push/'+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),v=await r.json();if(!r.ok)throw Error(v.error||'Не удалось выполнить запрос push');return v}
export async function enablePush(){
 if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))throw Error('На iPhone откройте HTTPS-сайт в Safari → Поделиться → На экран «Домой», затем запустите его с экрана «Домой» (iOS 16.4 или новее).');
 const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Разрешите уведомления в настройках этого приложения на iPhone');const config=await request('config');if(!config.available)throw Error(config.reason||'Push доступен только на общем HTTPS-сайте');
 const workerUrl=new URL('./sw.js',window.location.href||window.location.origin+window.location.pathname);if(globalThis.YASNA_API_BASE)workerUrl.searchParams.set('api',globalThis.YASNA_API_BASE);const worker=await navigator.serviceWorker.register(workerUrl.href,{scope:'./'}),key=Uint8Array.from(atob(config.publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));await navigator.serviceWorker.ready;const subscription=await worker.pushManager.getSubscription()||await worker.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});await request('subscribe',{subscription:subscription.toJSON()});return'Подписка сохранена. Отправьте проверочное уведомление.';
}
export const testPush=()=>request('test',{});
export const pushStatus=id=>request('tests/'+id);
