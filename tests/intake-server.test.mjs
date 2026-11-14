import { test } from "node:test";
import assert from "node:assert/strict";
import { startServer, cookieFrom } from "./http-fixture.js";
test("primary intake requires no login and no access is issued before master contact and confirmation", async () => {
  const app = await startServer();
  try {
    const input = {
      childName: "Новый ребёнок",
      age: 8,
      parentName: "Новый родитель",
      phone: "+7 900 000 00 01",
      email: "parent@example.test",
      contactMethod: "phone",
      lessonType: "group",
      consent: true,
    };
    const response = await app.api("/api/public/applications", { body: input });
    assert.equal(response.status, 201);
    assert.equal(response.headers.get("set-cookie"), null);
    const request = await response.json();
    assert.equal((await app.api("/api/public/applications")).status, 401);
    const cookie = await app.login();
    let s = await (await app.api("/api/state", { cookie })).json();
    assert.equal(s.children.length, 0);
    assert.equal(s.applications[0].status, "pending");
    assert.equal(
      (
        await app.api("/api/action", {
          cookie,
          body: {
            revision: s.revision,
            action: { type: "application_confirm", application: request.id },
          },
        })
      ).status,
      400,
    );
    s = await (
      await app.api("/api/action", {
        cookie,
        body: {
          revision: s.revision,
          action: {
            type: "application_status",
            application: request.id,
            status: "contacted",
          },
        },
      })
    ).json();
    s = await (
      await app.api("/api/action", {
        cookie,
        body: {
          revision: s.revision,
          action: {
            type: "application_confirm",
            application: request.id,
            lesson: "",
          },
        },
      })
    ).json();
    assert.equal(s.children.length, 1);
    const family = s.children[0].family;
    let r = await app.api("/api/parent-links?family=" + family, { cookie });
    assert.deepEqual((await r.json()).links, []);
    r = await app.api("/api/parent-links", {
      cookie,
      body: { family, label: "Мама", expiresDays: 365 },
    });
    assert.equal(r.status, 201);
    const link = (await r.json()).link,
      entry = await app.api("/api/parent-entry", {
        body: { token: new URL(link.url).hash.slice(8) },
      });
    assert.equal(entry.status, 200);
    const parentCookie = cookieFrom(entry),
      own = await (
        await app.api("/api/state", { cookie: parentCookie })
      ).json();
    assert.equal(own.children.length, 1);
    assert.equal(own.children[0].name, "Новый ребёнок");
    assert.deepEqual(own.applications, []);
  } finally {
    await app.stop();
  }
});
