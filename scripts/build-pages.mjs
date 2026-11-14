import{securityPolicy}from'../dist/security-policy.js';
import{resolvePagesApi}from'./pages-api.mjs';
import{cpSync,mkdirSync,writeFileSync,readFileSync}from'node:fs';
const api=new URL(await resolvePagesApi());const basePath=process.env.PAGES_BASE_PATH||'/Yasno/';
mkdirSync('work/pages',{recursive:true});cpSync('dist','work/pages',{recursive:true});writeFileSync('work/pages/config.js','window.YASNA_API_BASE='+JSON.stringify(api.origin)+';\nwindow.YASNA_APP_PATH='+JSON.stringify(basePath)+';\n');writeFileSync('work/pages/.nojekyll','');
const html=readFileSync('work/pages/index.html','utf8').replace('</head>',`<meta http-equiv="Content-Security-Policy" content="${securityPolicy({apiOrigin:api.origin})}"/></head>`);writeFileSync('work/pages/index.html',html);console.log('GitHub Pages application built in work/pages');
