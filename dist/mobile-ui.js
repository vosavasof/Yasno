// Shared desktop/mobile markup: readable card labels without losing table semantics.
export function enhanceTables(scope=document){
 if(!scope)return;
 for(const table of scope.querySelectorAll('.table-wrap table')){
  table.classList.add('responsive-table');table.closest('.table-wrap')?.classList.add('mobile-table-wrap');table.setAttribute('role','table');
  const headers=Array.from(table.querySelectorAll('thead th')).map(th=>{th.setAttribute('scope','col');th.setAttribute('role','columnheader');const label=th.textContent.trim();if(!label)th.setAttribute('aria-label','Действия');return label});
  for(const group of table.querySelectorAll('thead,tbody'))group.setAttribute('role','rowgroup');
  for(const row of table.querySelectorAll('tr'))row.setAttribute('role','row');
  for(const row of table.querySelectorAll('tbody > tr'))Array.from(row.children).forEach((cell,i)=>{
   cell.setAttribute('role','cell');if(cell.dataset.mobileReady)return;cell.dataset.mobileReady='true';
   const content=document.createElement('div');content.className='mobile-cell-content';while(cell.firstChild)content.append(cell.firstChild);
   if(headers[i]){const label=document.createElement('span');label.className='mobile-cell-label';label.setAttribute('aria-hidden','true');label.textContent=headers[i];cell.append(label)}else cell.classList.add('table-cell-actions');
   cell.append(content);
  });
 }
}
const smallScreen=()=>window.matchMedia?.('(max-width: 760px)').matches??false;
export function closeNavigation(focus=false){setNavigation(false,focus)}
export function toggleNavigation(){setNavigation(!document.body.classList.contains('nav-open'),true)}
export function setNavigation(open,focus=false){
 const sidebar=document.querySelector('.sidebar'),backdrop=document.querySelector('.nav-backdrop');document.body.classList.toggle('nav-open',open);sidebar?.classList.toggle('open',open);if(backdrop)backdrop.hidden=!open;
 if(sidebar){if(smallScreen()&&!open){sidebar.setAttribute('inert','');sidebar.setAttribute('aria-hidden','true');sidebar.querySelectorAll('button,a[href]').forEach(el=>{if(!Object.hasOwn(el.dataset,'navTabindex'))el.dataset.navTabindex=el.getAttribute('tabindex')??'';el.setAttribute('tabindex','-1')})}else{sidebar.removeAttribute('inert');sidebar.removeAttribute('aria-hidden');sidebar.querySelectorAll('[data-nav-tabindex]').forEach(el=>{if(el.dataset.navTabindex)el.setAttribute('tabindex',el.dataset.navTabindex);else el.removeAttribute('tabindex');delete el.dataset.navTabindex})}}
 document.querySelectorAll('[data-action="menu"]').forEach(b=>b.setAttribute('aria-expanded',String(open)));
 if(focus){if(open)sidebar?.querySelector('.nav-close')?.focus();else document.querySelector('.mobile-menu')?.focus()}
}
document.addEventListener('keydown',e=>{if(!document.body.classList.contains('nav-open')||document.querySelector('.modal'))return;if(e.key==='Escape'){e.preventDefault();closeNavigation(true)}if(e.key==='Tab'){const items=Array.from(document.querySelectorAll('.sidebar button,.sidebar a[href]')).filter(x=>!x.disabled&&!x.hidden);if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1)?.focus()}else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0]?.focus()}}});
window.addEventListener?.('resize',()=>{if(!smallScreen())closeNavigation(false)});
