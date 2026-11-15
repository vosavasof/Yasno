import { DatabaseSync } from "node:sqlite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, existsSync, copyFileSync, chmodSync } from "node:fs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  data = resolve(process.env.DATA_DIR || resolve(root, "data")),
  source = resolve(data, "yasna.sqlite");
if (!existsSync(source))
  throw Error("База данных ещё не создана. Сначала запустите приложение.");
const target = resolve(
  data,
  "backups",
  "full-" + new Date().toISOString().replace(/[:.]/g, "-"),
);
mkdirSync(target, { recursive: true, mode: 0o700 });
const db = new DatabaseSync(source);
db.exec("PRAGMA busy_timeout=5000");
db.prepare("VACUUM INTO ?").run(resolve(target, "yasna.sqlite"));
db.close();
chmodSync(resolve(target, "yasna.sqlite"), 0o600);
for(const name of ['parent-links.key','push-vapid.json']){const key=resolve(data,name);if(existsSync(key)){copyFileSync(key,resolve(target,name));chmodSync(resolve(target,name),0o600)}}
console.log("Полная резервная копия базы и ключей: " + target);
