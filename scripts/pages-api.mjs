// Deployment addresses belong to environment configuration, not application code.
export function validateApiAddress(value){let url;try{url=new URL(value)}catch{throw Error('Задайте корректный HTTPS-адрес в YASNA_API_BASE')}if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('YASNA_API_BASE должен содержать только HTTPS-домен API без паролей, путей и параметров');return url.origin}
export function readPreviousApi(config){const match=config.match(/window\.YASNA_API_BASE\s*=\s*("(?:[^"\\]|\\.)*")\s*;/);if(!match)throw Error('Не удалось прочитать адрес прежнего API. Задайте YASNA_API_BASE в настройках репозитория.');return validateApiAddress(JSON.parse(match[1]))}
export async function resolvePagesApi({configured=process.env.YASNA_API_BASE,repository=process.env.GITHUB_REPOSITORY,fetcher=fetch}={}){
 if(configured?.trim())return validateApiAddress(configured.trim());
 if(!repository||!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository))throw Error('Для локальной сборки задайте YASNA_API_BASE. На VPS используется конфигурация того же домена без сборки Pages.');
 const[owner,name]=repository.split('/'),root=name.toLowerCase()===owner.toLowerCase()+'.github.io'?'':name+'/';
 let r;try{r=await fetcher('https://'+owner.toLowerCase()+'.github.io/'+root+'config.js',{headers:{Accept:'text/javascript','Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)})}catch{throw Error('Прежняя конфигурация недоступна. Задайте YASNA_API_BASE в настройках репозитория.')}
 if(!r.ok)throw Error('Для первой публикации задайте YASNA_API_BASE в настройках репозитория.');
 const config=await r.text();if(config.length>8192)throw Error('Прежняя конфигурация имеет неверный размер');return readPreviousApi(config);
}
