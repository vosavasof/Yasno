// Explicit overrides win; later builds keep the already connected public API.
export function validateApiAddress(value){let url;try{url=new URL(value)}catch{throw Error('Задайте корректный HTTPS-адрес в YASNA_SHARED_API_BASE')}if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('YASNA_SHARED_API_BASE должен содержать только HTTPS-домен API без паролей, путей и параметров');return url.origin}
export function readPreviousApi(config){const match=config.match(/window\.YASNA_API_BASE\s*=\s*("(?:[^"\\]|\\.)*")\s*;/);if(!match)throw Error('Не удалось прочитать адрес API');return validateApiAddress(JSON.parse(match[1]))}
export async function resolvePagesApi({configured=process.env.YASNA_SHARED_API_BASE||process.env.YASNA_API_BASE,repository=process.env.GITHUB_REPOSITORY,fetcher=fetch}={}){
 if(configured?.trim())return validateApiAddress(configured.trim());
 if(!repository||!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository))return null;
 const[owner,name]=repository.split('/'),path=name.toLowerCase()===owner.toLowerCase()+'.github.io'?'':name+'/';
 try{const r=await fetcher('https://'+owner.toLowerCase()+'.github.io/'+path+'config.js',{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)});if(!r.ok)return null;const text=await r.text();if(text.length>8192)return null;return readPreviousApi(text)}catch{return null}
}
