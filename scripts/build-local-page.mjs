import{mkdirSync,rmSync,copyFileSync,writeFileSync}from'node:fs';
rmSync('work/pages',{recursive:true,force:true});mkdirSync('work/pages',{recursive:true});
for(const[src,dest]of [['local/download.html','index.html'],['local/download.css','download.css'],['dist/yasna-logo-light.webp','yasna-logo-light.webp'],['dist/favicon.svg','favicon.svg']])copyFileSync(src,'work/pages/'+dest);
writeFileSync('work/pages/config.js',"window.YASNA_API_BASE='';\nwindow.YASNA_APP_PATH='/';\n");writeFileSync('work/pages/.nojekyll','');console.log('Local macOS download page built without any API connection');
