import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { startServer } from "./http-fixture.js";
const nativeFetch = globalThis.fetch,
  settle = () => new Promise((r) => setTimeout(r, 30));
async function waitFor(selector) {
  for (let i = 0; i < 100; i++) {
    if (document.querySelector(selector)) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  assert.fail("UI did not render: " + selector);
}
async function boot(app, { hash = "", cookie: initial = "" } = {}) {
  const { document, window } = parseHTML(
    '<html><body><div id="app"></div><div id="modal-root"></div><div id="toast"></div></body></html>',
  );
  globalThis.document = document;
  globalThis.window = window;
  window.location = { hash, origin: app.origin, pathname: "/", search: "" };
  window.history = {
    replaceState() {
      window.location.hash = "";
    },
  };
  window.scrollTo = () => {};
  let cookie = initial;
  globalThis.localStorage = {
    getItem() {
      throw Error("No local records");
    },
    setItem() {
      throw Error("No local records");
    },
  };
  globalThis.fetch = async (path, options = {}) => {
    const headers = new Headers(options.headers || {});
    if (cookie) headers.set("Cookie", cookie);
    if (options.method === "POST") headers.set("Origin", app.origin);
    const r = await nativeFetch(app.origin + path, { ...options, headers });
    const set = r.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    return r;
  };
  globalThis.FormData = class {
    constructor(form) {
      this.rows = [...form.querySelectorAll("input,select,textarea")]
        .filter(
          (e) =>
            e.name && (!["checkbox", "radio"].includes(e.type) || e.checked),
        )
        .map((e) => [
          e.name,
          e.localName === "select"
            ? ((
                e.querySelector("option[selected]") || e.querySelector("option")
              )?.value ?? "")
            : (e.value ?? ""),
        ]);
    }
    *[Symbol.iterator]() {
      yield* this.rows;
    }
  };
  await import("../dist/app.js?test=" + Math.random());
  await waitFor("#app > *");
  return {
    get cookie() {
      return cookie;
    },
  };
}
const click = (s) => {
  const el = document.querySelector(s);
  assert.ok(el, s);
  assert.equal(typeof el.onclick, "function", s);
  return el.onclick({target:el,currentTarget:el,preventDefault(){}});
};
function fill(form, values) {
  for (const [k, v] of Object.entries(values)) {
    const el = form.querySelector(`[name="${k}"]`);
    assert.ok(el, k);
    el.value = String(v);
  }
}
async function submit(form, values) {
  fill(form, values);
  await form.onsubmit({ target: form, preventDefault() {} });
  await settle();
}

test("master-only login, shareable family link management, parent link entry and immediate revocation work through UI", async () => {
  const app = await startServer();
  try {
    let ctx = await boot(app);
    assert.match(
      document.querySelector("#app").textContent,
      /Вход для мастера/,
    );
    await submit(document.querySelector("#login-form"), {
      username: "master",
      password: app.password,
    });
    assert.ok(document.querySelector('[data-page="clients"]'));
    const masterCookie = ctx.cookie;
    click('[data-page="clients"]');
    click('[data-action="addchild"]');
    await submit(document.querySelector("#dialog-form"), {
      name: "Ребёнок семьи",
      age: 8,
      parent: "Родитель семьи",
      phone: "+7 900 000 00 00",
    });
    const state = await (
        await app.api("/api/state", { cookie: masterCookie })
      ).json(),
      child = state.children[0];
    click(`[data-child="${child.id}"]`);
    document.querySelector("#parent-access").click();
    await waitFor("#parent-link-form");
    assert.ok(document.querySelector("#parent-link-form"));
    assert.equal(document.querySelector("[name=password]"), null);
    await submit(document.querySelector("#parent-link-form"), {
      label: "Мама",
      expiresDays: 365,
    });
    const input = document.querySelector("[data-parent-url]");
    assert.ok(input);
    const url = input.value,
      id = input.dataset.parentUrl;
    assert.ok(url.includes("/#parent="));
    assert.ok(document.querySelector(`[data-revoke-parent="${id}"]`));
    click("#close-modal");
    ctx = await boot(app, { hash: new URL(url).hash });
    assert.equal(window.location.hash, "");
    assert.ok(!document.querySelector('[data-page="clients"]'));
    assert.match(document.querySelector("#app").textContent, /Родитель семьи/);
    assert.equal(document.querySelector("#login-form"), null);
    const parentCookie = ctx.cookie;
    assert.equal(
      (
        await app.api("/api/parent-links?family=" + child.family, {
          cookie: parentCookie,
        })
      ).status,
      403,
    );
    click('[data-action="notifications"]');
    assert.ok(document.querySelector("[data-read-notification]"));
    const revoked = await app.api("/api/parent-links/" + id + "/revoke", {
      cookie: masterCookie,
      body: {},
    });
    assert.equal(revoked.status, 200);
    await click("[data-read-notification]");
    assert.match(
      document.querySelector("#app").textContent,
      /Не удалось открыть кабинет/,
    );
    assert.ok(
      !document.querySelector("#app").textContent.includes("Родитель семьи"),
    );
    await boot(app, { hash: new URL(url).hash });
    assert.match(
      document.querySelector("#app").textContent,
      /Ссылка недействительна/,
    );
    assert.equal(document.querySelector(".sidebar"), null);
  } finally {
    await app.stop();
  }
});

test('master manages parents and child archive, moves/cancels classes and imports a CSV through the UI',async()=>{
 const app=await startServer();try{const masterCookie=await app.login();await boot(app,{cookie:masterCookie});click('[data-page="clients"]');click('[data-action="addparent"]');await submit(document.querySelector('#dialog-form'),{name:'Анна Проверка',phone:'+79001234567',email:'anna@example.test'});let s=await(await app.api('/api/state',{cookie:masterCookie})).json();assert.equal(s.parents.length,1);const family=s.parents[0].family;
 click('[data-action="addchild"]');let form=document.querySelector('#dialog-form');form.querySelector(`[name=family] option[value="${family}"]`).setAttribute('selected','');await submit(form,{name:'Маша Проверка',age:8});s=await(await app.api('/api/state',{cookie:masterCookie})).json();assert.equal(s.children[0].family,family);const child=s.children[0].id;click(`[data-child="${child}"]`);click(`[data-archivechild="${child}"]`);await click('#archive-confirm');await settle();assert.equal(document.querySelector(`[data-child="${child}"]`),null);click('[data-clienttab="archive"]');click(`[data-child="${child}"]`);await click(`[data-restorechild="${child}"]`);await settle();assert.equal(document.querySelector('#modal-root').textContent,'');click('[data-clienttab="children"]');assert.ok(document.querySelector(`[data-child="${child}"]`));
 s=await(await app.api('/api/state',{cookie:masterCookie})).json();const create=await app.api('/api/action',{cookie:masterCookie,body:{revision:s.revision,action:{type:'lesson',title:'Тест расписания',date:'2030-01-20',time:'12:00',duration:90,lessonType:'group',capacity:6}}});assert.equal(create.status,200);s=await create.json();const lesson=s.lessons[0].id;await boot(app,{cookie:masterCookie});click('[data-page="schedule"]');let calendar=document.querySelector('#calendar-date');calendar.value='2030-01-20';calendar.dispatchEvent(new window.Event('change'));click(`[data-movelesson="${lesson}"]`);await submit(document.querySelector('#dialog-form'),{date:'2030-01-21',time:'13:00',duration:75,reason:'Новое время'});s=await(await app.api('/api/state',{cookie:masterCookie})).json();assert.equal(s.lessons[0].date,'2030-01-21');click(`[data-cancellesson="${lesson}"]`);await submit(document.querySelector('#dialog-form'),{reason:'Отмена для проверки'});s=await(await app.api('/api/state',{cookie:masterCookie})).json();assert.equal(s.lessons[0].status,'cancelled');
 click('[data-page="clients"]');click('[data-action="importdata"]');const csv='ID;ФИО;Возраст;Родитель;Телефон;Остаток\nmy1;Петя Импорт;9;Мама Импорт;+79002345678;3';await document.querySelector('#import-file').onchange({target:{files:[{name:'clients.csv',size:csv.length,arrayBuffer:async()=>new TextEncoder().encode(csv).buffer}]}});click('#import-validate');assert.ok(document.querySelector('#import-confirm'));assert.equal((await(await app.api('/api/state',{cookie:masterCookie})).json()).children.length,1);document.querySelector('#import-confirm').click();await waitFor('[data-child]');for(let i=0;i<30&&document.querySelector('#import-confirm');i++)await settle();s=await(await app.api('/api/state',{cookie:masterCookie})).json();assert.equal(s.children.length,2);assert.equal(s.children.find(c=>c.name==='Петя Импорт').balance,3);
 }finally{await app.stop()}
});

test('master sets lesson price, manual amounts calculate credits and advance, and test history can be hidden and restored',async()=>{
 const app=await startServer({fixture:true});try{
  const cookie=await app.login();await boot(app,{cookie});click('[data-page="settings"]');const settings=document.querySelector('#settings-form');fill(settings,{lessonPrice:1500});settings.dispatchEvent(new window.Event('submit',{cancelable:true}));await settle();await settle();let state=await(await app.api('/api/state',{cookie})).json();assert.equal(state.settings.lessonPrice,1500);assert.equal(state.settings.price,state.settings.credits*1500);
  click('[data-page="payments"]');click('[data-action="addpayment"]');click('#legacy-payment-mode');let form=document.querySelector('#dialog-form');const chosen=form.querySelector('[name=child] option').value;const before=state.children.find(c=>c.id===chosen).balance;fill(form,{credits:1});form.querySelector('[name=credits]').dispatchEvent(new window.Event('input'));assert.equal(form.querySelector('[name=amount]').value,'1500.00');fill(form,{amount:3500});form.querySelector('[name=amount]').dispatchEvent(new window.Event('input'));assert.equal(form.querySelector('[name=credits]').value,'2');assert.match(document.querySelector('#manual-payment-quote').textContent,/500/);await submit(form,{});state=await(await app.api('/api/state',{cookie})).json();assert.equal(state.children.find(c=>c.id===chosen).balance,before+2);assert.equal(state.children.find(c=>c.id===chosen).advanceMinor,50000);
  const{DatabaseSync}=await import('node:sqlite');const{join}=await import('node:path');const db=new DatabaseSync(join(app.dir,'yasna.sqlite'));for(const[id,test,status]of [['ui-test-order',true,'succeeded'],['ui-error-order',false,'canceled']]){const o={id,test,status,child:chosen,family:state.children.find(c=>c.id===chosen).family,amountMinor:10000,credits:0,created:Date.now(),...(status==='canceled'?{failure:{message:'Прошлая ошибка'}}:{})};db.prepare('INSERT INTO yasna_payment_orders(id,provider_id,active_key,status,created,json) VALUES (?,NULL,NULL,?,?,?)').run(id,status,o.created,JSON.stringify(o))}db.close();
  await boot(app,{cookie});click('[data-page="payments"]');await settle();assert.ok(document.querySelector('[data-online-order="ui-test-order"]'));await click('[data-payment-history="hide"]');assert.equal(document.querySelector('[data-online-order="ui-test-order"]'),null);assert.equal(document.querySelector('[data-online-order="ui-error-order"]'),null);await click('[data-payment-history="restore"]');assert.ok(document.querySelector('[data-online-order="ui-test-order"]'));state=await(await app.api('/api/state',{cookie})).json();assert.equal(state.children.find(c=>c.id===chosen).advanceMinor,50000);
 }finally{await app.stop()}
});

test('new registration immediately books a free place, starts its own parent cabinet and offers pay now or later',async()=>{const app=await startServer();try{const cookie=await app.login();let state=await(await app.api('/api/state',{cookie})).json();let r=await app.api('/api/action',{cookie,body:{revision:state.revision,action:{type:'settings',...state.settings,privacyDocumentUrl:'https://workshop.example.ru/privacy.pdf'}}});state=await r.json();r=await app.api('/api/action',{cookie,body:{revision:state.revision,action:{type:'lesson',title:'Новая группа',lessonType:'group',date:'2099-12-01',time:'12:00',duration:90,capacity:1,age:'7–10'}}});state=await r.json();await boot(app);await click('#login-intake');await waitFor('#intake-form');const form=document.querySelector('#intake-form');fill(form,{childName:'Миша Запись',age:8,parentName:'Родитель Запись',phone:'+79001112233',email:'parent@example.test'});form.querySelector('[name=consent]').checked=true;for(const option of form.querySelector('[name=lesson]').querySelectorAll('option')){option.removeAttribute('selected');if(option.value===state.lessons[0].id)option.setAttribute('selected','')}assert.ok(form.querySelector('a[href="https://workshop.example.ru/privacy.pdf"]'));await form.onsubmit({target:form,preventDefault(){}});await waitFor('#intake-pay-now');assert.match(document.body.textContent,/Ребёнок записан/);assert.ok(document.querySelector('#intake-pay-later'));assert.match(document.querySelector('#new-parent-link').value,/#parent=[a-zA-Z0-9_-]{43}$/);state=await(await app.api('/api/state',{cookie})).json();assert.equal(state.bookings.length,1);assert.equal(state.children.length,1);assert.equal(state.applications[0].status,'confirmed');await click('#intake-pay-later');await settle();assert.match(document.body.textContent,/Миша/);assert.equal((await app.api('/api/parent-links/'+state.applications[0].id+'/revoke',{cookie,body:{}})).status,200);assert.equal((await app.api('/api/public/enroll',{body:{registrationKey:state.applications[0].registrationKey}})).status,403)}finally{await app.stop()}});
