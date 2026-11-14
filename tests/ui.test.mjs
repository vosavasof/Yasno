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
  return el.onclick();
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
    assert.ok(!document.querySelector("#app").textContent.includes("ChatGPT"));
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
