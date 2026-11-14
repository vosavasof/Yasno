import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { seed } from "./fixtures.js";
export function fixtureDatabase(dir) {
  const db = new DatabaseSync(join(dir, "yasna.sqlite"));
  db.exec(
    "CREATE TABLE state(id INTEGER PRIMARY KEY CHECK(id=1),json TEXT NOT NULL)",
  );
  db.prepare("INSERT INTO state VALUES(1,?)").run(JSON.stringify(seed()));
  db.close();
}
