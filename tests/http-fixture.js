import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { fixtureDatabase } from "./server-fixture.js";
const nativeFetch = globalThis.fetch;
export async function startServer({
  fixture = false,
  dir: provided,
  secure = false,
} = {}) {
  const dir = provided || mkdtempSync(join(tmpdir(), "yasna-http-"));
  if (fixture) fixtureDatabase(dir);
  const password = randomBytes(20).toString("hex");
  const env = {
    ...process.env,
    DATA_DIR: dir,
    PORT: "0",
    MASTER_PASSWORD: password,
    COOKIE_SECURE: String(secure),
    TRUST_PROXY: "false",
  };
  delete env.PUBLIC_ORIGIN;
  const proc = spawn(process.execPath, ["server.mjs"], {
    cwd: resolve("."),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let origin;
  await new Promise((resolve, reject) => {
    let text = "";
    proc.stdout.on("data", (d) => {
      text += d;
      const m = text.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (m) {
        origin = m[0];
        resolve();
      }
    });
    proc.on("exit", (code) => reject(Error("Server exited: " + code)));
    setTimeout(() => reject(Error("Startup timed out")), 5000).unref();
  });
  const api = (
    path,
    { cookie, body, method = body ? "POST" : "GET", headers = {} } = {},
  ) =>
    nativeFetch(origin + path, {
      method,
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(method === "POST"
          ? { "Content-Type": "application/json", Origin: origin }
          : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  const login = async () => {
    const r = await api("/api/login", {
      body: { username: "master", password },
    });
    if (r.status !== 200) throw Error("Login failed");
    return r.headers.get("set-cookie").split(";")[0];
  };
  const stop = async ({ remove = true } = {}) => {
    if (!proc.killed)
      await new Promise((r) => {
        proc.once("exit", r);
        proc.kill();
      });
    if (remove && !provided) rmSync(dir, { recursive: true, force: true });
  };
  return { dir, password, origin, api, login, stop, env };
}
export const cookieFrom = (r) => r.headers.get("set-cookie")?.split(";")[0];
