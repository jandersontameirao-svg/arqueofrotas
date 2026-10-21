import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
const raw = process.env.FLEET_TEST_DATABASE_URL;
if (!raw)
  throw new Error(
    "FLEET_TEST_DATABASE_URL is required for isolated mobile tests"
  );
const url = new URL(raw);
if (
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  url.pathname !== "/arqueofrotas_test" ||
  url.searchParams.get("socketPath") !== "/workspace/test-db.sock"
)
  throw new Error(
    "Only arqueofrotas_test via /workspace/test-db.sock is allowed"
  );
fs.mkdirSync("validation", { recursive: true });
const env = {
  ...process.env,
  DATABASE_URL: raw,
  JWT_SECRET: randomBytes(32).toString("hex"),
  VITE_APP_ID: "isolated-test",
  OWNER_OPEN_ID: "",
  VITE_OAUTH_PORTAL_URL: "http://localhost:3001",
  OAUTH_SERVER_URL: "http://localhost:3001",
  VITE_ANALYTICS_ENDPOINT: "",
  VITE_ANALYTICS_WEBSITE_ID: "",
  BUILT_IN_FORGE_API_URL: "",
  BUILT_IN_FORGE_API_KEY: "",
  NODE_ENV: "production",
  PORT: "3001",
};
function run(command, args) {
  const result = spawnSync(command, args, { env, stdio: "inherit" });
  if (result.status !== 0)
    throw new Error(`${command} exited with ${result.status}`);
}
run("node_modules/.bin/vite", ["build"]);
run("node_modules/.bin/esbuild", [
  "server/_core/index.ts",
  "--platform=node",
  "--packages=external",
  "--bundle",
  "--format=esm",
  "--outdir=dist",
]);
run("node_modules/.bin/tsx", ["scripts/browser-fixture.ts"]);
const log = fs.createWriteStream("validation/mobile-test-server.log");
const server = spawn(process.execPath, ["dist/index.js"], {
  env,
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.pipe(log);
server.stderr.pipe(log);
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Local server startup timed out")),
      15000
    );
    server.once("exit", code => {
      clearTimeout(timeout);
      reject(new Error(`Local server exited with ${code}`));
    });
    server.stdout.on("data", chunk => {
      const text = chunk.toString();
      if (text.includes("Server running on http://localhost:3001/")) {
        clearTimeout(timeout);
        resolve();
      } else if (text.includes("Server running on")) {
        clearTimeout(timeout);
        reject(
          new Error(
            "Port 3001 is already in use. Stop only the local test server and retry."
          )
        );
      }
    });
  });
  run("node_modules/.bin/playwright", ["test"]);
} finally {
  server.kill("SIGTERM");
  log.end();
  fs.rmSync("/workspace/browser-fixture.json", { force: true });
}
