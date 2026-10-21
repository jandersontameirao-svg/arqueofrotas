import { spawnSync } from "node:child_process";
const raw = process.env.FLEET_TEST_DATABASE_URL;
if (!raw)
  throw new Error(
    "FLEET_TEST_DATABASE_URL is required; integration tests must not silently skip"
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
const result = spawnSync("node_modules/.bin/vitest", ["run"], {
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
