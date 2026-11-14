import { test } from "node:test";
import assert from "node:assert/strict";
import { startServer, cookieFrom } from "./http-fixture.js";
test("master password login, empty production, CSRF, persistence, conflicts and public intake", async () => {
  const app = await startServer();
  try {
    assert.equal((await app.api("/api/state")).status, 401);
    const cookie = await app.login();
    assert.match(cookie, /yasna_session=/);
    let s = await (await app.api("/api/state", { cookie })).json();
    assert.equal(s.children.length, 0);
    assert.equal(s.lessons.length, 0);
    assert.equal((await app.api("/api/health")).status, 200);
    assert.equal(
      (await (await app.api("/api/session", { cookie })).json()).authMode,
      "password",
    );
    let r = await app.api("/api/action", {
      cookie,
      body: {
        revision: s.revision,
        action: {
          type: "child",
          name: "Ребёнок",
          age: 8,
          parent: "Родитель",
          phone: "+7 900 000 00 00",
        },
      },
      headers: { Origin: "https://untrusted.invalid" },
    });
    assert.equal(r.status, 403);
    r = await app.api("/api/action", {
      cookie,
      body: {
        revision: s.revision,
        action: {
          type: "child",
          name: "Ребёнок",
          age: 8,
          parent: "Родитель",
          phone: "+7 900 000 00 00",
        },
      },
    });
    s = await r.json();
    assert.equal(s.children.length, 1);
    assert.equal(
      (
        await app.api("/api/action", {
          cookie,
          body: {
            revision: 0,
            action: {
              type: "child",
              name: "Неверная ревизия",
              age: 8,
              parent: "Родитель",
            },
          },
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await app.api("/api/parent-account", {
          cookie,
          body: {
            username: "parent",
            password: app.password,
            family: s.children[0].family,
          },
        })
      ).status,
      410,
    );
    assert.equal(
      (await app.api("/api/logout", { cookie, method: "POST" })).status,
      200,
    );
    assert.equal((await app.api("/api/state", { cookie })).status, 401);
    assert.equal((await app.api("/../../server.mjs")).status, 404);
    const html = await (await app.api("/")).text();
  } finally {
    await app.stop();
  }
});
