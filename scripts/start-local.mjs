import{spawn}from'node:child_process';
import{existsSync,mkdirSync}from'node:fs';
import{homedir}from'node:os';
import{resolve,dirname}from'node:path';
import{fileURLToPath}from'node:url';
import{createInterface}from'node:readline/promises';
import{Writable}from'node:stream';
import{DatabaseSync}from'node:sqlite';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const data=resolve(process.env.YASNA_LOCAL_DATA||resolve(homedir(),process.platform==='darwin'?'Library/Application Support/Yasna':'.local/share/Yasna'));
mkdirSync(data,{recursive:true,mode:0o700});
let master=null;
if(existsSync(resolve(data,'yasna.sqlite'))){const db=new DatabaseSync(resolve(data,'yasna.sqlite'),{readOnly:true});try{if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get())master=db.prepare("SELECT username FROM users WHERE role='master'").get()?.username||null}finally{db.close()}}
let password='';
if(!master){
 console.log('Первый запуск «Ясны». Создайте пароль мастера (от 12 до 256 символов).');
 password=process.env.YASNA_LOCAL_PASSWORD||'';
 if(!password){
  if(!process.stdin.isTTY)throw Error('Для первого запуска откройте «Запустить Ясну.command» в Терминале.');
  const silent=new Writable({write(chunk,encoding,done){done()}}),rl=createInterface({input:process.stdin,output:silent,terminal:true});
  try{while(true){process.stdout.write('Новый пароль (ввод скрыт): ');password=await rl.question('');process.stdout.write('\nПовторите пароль: ');const repeat=await rl.question('');process.stdout.write('\n');if(password.length>=12&&password.length<=256&&password===repeat)break;console.log('Пароли должны совпадать и содержать от 12 до 256 символов.')}}finally{rl.close()}
 }
 if(password.length<12||password.length>256)throw Error('Пароль должен содержать от 12 до 256 символов.');
}
console.log('Данные на этом компьютере: '+data+'\nЛогин мастера: '+(master||'master'));
const env={...process.env,DATA_DIR:data,HOST:'127.0.0.1',PORT:'0',YASNA_LOCAL_ONLY:'1',COOKIE_SECURE:'false',TRUST_PROXY:'false'};
for(const key of ['MASTER_PASSWORD','MASTER_LOGIN','PUBLIC_ORIGIN','PUBLIC_APP_URL','YASNA_API_BASE','YASNA_LOCAL_PASSWORD'])delete env[key];
if(!master){env.MASTER_LOGIN='master';env.MASTER_PASSWORD=password}password='';
const child=spawn(process.execPath,[resolve(root,'server.mjs')],{cwd:root,env,stdio:['ignore','pipe','inherit']});let buffer='',opened=false;
child.stdout.on('data',chunk=>{process.stdout.write(chunk);buffer=(buffer+chunk).slice(-8192);const match=buffer.match(/Ясна: (http:\/\/127\.0\.0\.1:\d+)/);if(match&&!opened){opened=true;console.log('Оставьте это окно открытым, пока работаете. Для завершения нажмите Control+C.');if(process.platform==='darwin'&&process.env.YASNA_NO_BROWSER!=='1'){const browser=spawn('open',[match[1]],{stdio:'ignore'});browser.on('error',()=>console.log('Откройте указанный адрес в браузере.'))}}});
child.on('error',error=>{console.error('Не удалось запустить приложение: '+error.message);process.exitCode=1});
child.on('exit',code=>{process.exitCode=code||0});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
