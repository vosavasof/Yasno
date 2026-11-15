import{createPush}from'./backend/push.mjs';
import{enrollApplication,publicEnrollment}from'./dist/enrollment.js';
import{securityPolicy}from'./dist/security-policy.js';
import{familyCanEnter}from'./dist/management.js';
import{handlePayments}from'./backend/yookassa.js';
import http from "node:http";
import { DatabaseSync } from "node:sqlite";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  renameSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
  createHmac,
} from "node:crypto";
import {
  emptyState,
  applyAction,
  familyView,
  validateState,
  submitApplication,
  notificationsFor,
} from "./dist/domain.js";
const root = dirname(fileURLToPath(import.meta.url)),
  dir = resolve(process.env.DATA_DIR || resolve(root, "data"));
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = new DatabaseSync(resolve(dir, "yasna.sqlite"));
db.exec(
  "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS state(id INTEGER PRIMARY KEY CHECK(id=1),json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS parent_links(id TEXT PRIMARY KEY,token_hash TEXT NOT NULL UNIQUE,family TEXT NOT NULL,label TEXT NOT NULL,created_at INTEGER NOT NULL,expires INTEGER NOT NULL,last_used INTEGER,revoked INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS users(username TEXT PRIMARY KEY,salt TEXT NOT NULL,hash TEXT NOT NULL,role TEXT NOT NULL,family TEXT); CREATE TABLE IF NOT EXISTS notification_reads(username TEXT PRIMARY KEY,json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,username TEXT NOT NULL REFERENCES users(username),expires INTEGER NOT NULL);",
);
db.exec(readFileSync(resolve(root,'backend/migrations/0002_yookassa.sql'),'utf8').replaceAll('CREATE TABLE ', 'CREATE TABLE IF NOT EXISTS '));
const paymentDB={prepare(sql,args=[]){return{bind(...values){return paymentDB.prepare(sql,values)},async first(){return db.prepare(sql).get(...args)||null},async all(){return{results:db.prepare(sql).all(...args)}},async run(){const r=db.prepare(sql).run(...args);return{meta:{changes:Number(r.changes)}}}}}};
if (!db.prepare("SELECT id FROM state").get()) {
  const initial = emptyState();
  db.prepare("INSERT INTO state VALUES(1,?)").run(JSON.stringify(initial));
}
function getState() {
  return JSON.parse(db.prepare("SELECT json FROM state WHERE id=1").get().json);
}
function addUser(username, password, role, family = null) {
  if (!username || !password || password.length < 12)
    throw Error("Нужны логин и пароль от 12 символов");
  if (!["master", "parent"].includes(role)) throw Error("Неизвестная роль");
  if (role !== "master")
    throw Error("Родительский доступ создаётся ссылкой из кабинета мастера");
  const salt = randomBytes(16).toString("hex"),
    hash = scryptSync(password, salt, 64).toString("hex");
  db.prepare(
    "INSERT INTO users VALUES(?,?,?,?,?) ON CONFLICT(username) DO UPDATE SET salt=excluded.salt,hash=excluded.hash,role=excluded.role,family=excluded.family",
  ).run(username, salt, hash, role, family);
  db.prepare("DELETE FROM sessions WHERE username=?").run(username);
}
if (process.argv[2] === "add-user") {
  addUser(
    process.env.USER_LOGIN,
    process.env.USER_PASSWORD,
    process.env.USER_ROLE || "parent",
    process.env.FAMILY_ID,
  );
  console.log("Учётная запись сохранена");
  process.exit();
}
if (process.argv[2] === "backup") {
  backup(getState());
  console.log("Резервная копия создана");
  process.exit();
}
if (process.argv[2] === "families") {
  console.log(
    JSON.stringify(
      getState().children.map((c) => ({
        name: c.name,
        parent: c.parent,
        family: c.family,
      })),
      null,
      2,
    ),
  );
  process.exit();
}
if (!db.prepare("SELECT username FROM users WHERE role=?").get("master")) {
  if (
    !process.env.MASTER_PASSWORD ||
    process.env.MASTER_PASSWORD.startsWith("replace-with-")
  ) {
    console.error(
      "Первый запуск: задайте MASTER_PASSWORD (от 12 символов) и при необходимости MASTER_LOGIN.",
    );
    process.exit(1);
  }
  addUser(
    process.env.MASTER_LOGIN || "master",
    process.env.MASTER_PASSWORD,
    "master",
  );
}
const keyPath = resolve(dir, "parent-links.key");
let linkKey;
try {
  linkKey = readFileSync(keyPath);
  if (linkKey.length !== 32) throw Error("Неверный размер ключа ссылок");
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  linkKey = randomBytes(32);
  try {
    writeFileSync(keyPath, linkKey, { mode: 0o600, flag: "wx" });
  } catch (err) {
    if (err.code !== "EEXIST") throw err;
    linkKey = readFileSync(keyPath);
  }
}
const hashToken = (t) => createHash("sha256").update(t).digest("hex");
const linkToken = (id) =>
  createHmac("sha256", linkKey).update(id).digest("base64url");
const requestToken=req=>req.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1]||req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('yasna_session='))?.slice(14);
const sessions = (req) => {
  const token=requestToken(req);
  if (!token) return null;
  const actor = db
    .prepare(
      "SELECT u.username,u.role,u.family FROM sessions s JOIN users u ON u.username=s.username WHERE s.token=? AND s.expires>?",
    )
    .get(hashToken(token), Date.now());
  if (!actor) return null;
  if (actor.role === "parent") {
    if (!actor.username.startsWith("parentlink:")) return null;
    const link = db
      .prepare(
        "SELECT * FROM parent_links WHERE id=? AND revoked=0 AND expires>?",
      )
      .get(actor.username.slice(11), Date.now());
    if (
      !link ||
      link.family !== actor.family ||
      !familyCanEnter(getState(),actor.family,link.created_at)
    )
      return null;
  }
  return { ...actor, authMode: actor.role === "master" ? "password" : "link" };
};
function newLink(family, label, days, fixedId=null) {
  if(fixedId){const existing=db.prepare("SELECT * FROM parent_links WHERE id=?").get(fixedId);if(existing){if(existing.family!==family||existing.revoked||existing.expires<=Date.now()||!familyCanEnter(getState(),family,existing.created_at))throw Object.assign(Error("Ссылка отозвана. Обратитесь к мастеру."),{status:403});return existing}}
  if (!familyCanEnter(getState(),family))
    throw Error("Семья не найдена");
  if (!Number.isInteger(days) || days < 1 || days > 3650)
    throw Error("Срок ссылки: от 1 до 3650 дней");
  const id = fixedId||crypto.randomUUID(),
    token = linkToken(id),
    username = "parentlink:" + id,
    created = Math.max(Date.now(),(getState().familyAccessRevokedAt?.[family]||0)+1),
    expires = created + days * 86400000;
  db.prepare(
    "INSERT INTO parent_links(id,token_hash,family,label,created_at,expires,revoked) VALUES(?,?,?,?,?,?,0)",
  ).run(
    id,
    hashToken(token),
    family,
    String(label || "Родитель")
      .trim()
      .slice(0, 100),
    created,
    expires,
  );
  db.prepare("INSERT INTO users VALUES(?,?,?,?,?)").run(
    username,
    randomBytes(16).toString("hex"),
    randomBytes(64).toString("hex"),
    "parent",
    family,
  );
  return db.prepare("SELECT * FROM parent_links WHERE id=?").get(id);
}
function linkView(link, req) {
  const active = !link.revoked && link.expires > Date.now() && familyCanEnter(getState(),link.family,link.created_at),
    token = linkToken(link.id),
    known = hashToken(token) === link.token_hash,
    origin = process.env.PUBLIC_APP_URL || process.env.PUBLIC_ORIGIN || `http://${req.headers.host}`;
  return {
    id: link.id,
    family: link.family,
    label: link.label,
    createdAt: link.created_at,
    expiresAt: link.expires,
    lastUsed: link.last_used,
    status: link.revoked || link.created_at <= (getState().familyAccessRevokedAt?.[link.family]||0)
      ? "revoked"
      : link.expires <= Date.now()
        ? "expired"
        : "active",
    url: active && known ? (()=>{const u=new URL(origin);if(!u.pathname.endsWith('/'))u.pathname+='/';u.hash='parent='+token;u.search='';return u.href})() : null,
  };
}
function revokeLink(id) {
  db.prepare("UPDATE parent_links SET revoked=1 WHERE id=?").run(id);
  db.prepare("DELETE FROM sessions WHERE username=?").run("parentlink:" + id);
}

const limits = new Map();
function limited(req, bucket = "login") {
  const ip =
    process.env.TRUST_PROXY === "true"
      ? req.headers["x-forwarded-for"]?.split(",").at(-1).trim() ||
        req.socket.remoteAddress
      : req.socket.remoteAddress;
  const key = bucket + ":" + ip;
  let l = limits.get(key);
  if (!l || l.until < Date.now()) l = { count: 0, until: Date.now() + 900000 };
  l.count++;
  limits.set(key, l);
  return l.count > 12;
}
setInterval(() => {
  db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
  for (const [k, v] of limits) if (v.until < Date.now()) limits.delete(k);
}, 60000).unref();
const secure = process.env.COOKIE_SECURE !== "false",
  cookie = (token, maxAge = 604800) =>
    `yasna_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
function reply(res, status, data, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    ...headers,
  });
  res.end(JSON.stringify(data));
}
async function body(req, maxSize = 28 * 1024 * 1024) {
  let parts = [],
    size = 0;
  for await (const p of req) {
    size += p.length;
    if (size > maxSize) throw Error("Превышен допустимый размер запроса");
    parts.push(p);
  }
  try {
    return JSON.parse(Buffer.concat(parts));
  } catch {
    throw Error("Некорректный JSON");
  }
}
function backup(state) {
  const backupDir = resolve(dir, "backups");
  mkdirSync(backupDir, { recursive: true, mode: 0o700 });
  const name = `backup-${Date.now()}-${randomBytes(3).toString("hex")}.json`,
    path = resolve(backupDir, name);
  writeFileSync(path + ".tmp", JSON.stringify(state), { mode: 0o600 });
  renameSync(path + ".tmp", path);
  const files = readdirSync(backupDir)
    .filter((f) => f.endsWith(".json"))
    .sort();
  for (const f of files.slice(0, -30)) unlinkSync(resolve(backupDir, f));
}
const validateRestore = validateState;
const localOnly=process.env.YASNA_LOCAL_ONLY==='1';
const push=createPush({db,dir,origin:process.env.PUBLIC_ORIGIN,enabled:!localOnly,resolveActor:sessionHash=>{const a=db.prepare('SELECT u.username,u.role,u.family FROM sessions s JOIN users u ON u.username=s.username WHERE s.token=? AND s.expires>?').get(sessionHash,Date.now());if(!a)return null;if(a.role==='parent'){const l=db.prepare('SELECT * FROM parent_links WHERE id=? AND revoked=0 AND expires>?').get(a.username.slice(11),Date.now());if(!l||!familyCanEnter(getState(),l.family,l.created_at))return null}return a},notifications:actor=>notificationsFor(getState(),actor)});
const pushTimer=setInterval(()=>push.tick().catch(error=>console.warn('push_delivery_failed',error.message)),60000);pushTimer.unref();
const server = http.createServer(async (req, res) => {
  if(localOnly&&!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host||''))return reply(res,403,{error:'Локальное приложение доступно только на этом компьютере'});
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) {
      const allowedOrigins=new Set([process.env.PUBLIC_ORIGIN||`http://${req.headers.host}`,...(!localOnly&&process.env.FRONTEND_ORIGIN?[process.env.FRONTEND_ORIGIN]:[])]),requestOrigin=req.headers.origin;
      if(requestOrigin&&allowedOrigins.has(requestOrigin)){res.setHeader('Access-Control-Allow-Origin',requestOrigin);res.setHeader('Vary','Origin')}
      if(req.method==='OPTIONS'){if(!requestOrigin||!allowedOrigins.has(requestOrigin))return reply(res,403,{error:'Недоверенный адрес сайта'});res.writeHead(204,{'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Max-Age':'600'});return res.end()}
      const actor = sessions(req);
      if (req.method === "POST") {
        const origin = req.headers.origin;
        const expected =
          process.env.PUBLIC_ORIGIN || `http://${req.headers.host}`;
        if (!allowedOrigins.has(origin) && url.pathname!=="/api/payments/webhook")
          return reply(res, 403, { error: "Запрос с недоверенного адреса" });
        if (
          !req.headers["content-type"]?.startsWith("application/json") &&
          !["/api/logout"].includes(url.pathname)
        )
          return reply(res, 415, { error: "Требуется JSON" });
      }
      if(url.pathname.startsWith('/api/push/')){const raw=requestToken(req)||'';const value=await push.handle({path:url.pathname,method:req.method,actor,sessionHash:hashToken(raw),body:req.method==='POST'?await body(req,16384):{}});return reply(res,200,value)}
      if(url.pathname.startsWith('/api/payments/')){
        if(localOnly){if(!actor)return reply(res,401,{error:'Войдите в кабинет'});if(url.pathname==='/api/payments/config'&&req.method==='GET')return reply(res,200,{configured:false,enabled:false,test:true,localOnly:true});if(!((url.pathname==='/api/payments/orders'&&req.method==='GET')||(url.pathname==='/api/payments/history'&&req.method==='POST')))return reply(res,503,{error:'В локальном режиме оплаты учитываются вручную. Онлайн-оплата отключена.'})}

        const headers=new Headers();for(const [k,v] of Object.entries(req.headers))if(typeof v==='string')headers.set(k,v);
        const request=new Request((process.env.PUBLIC_ORIGIN||`http://${req.headers.host}`)+url.pathname+url.search,{method:req.method,headers,...(req.method==='POST'?{body:JSON.stringify(await body(req,16384))}:{})});
        const response=await handlePayments(request,{DB:paymentDB,PARENT_LINK_SECRET:linkKey.toString('hex'),PUBLIC_APP_URL:process.env.PUBLIC_APP_URL||(process.env.PUBLIC_ORIGIN||`http://${req.headers.host}`)+'/'},actor,{readState:async()=>getState(),commit:async(previous,next)=>{db.exec('BEGIN IMMEDIATE');try{if(getState().revision!==previous.revision)throw Object.assign(Error('Данные обновились'),{status:409});backup(previous);db.prepare('UPDATE state SET json=? WHERE id=1').run(JSON.stringify(next));db.exec('COMMIT')}catch(e){if(db.isTransaction)db.exec('ROLLBACK');throw e}}});
        res.writeHead(response.status,Object.fromEntries(response.headers));return res.end(Buffer.from(await response.arrayBuffer()));
      }
      if (url.pathname === "/api/session" && req.method === "GET")
        return reply(res, 200, actor || { role: null, authMode: "password" });
      if (url.pathname === "/api/health" && req.method === "GET") {
        db.prepare("SELECT id FROM state LIMIT 1").get();
        return reply(res, 200, {
          ok: true,
          mode: "production",
          auth: "master-password,parent-links",
        });
      }
      if (url.pathname === "/api/login" && req.method === "POST") {
        if (limited(req))
          return reply(res, 429, {
            error: "Слишком много попыток. Повторите через 15 минут.",
          });
        const a = await body(req, 4096);
        const u = db
          .prepare("SELECT * FROM users WHERE username=?")
          .get(String(a.username || ""));
        const candidate = scryptSync(
          String(a.password || ""),
          u?.salt || "dummy-salt",
          64,
        );
        if (
          !u ||
          u.role !== "master" ||
          !timingSafeEqual(candidate, Buffer.from(u.hash, "hex"))
        )
          return reply(res, 401, { error: "Неверный логин или пароль" });
        const token = randomBytes(32).toString("hex");
        db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
          hashToken(token),
          u.username,
          Date.now() + 604800000,
        );
        return reply(
          res,
          200,
          {
            username: u.username,
            role: u.role,
            family: u.family,
            authMode: "password",
            authToken: token,
          },
          { "Set-Cookie": cookie(token) },
        );
      }
      if(url.pathname==='/api/public/lessons'&&req.method==='GET')return reply(res,200,publicEnrollment(getState()));
      if(url.pathname==='/api/public/enroll'&&req.method==='POST'){
        if(limited(req,'intake'))return reply(res,429,{error:'Слишком много заявок. Повторите позже.'});const input=await body(req,16384);db.exec('BEGIN IMMEDIATE');let result;try{const previous=getState(),next=structuredClone(previous);result=enrollApplication(next,input,new Date(),actor);if(next.revision!==previous.revision){backup(previous);db.prepare('UPDATE state SET json=? WHERE id=1').run(JSON.stringify(next))}db.exec('COMMIT')}catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error}
        const link=newLink(result.family,'Первичная запись',365,result.id);return reply(res,201,{...result,parentLink:linkView(link,req)});
      }
      if (
        url.pathname === "/api/public/applications" &&
        req.method === "POST"
      ) {
        if (limited(req, "intake"))
          return reply(res, 429, {
            error: "Слишком много заявок. Повторите позже.",
          });
        const input = await body(req, 16384);
        db.exec("BEGIN IMMEDIATE");
        try {
          const previous = getState(),
            next = structuredClone(previous),
            result = submitApplication(next, input);
          backup(previous);
          db.prepare("UPDATE state SET json=? WHERE id=1").run(
            JSON.stringify(next),
          );
          db.exec("COMMIT");
          return reply(res, 201, result);
        } catch (e) {
          if (db.isTransaction) db.exec("ROLLBACK");
          throw e;
        }
      }
      if (url.pathname === "/api/parent-entry" && req.method === "POST") {
        if (limited(req, "parent-link"))
          return reply(res, 429, {
            error: "Слишком много попыток. Повторите позже.",
          });
        const input = await body(req, 2048),
          raw = typeof input.token === "string" ? input.token : "";
        const link = /^[a-zA-Z0-9_-]{43}$/.test(raw)
          ? db
              .prepare(
                "SELECT * FROM parent_links WHERE token_hash=? AND revoked=0 AND expires>?",
              )
              .get(hashToken(raw), Date.now())
          : null;
        if (!link || !familyCanEnter(getState(),link.family,link.created_at))
          return reply(res, 401, {
            error:
              "Ссылка недействительна, отозвана или срок её действия истёк. Попросите мастера выдать новую ссылку.",
          });
        const token = randomBytes(32).toString("hex"),
          expires = Math.min(Date.now() + 604800000, link.expires),
          username = "parentlink:" + link.id;
        db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
          hashToken(token),
          username,
          expires,
        );
        db.prepare("UPDATE parent_links SET last_used=? WHERE id=?").run(
          Date.now(),
          link.id,
        );
        return reply(
          res,
          200,
          { role: "parent", family: link.family, username, authMode: "link",authToken:token },
          {
            "Set-Cookie": cookie(
              token,
              Math.max(1, Math.floor((expires - Date.now()) / 1000)),
            ),
          },
        );
      }
      if (!actor) return reply(res, 401, { error: "Войдите в кабинет" });
      if (url.pathname === "/api/logout" && req.method === "POST") {
        const t=requestToken(req);
        if (t)
          db.prepare("DELETE FROM sessions WHERE token=?").run(hashToken(t));
        return reply(res, 200, { ok: true }, { "Set-Cookie": cookie("", 0) });
      }
      if (url.pathname === "/api/parent-account")
        return reply(res, 410, {
          error:
            "Родительский кабинет открывается персональной ссылкой. Используйте раздел доступа к семье.",
        });
      if (url.pathname === "/api/parent-links" && req.method === "GET") {
        if (actor.role !== "master")
          return reply(res, 403, { error: "Только для мастера" });
        const family = url.searchParams.get("family");
        if (!getState().children.some(c=>c.family===family))
          return reply(res, 404, { error: "Семья не найдена" });
        const links = db
          .prepare(
            "SELECT * FROM parent_links WHERE family=? ORDER BY created_at DESC,id DESC",
          )
          .all(family);
        return reply(res, 200, {
          links: links.map((link) => linkView(link, req)),
        });
      }
      if (url.pathname === "/api/parent-links" && req.method === "POST") {
        if (actor.role !== "master")
          return reply(res, 403, { error: "Только для мастера" });
        const input = await body(req, 4096);
        db.exec("BEGIN IMMEDIATE");
        try {
          const link = newLink(
            input.family,
            input.label,
            Number(input.expiresDays ?? 365),
          );
          db.exec("COMMIT");
          return reply(res, 201, { link: linkView(link, req) });
        } catch (e) {
          if (db.isTransaction) db.exec("ROLLBACK");
          throw e;
        }
      }
      const management = url.pathname.match(
        /^\/api\/parent-links\/([a-f0-9-]{36})\/(revoke|rotate)$/,
      );
      if (management && req.method === "POST") {
        if (actor.role !== "master")
          return reply(res, 403, { error: "Только для мастера" });
        const link = db
          .prepare("SELECT * FROM parent_links WHERE id=?")
          .get(management[1]);
        if (management[2] === "rotate" && link?.revoked)
          return reply(res, 400, {
            error: "Эта ссылка уже отозвана. Создайте новую ссылку.",
          });
        if (!link) return reply(res, 404, { error: "Ссылка не найдена" });
        db.exec("BEGIN IMMEDIATE");
        try {
          revokeLink(link.id);
          const fresh =
            management[2] === "rotate"
              ? newLink(
                  link.family,
                  link.label,
                  Math.max(
                    1,
                    Math.min(
                      3650,
                      Math.round((link.expires - link.created_at) / 86400000),
                    ),
                  ),
                )
              : null;
          db.exec("COMMIT");
          return reply(
            res,
            200,
            fresh ? { link: linkView(fresh, req) } : { ok: true },
          );
        } catch (e) {
          if (db.isTransaction) db.exec("ROLLBACK");
          throw e;
        }
      }
      if(url.pathname.startsWith('/api/receipts/')&&req.method==='GET'){const state=getState(),payment=state.payments.find(p=>p.id===decodeURIComponent(url.pathname.slice('/api/receipts/'.length))),child=payment?state.children.find(c=>c.id===payment.child):null;if(!payment?.receipt?.data||!child||actor.role!=='master'&&actor.family!==child.family)return reply(res,404,{error:'Чек не найден'});const match=payment.receipt.data.match(/^data:(application\/pdf|image\/(?:png|jpeg));base64,(.+)$/s);if(!match)return reply(res,404,{error:'Файл чека недоступен'});res.writeHead(200,{'Content-Type':match[1],'Content-Disposition':"attachment; filename=receipt; filename*=UTF-8''"+encodeURIComponent(payment.receipt.name),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});return res.end(Buffer.from(match[2],'base64'))}
      if (url.pathname === "/api/notifications" && req.method === "GET") {
        const row = db
            .prepare("SELECT json FROM notification_reads WHERE username=?")
            .get(actor.username),
          read = new Set(row ? JSON.parse(row.json) : []);
        return reply(res, 200, {
          items: notificationsFor(getState(), actor).map((n) => ({
            ...n,
            read: read.has(n.id),
          })),
        });
      }
      if (url.pathname === "/api/notifications/read" && req.method === "POST") {
        const input = await body(req, 65536),
          visible = notificationsFor(getState(), actor),
          allowed = new Set(visible.map((n) => n.id));
        if (
          !Array.isArray(input.ids) ||
          input.ids.length > 1000 ||
          input.ids.some((id) => !allowed.has(id))
        )
          throw Error("Неверный список уведомлений");
        const old = db
            .prepare("SELECT json FROM notification_reads WHERE username=?")
            .get(actor.username),
          ids = [
            ...new Set([...(old ? JSON.parse(old.json) : []), ...input.ids]),
          ].slice(-2000);
        db.prepare(
          "INSERT INTO notification_reads VALUES(?,?) ON CONFLICT(username) DO UPDATE SET json=excluded.json",
        ).run(actor.username, JSON.stringify(ids));
        return reply(res, 200, {
          items: visible.map((n) => ({ ...n, read: ids.includes(n.id) })),
        });
      }
      if (url.pathname === "/api/backup" && req.method === "GET") {
        if (actor.role !== "master")
          return reply(res, 403, { error: "Только для мастера" });
        return reply(res, 200, getState());
      }
      if (url.pathname === "/api/state" && req.method === "GET") {
        const s = getState();
        return reply(
          res,
          200,
          actor.role === "master" ? s : familyView(s, actor.family),
        );
      }
      if (
        ["/api/action", "/api/restore"].includes(url.pathname) &&
        req.method === "POST"
      ) {
        const a = await body(
          req,
          url.pathname === "/api/restore" ? 28 * 1024 * 1024 : 4 * 1024 * 1024,
        );
        db.exec("BEGIN IMMEDIATE");
        try {
          const previous = getState();
          if (a.revision !== previous.revision) {
            db.exec("ROLLBACK");
            return reply(res, 409, {
              error: "Данные изменились в другом окне. Повторите действие.",
            });
          }
          let next;
          if (url.pathname === "/api/restore") {
            if (actor.role !== "master") throw Error("Только для мастера");
            validateRestore(a.state);
            next = a.state;
            next.revision = previous.revision + 1;
          } else {if(['payment','family-payment'].includes(a.action.type)){const ids=new Set(a.action.children||[a.action.child]);if(db.prepare("SELECT json FROM yasna_payment_orders WHERE status NOT IN ('succeeded','canceled')").all().some(r=>JSON.parse(r.json).items?.some(i=>ids.has(i.child))))throw Error('Сначала завершите онлайн-оплату этой семьи.')}if(a.action.type==='child-archive'&&db.prepare("SELECT json FROM yasna_payment_orders WHERE status NOT IN ('succeeded','canceled')").all().some(r=>((o)=>o.child===a.action.child||o.items?.some(i=>i.child===a.action.child))(JSON.parse(r.json))))throw Error('Сначала завершите или отмените незавершённую оплату ребёнка.');next = applyAction(structuredClone(previous), a.action, actor);}
          backup(previous);
          db.prepare("UPDATE state SET json=? WHERE id=1").run(
            JSON.stringify(next),
          );
          db.exec("COMMIT");
          return reply(
            res,
            200,
            actor.role === "master" ? next : familyView(next, actor.family),
          );
        } catch (e) {
          if (db.isTransaction) db.exec("ROLLBACK");
          throw e;
        }
      }
      return reply(res, 404, { error: "Не найдено" });
    }
    if (!["GET", "HEAD"].includes(req.method))
      return reply(res, 405, { error: "Метод не поддерживается" });
    const staticFiles = {
      "/": "index.html",
      "/index.html": "index.html",
      "/app.js": "app.js",
      "/billing.js":"billing.js",
      "/purchase.js":"purchase.js",
      "/catalog.js":"catalog.js",
      "/enrollment.js":"enrollment.js",
      "/theme.js":"theme.js",
      "/push-client.js":"push-client.js",
      "/sw.js":"sw.js",
      "/manifest.webmanifest":"manifest.webmanifest",
      "/theme.css":"theme.css",
      "/payment-widget.js":"payment-widget.js",
      "/yookassa-sdk.js":"yookassa-sdk.js",
      "/yookassa-sdk-source.txt":"yookassa-sdk-source.txt",
      "/security-policy.js":"security-policy.js",
      "/xlsx-reader.js":"xlsx-reader.js",
      "/xlsx-reader-LICENSE.txt":"xlsx-reader-LICENSE.txt",
      "/management.js":"management.js",
      "/operations.css":"operations.css",
      "/import-data.js":"import-data.js",
      "/mobile-ui.js":"mobile-ui.js",
      "/mobile.css":"mobile.css",
      "/yasna-logo-light.webp":"yasna-logo-light.webp",
      "/yasna-logo-light.png":"yasna-logo-light.png",
      "/api-client.js":"api-client.js",
      "/config.js":"config.js",
      "/domain.js": "domain.js",
      "/transport.js": "transport.js",
      "/style.css": "style.css",
      "/brand.css": "brand.css",
      "/light.css": "light.css",
      "/yasna-logo.png": "yasna-logo.png",
      "/favicon.svg": "favicon.svg",
    };
    const file = staticFiles[url.pathname];
    if (!file) return reply(res, 404, { error: "Не найдено" });
    const types = {
      ".webmanifest":"application/manifest+json",
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".png": "image/png",
      ".webp":"image/webp",
      ".txt":"text/plain; charset=utf-8",
      ".svg": "image/svg+xml",
    };
    res.writeHead(200, {
      "Content-Type": types[extname(file)],
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": securityPolicy({preventEmbedding:true,localOnly}),
    });
    res.end(
      req.method === "HEAD"
        ? undefined
        : readFileSync(resolve(root, "dist", file)),
    );
  } catch (e) {
    console.error(e.message);
    reply(res, e.status||400, { error: e.message || "Не удалось выполнить действие" });
  }
});
server.requestTimeout = 30000;
server.headersTimeout = 15000;
const port = Number(process.env.PORT || 3000);
server.listen(port, process.env.HOST || "127.0.0.1", () =>
  console.log(
    `Ясна: http://${process.env.HOST || "127.0.0.1"}:${server.address().port}`,
  ),
);
