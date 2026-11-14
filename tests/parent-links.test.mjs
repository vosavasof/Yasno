import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { startServer, cookieFrom } from "./http-fixture.js";
const token = (url) => new URL(url).hash.slice(8);
test("family links isolate data, only master manages links, passwords cannot log in parents, and revocation closes existing sessions", async () => {
  const app = await startServer({ fixture: true });
  try {
    const master = await app.login();
    let r = await app.api("/api/parent-links", {
      cookie: master,
      body: { family: "f1", label: "Мама", expiresDays: 365 },
    });
    assert.equal(r.status, 201);
    const a = (await r.json()).link;
    assert.equal(token(a.url).length, 43);
    assert.ok(a.url.startsWith(app.origin + "/#parent="));
    assert.equal((await app.api("/api/parent-links?family=f1")).status, 401);
    assert.equal(
      (
        await app.api("/api/parent-links", {
          cookie: master,
          body: { family: "missing", expiresDays: 365 },
        })
      ).status,
      400,
    );
    const entry = await app.api("/api/parent-entry", {
      body: { token: token(a.url) },
    });
    assert.equal(entry.status, 200);
    const parent = cookieFrom(entry),
      session = await entry.json();
    assert.equal(session.role, "parent");
    assert.equal(session.authMode, "link");
    const own = await (await app.api("/api/state", { cookie: parent })).json();
    assert.deepEqual(
      own.children.map((c) => c.id),
      ["c1", "c2"],
    );
    assert.deepEqual(own.applications, []);
    assert.ok(own.payments.every((p) => p.child === "c2"));
    assert.equal(
      (await app.api("/api/parent-links?family=f1", { cookie: parent })).status,
      403,
    );
    assert.equal(
      (
        await app.api("/api/parent-links", {
          cookie: parent,
          body: { family: "f2", expiresDays: 365 },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await app.api("/api/login", {
          body: { username: session.username, password: app.password },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await app.api("/api/action", {
          cookie: parent,
          body: {
            revision: own.revision,
            action: { type: "book", child: "c3", lesson: "l5" },
          },
        })
      ).status,
      400,
    );
    r = await app.api("/api/parent-links", {
      cookie: master,
      body: { family: "f2", label: "Другая семья", expiresDays: 90 },
    });
    const b = (await r.json()).link,
      second = await app.api("/api/parent-entry", {
        body: { token: token(b.url) },
      }),
      secondCookie = cookieFrom(second);
    assert.equal(
      (await (await app.api("/api/state", { cookie: secondCookie })).json())
        .children.length,
      1,
    );
    assert.equal(
      (
        await app.api("/api/parent-links/" + a.id + "/revoke", {
          cookie: parent,
          body: {},
        })
      ).status,
      403,
    );
    r = await app.api("/api/parent-links/" + a.id + "/revoke", {
      cookie: master,
      body: {},
    });
    assert.equal(r.status, 200);
    assert.equal((await app.api("/api/state", { cookie: parent })).status, 401);
    assert.equal(
      (await app.api("/api/parent-entry", { body: { token: token(a.url) } }))
        .status,
      401,
    );
    assert.equal(
      (await app.api("/api/state", { cookie: secondCookie })).status,
      200,
    );
    const rows = await (
      await app.api("/api/parent-links?family=f1", { cookie: master })
    ).json();
    assert.equal(rows.links[0].status, "revoked");
    assert.equal(rows.links[0].url, null);
    const db = new DatabaseSync(join(app.dir, "yasna.sqlite"));
    const raw = db.prepare("SELECT * FROM parent_links WHERE id=?").get(a.id);
    assert.notEqual(raw.token_hash, token(a.url));
    assert.equal(raw.token_hash.length, 64);
    assert.ok(!JSON.stringify(raw).includes(token(a.url)));
    db.close();
    assert.equal(readFileSync(join(app.dir, "parent-links.key")).length, 32);
  } finally {
    await app.stop();
  }
});

test("rotating and expiring links invalidates old URLs and sessions; master can retrieve the same active URL later", async () => {
  const app = await startServer({ fixture: true });
  try {
    const master = await app.login();
    let r = await app.api("/api/parent-links", {
        cookie: master,
        body: { family: "f1", label: "Родитель", expiresDays: 30 },
      }),
      first = (await r.json()).link;
    let entry = await app.api("/api/parent-entry", {
        body: { token: token(first.url) },
      }),
      oldCookie = cookieFrom(entry);
    r = await app.api("/api/parent-links/" + first.id + "/rotate", {
      cookie: master,
      body: {},
    });
    assert.equal(r.status, 200);
    const next = (await r.json()).link;
    assert.notEqual(next.url, first.url);
    assert.equal(
      (await app.api("/api/state", { cookie: oldCookie })).status,
      401,
    );
    assert.equal(
      (
        await app.api("/api/parent-entry", {
          body: { token: token(first.url) },
        })
      ).status,
      401,
    );
    entry = await app.api("/api/parent-entry", {
      body: { token: token(next.url) },
    });
    assert.equal(entry.status, 200);
    const active = cookieFrom(entry);
    let list = await (
      await app.api("/api/parent-links?family=f1", { cookie: master })
    ).json();
    assert.equal(list.links.find((l) => l.id === next.id).url, next.url);
    const db = new DatabaseSync(join(app.dir, "yasna.sqlite"));
    db.prepare("UPDATE parent_links SET expires=? WHERE id=?").run(
      Date.now() - 1,
      next.id,
    );
    db.close();
    assert.equal((await app.api("/api/state", { cookie: active })).status, 401);
    assert.equal(
      (await app.api("/api/parent-entry", { body: { token: token(next.url) } }))
        .status,
      401,
    );
    list = await (
      await app.api("/api/parent-links?family=f1", { cookie: master })
    ).json();
    assert.equal(list.links.find((l) => l.id === next.id).status, "expired");
    assert.equal(list.links.find((l) => l.id === next.id).url, null);
  } finally {
    await app.stop();
  }
});

test("full backup contains consistent SQLite and link key while cookie defaults can be secured", async () => {
  const app = await startServer({ fixture: true, secure: true });
  try {
    const login = await app.api("/api/login", {
      body: { username: "master", password: app.password },
    });
    assert.match(login.headers.get("set-cookie"), /HttpOnly/);
    assert.match(login.headers.get("set-cookie"), /SameSite=Strict/);
    assert.match(login.headers.get("set-cookie"), /Secure/);
    const result = spawnSync(process.execPath, ["scripts/backup.mjs"], {
      env: app.env,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    const dirs = readdirSync(join(app.dir, "backups")).filter((n) =>
      n.startsWith("full-"),
    );
    assert.equal(dirs.length, 1);
    const base = join(app.dir, "backups", dirs[0]);
    assert.equal(readFileSync(join(base, "parent-links.key")).length, 32);
    const snapshot = new DatabaseSync(join(base, "yasna.sqlite"), {
      readOnly: true,
    });
    assert.equal(
      Object.values(snapshot.prepare("PRAGMA integrity_check").get())[0],
      "ok",
    );
    assert.equal(snapshot.prepare("SELECT count(*) n FROM users").get().n, 1);
    snapshot.close();
  } finally {
    await app.stop();
  }
});

test("link secret and parent access survive application restart and master can copy the same token again", async () => {
  let app = await startServer({ fixture: true }),
    dir = app.dir;
  try {
    const master = await app.login();
    const link = (
      await (
        await app.api("/api/parent-links", {
          cookie: master,
          body: { family: "f1", expiresDays: 365 },
        })
      ).json()
    ).link;
    await app.stop({ remove: false });
    app = await startServer({ dir });
    const list = await (
      await app.api("/api/parent-links?family=f1", { cookie: master })
    ).json();
    assert.equal(token(list.links[0].url), token(link.url));
    const parent = await app.api("/api/parent-entry", {
      body: { token: token(link.url) },
    });
    assert.equal(parent.status, 200);
    const family = await (
      await app.api("/api/state", { cookie: cookieFrom(parent) })
    ).json();
    assert.equal(family.children.length, 2);
  } finally {
    await app.stop({ remove: false });
    rmSync(dir, { recursive: true, force: true });
  }
});
