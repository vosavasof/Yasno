import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';

test('mobile cards preserve controls and navigation hides closed menu from keyboard users', async()=>{
 const {document,window}=parseHTML(`<html><body><button class="mobile-menu" data-action="menu"></button><button class="nav-backdrop" hidden></button><aside class="sidebar"><button class="nav-close"></button><a href="#schedule" tabindex="2">Занятия</a></aside><div class="table-wrap"><table><thead><tr><th>Ребёнок</th><th>Остаток</th><th></th></tr></thead><tbody><tr><td>Маша</td><td>4 занятия</td><td><button id="edit">Изменить</button></td></tr></tbody></table></div></body></html>`);
 globalThis.document=document;globalThis.window=window;window.matchMedia=()=>({matches:true});
 const {enhanceTables,setNavigation,toggleNavigation}=await import('../dist/mobile-ui.js?test');
 const control=document.querySelector('#edit');let clicked=0;control.onclick=()=>clicked++;
 enhanceTables();enhanceTables();
 assert.equal(document.querySelectorAll('.mobile-cell-label').length,2);
 assert.equal(document.querySelectorAll('.mobile-cell-content').length,3);
 assert.equal(document.querySelector('td:nth-child(2) .mobile-cell-label').textContent,'Остаток');
 assert.equal(document.querySelector('.table-cell-actions button'),control);control.click();assert.equal(clicked,1);
 assert.equal(document.querySelector('th').getAttribute('scope'),'col');
 setNavigation(false);
 assert.equal(document.querySelector('.sidebar').getAttribute('aria-hidden'),'true');
 assert.ok(document.querySelector('.sidebar').hasAttribute('inert'));
 assert.equal(document.querySelector('.sidebar a').getAttribute('tabindex'),'-1');
 toggleNavigation();
 assert.equal(document.querySelector('[data-action="menu"]').getAttribute('aria-expanded'),'true');
 assert.equal(document.querySelector('.nav-backdrop').hidden,false);
 assert.equal(document.querySelector('.sidebar a').getAttribute('tabindex'),'2');
 const escape=new window.Event('keydown');escape.key='Escape';document.dispatchEvent(escape);
 assert.equal(document.querySelector('[data-action="menu"]').getAttribute('aria-expanded'),'false');
 assert.equal(document.querySelector('.nav-backdrop').hidden,true);
});
